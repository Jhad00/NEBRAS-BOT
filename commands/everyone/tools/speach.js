import fs from "fs";
import { join, resolve } from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// parse apis config synchronously on boot
const apisFile = resolve("apis.json");
const apis = JSON.parse(fs.readFileSync(apisFile, "utf-8"));
const GROQ_API_KEY = apis.groq.api_key;

export default {
  cmd: "نص",
  description: "تحويل الصوت أو الفيديو إلى نص مكتوب",
  aliases: ["stt", "transcribe"],
  category: "ادوات",

  do: async (wa, msg, args) => {
    const chatId = msg.key.remoteJid;

    // extract media via native helper
    const media = await wa.getMediaBufferFromReply(msg);

    // detect media types
    const mime = (media?.mimetype || "").toLowerCase();
    const isVideo = media?.type === "video" || mime.startsWith("video/");
    const isAudio = media?.type === "audio" || media?.type === "ptt" || mime.startsWith("audio/");
    const isDoc = media?.type === "document";

    // show usage guide if no valid media is attached or replied to
    if (!media || !media.buffer || (!isVideo && !isAudio && !isDoc)) {
      await wa.react("ℹ️");
      const prefix = msg.prefix || ".";
      return await wa.sendMessage(
        chatId,
        { text: `📋 *تحويل الصوت/الفيديو إلى نص*\n\nقم بالرد على رسالة صوتية، مقطع فيديو، أو ملف بالأمر:\n\`${prefix}نص\`` },
        { quoted: msg }
      );
    }

    // start processing indicator
    await wa.react("🎙️");

    // prep temp paths in the root temp directory
    const tempDir = join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const id = Date.now() + "_" + Math.floor(Math.random() * 99999);
    const inputExt = isVideo ? ".mp4" : ".ogg";
    const tempInput = join(tempDir, `stt_in_${id}${inputExt}`);
    const tempWav = join(tempDir, `stt_out_${id}.wav`);

    try {
      // write raw buffer to disk (handles both audio and video files)
      fs.writeFileSync(tempInput, media.buffer);

      // ffmpeg conversion: 
      // -vn strips video track (if exists)
      // -ar 16000 -ac 1 formats audio for whisper api requirements
      await execAsync(`ffmpeg -y -i "${tempInput}" -vn -ar 16000 -ac 1 "${tempWav}"`);

      // check if extraction resulted in a valid file
      if (!fs.existsSync(tempWav) || fs.statSync(tempWav).size === 0) {
        throw new Error("لم يتم العثور على مسار صوتي صالح في الملف.");
      }

      // load converted audio into memory
      const wavBuffer = fs.readFileSync(tempWav);
      
      // package into native Blob/FormData
      const blob = new Blob([wavBuffer], { type: "audio/wav" });
      const formData = new FormData();
      formData.append("file", blob, "audio.wav");
      formData.append("model", "whisper-large-v3");
      formData.append("language", "ar");
      formData.append("response_format", "text");

      // push request
      const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`
        },
        body: formData,
      });

      // handle remote errors gracefully
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error?.error?.message || "api request failed");
      }

      const transcribedText = (await response.text()).trim();

      if (!transcribedText) {
        throw new Error("لم يتم رصد أي كلام واضح في المقطع.");
      }

      // dispatch final transcription
      await wa.sendMessage(
        chatId,
        { text: `📝 *النص المكتوب:*\n\n${transcribedText}` },
        { quoted: msg }
      );
      
      // confirm success
      await wa.react("✅");

    } catch (err) {
      console.error("STT CMD ERROR:", err);
      await wa.react("❌");
      await wa.sendMessage(
        chatId,
        { text: `❌ حدث خطأ:\n${err.message}` },
        { quoted: msg }
      );
    } finally {
      // aggressive temp cleanup
      [tempInput, tempWav].forEach(f => {
        try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) {}
      });
    }
  }
};
