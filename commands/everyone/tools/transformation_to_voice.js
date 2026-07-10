import { exec } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { downloadMediaMessage } from "baileys";

// exec wrapper
const runCommand = (cmd) => {
  return new Promise((resolve, reject) => {
    exec(
      cmd,
      { maxBuffer: 1024 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) return reject(stderr || err);
        resolve(stdout || stderr);
      }
    );
  });
};

// ensure temp dir exists
const getProjectTempDir = () => {
  const tempDir = path.join(process.cwd(), "temp");
  try {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  } catch (e) {
    return os.tmpdir();
  }
  return tempDir;
};

// parse execution flags
function getConvertMode(msg) {
  const text =
    msg?.text ||
    msg?.body ||
    msg?.message?.conversation ||
    msg?.message?.extendedTextMessage?.text ||
    "";
  const t = text.toLowerCase();
  
  if (/\s-h(\s|$)/.test(t)) return "help";
  if (/\s-r(\s|$)/.test(t)) return "record";
  if (/\s-v(\s|$)/.test(t)) return "voice";
  if (/\s-vf(\s|$)/.test(t)) return "file"; 
  
  return "normal";
}

export default {
  cmd: "تحويل",
  description: "حوّل بسهولة بين صيغ الفيديو والصوت",
  aliases: ["convert", "convertmedia"],
  category: "ادوات",

  do: async (wa, msg) => {
    const mode = getConvertMode(msg);

    // render help menu
    if (mode === "help" || mode === "normal") {
      const helpText = `
📖 *دليل استخدام أمر التحويل (convert)*

يقوم الأمر بتحويل الفيديو أو الصوت إلى صيغ مختلفة.

*الخيارات:*
- -r : تحويل إلى تسجيل صوتي (PTT / الميكروفون الأخضر) 🎤
- -v : تحويل إلى صوت عادي (أيقونة سماعات) 🎧
- -vf : تحويل إلى ملف صوتي (مستند) 📁
- -h أو --help : عرض هذه المساعدة.

*طريقة الاستخدام:*
قم بالرد على فيديو أو ملف صوتي ثم استخدم الأمر.

*أمثلة:*
تحويل -r
تحويل -v
تحويل -vf
      `.trim();
      return wa.sendMessage(msg.key.remoteJid, { text: helpText }, { quoted: msg });
    }

    let inputPath = null;
    let outputPath = null;
    const tempFiles = [];

    try {
      wa.react("🎬");

      // extract standard media buffer
      let media = await wa.getMediaBufferFromReply(msg);

      // fallback: manual extraction if media is sent as a document (helper missed it)
      if (!media) {
        const quotedInfo = msg.message?.extendedTextMessage?.contextInfo;
        const docMsg = quotedInfo?.quotedMessage?.documentMessage;

        if (docMsg && docMsg.mimetype) {
          const mime = docMsg.mimetype.toLowerCase();
          // check if document is actually an audio/video file
          if (mime.startsWith("audio/") || mime.startsWith("video/")) {
            const mediaKey = {
              key: {
                remoteJid: msg.key.remoteJid,
                id: quotedInfo.stanzaId,
                participant: quotedInfo.participant,
              },
              message: quotedInfo.quotedMessage,
            };
            const buffer = await downloadMediaMessage(mediaKey, "buffer", {});
            media = {
              type: "document",
              mimetype: docMsg.mimetype,
              buffer: buffer
            };
          }
        }
      }

      // validate buffer
      if (!media || !media.buffer) {
        wa.react("⚠️");
        return wa.sendMessage(msg.key.remoteJid, {
          text: "⚠️ يجب الرد على فيديو أو ملف صوتي صالح.",
        }, { quoted: msg });
      }

      // robust check: fallback to filename extension if whatsapp fails to assign correct mimetype for documents
      const fileName = (media.filename || "").toLowerCase();
      const mime = (media.mimetype || "").toLowerCase();

      const isVideo = media.type === "video" || mime.startsWith("video/") || /\.(mp4|mkv|mov|avi|webm)$/.test(fileName);
      const isAudio = media.type === "audio" || media.type === "ptt" || mime.startsWith("audio/") || /\.(mp3|ogg|m4a|wav|aac|flac)$/.test(fileName);

      if (!isVideo && !isAudio) {
        wa.react("⚠️");
        return wa.sendMessage(msg.key.remoteJid, { text: "⚠️ نوع الوسائط غير مدعوم." }, { quoted: msg });
      }

      // setup dynamic I/O paths
      const tempDir = getProjectTempDir();
      const id = Date.now() + "_" + Math.floor(Math.random() * 999999);

      // determine output extension based on mode
      const outExt = (mode === "record") ? "ogg" : "mp3";

      inputPath = path.join(tempDir, `convert_in_${id}.${isVideo ? "mp4" : "ogg"}`);
      outputPath = path.join(tempDir, `convert_out_${id}.${outExt}`);
      tempFiles.push(inputPath, outputPath);

      fs.writeFileSync(inputPath, media.buffer);

      let ffmpegCmd = "";

      // build ffmpeg args (apply audio extraction for both video and audio input)
      if (mode === "record") {
        // strip metadata to force WA to accept as PTT
        ffmpegCmd = `ffmpeg -y -i "${inputPath}" -vn -map_metadata -1 -c:a libopus -b:a 32k -ac 1 -ar 48000 -vbr on -compression_level 10 -application voip -frame_duration 60 -f ogg "${outputPath}"`;
      } else {
        // standard audio conversion
        ffmpegCmd = `ffmpeg -y -i "${inputPath}" -vn -map_metadata -1 -c:a libmp3lame -b:a 128k -ar 44100 "${outputPath}"`;
      }

      await runCommand(ffmpegCmd);

      // validate output integrity
      if (!fs.existsSync(outputPath)) {
        throw new Error("Conversion failed, output missing.");
      }

      const stats = fs.statSync(outputPath);
      if (stats.size < 1024) {
        wa.react("⚠️");
        return wa.sendMessage(msg.key.remoteJid, { text: "⚠️ الوسائط الأصلية لا تحتوي على مقطع صوتي صالح." }, { quoted: msg });
      }

      // dispatch payload based on mode
      if (mode === "record") {
        await wa.sendMessage(
          msg.key.remoteJid,
          {
            audio: { url: outputPath },
            mimetype: "audio/ogg; codecs=opus",
            ptt: true,
          },
          { quoted: msg }
        );
      } else if (mode === "file") {
        await wa.sendMessage(
          msg.key.remoteJid,
          {
            document: { url: outputPath },
            mimetype: "audio/mpeg",
            fileName: `Converted_Audio_${id}.mp3`,
          },
          { quoted: msg }
        );
      } else {
        // default to normal audio (voice/normal)
        await wa.sendMessage(
          msg.key.remoteJid,
          {
            audio: { url: outputPath },
            mimetype: "audio/mpeg",
            ptt: false,
          },
          { quoted: msg }
        );
      }

      wa.react("✅");
    } catch (err) {
      wa.react("⚠️");
      try {
        await wa.sendMessage(msg.key.remoteJid, { text: "حدث خطأ غير متوقع:\n" + String(err) }, { quoted: msg });
      } catch (e) {}
    } finally {
      // flush temp files safely
      for (const file of tempFiles) {
        if (!file) continue;
        try {
          if (fs.existsSync(file)) fs.unlinkSync(file);
        } catch (e) {}
      }
    }
  },
};