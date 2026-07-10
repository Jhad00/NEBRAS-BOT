import { formatText } from "textos";
import { hex } from "#hexJS/index.js";
import { exec } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

// exec wrapper
const runCommand = (cmd) => {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(stderr || err);
      resolve(stdout || stderr);
    });
  });
};

// Use a temp folder inside the project instead of system tmp
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

// Get audio duration in seconds using ffprobe
const getAudioDurationSeconds = async (filePath) => {
  try {
    const cmd =
      `ffprobe -v error -show_entries format=duration ` +
      `-of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
    const out = await runCommand(cmd);
    const sec = parseFloat(String(out).trim());
    if (!isNaN(sec) && isFinite(sec) && sec > 0) {
      return sec;
    }
  } catch (e) {}
  return 60;
};

// Build nice progress bar text
const buildProgressText = (percent, label) => {
  const totalBlocks = 20;
  const filledBlocks = Math.round((percent / 100) * totalBlocks);
  const emptyBlocks = totalBlocks - filledBlocks;
  const bar = "█".repeat(filledBlocks) + "░".repeat(emptyBlocks);
  const header = formatText({ text: label, font: "bold" });
  return `${header}\n[${bar}] ${percent}%\n${hex.bot_version}`;
};

const buildCaption = async (type) => {
  return (
    formatText({
      text: `Converted (${type}) to video by bot NEBRAS.`,
      font: "bold",
    }) +
    "\n" +
    hex.bot_version
  );
};

export default {
  cmd: "فيد",
  description: "حوّل الصوت أو الملصق المتحرك إلى فيديو.",
  aliases: ["vid", "video"],
  category: "ادوات",

  do: async (wa, msg) => {
    wa.react("👁️");

    let tempFiles = [];
    let progressMsg = null;
    let progressTimer = null;
    let progressStart = 0;
    let estimatedSeconds = 0;
    let updatingProgress = false;

    // Helper to start progress bar
    const startProgress = async (jid, quoted, label, estSeconds) => {
      estimatedSeconds = Math.max(10, estSeconds);
      progressStart = Date.now();
      try {
        const text = buildProgressText(0, label);
        progressMsg = await wa.sendMessage(jid, { text }, { quoted });
      } catch (e) {
        progressMsg = null;
        return;
      }

      progressTimer = setInterval(async () => {
        if (!progressMsg || updatingProgress) return;
        const elapsed = (Date.now() - progressStart) / 1000;
        let percent = Math.floor((elapsed / estimatedSeconds) * 100);
        if (percent >= 99) percent = 99;
        if (percent < 0) percent = 0;

        updatingProgress = true;
        try {
          const text = buildProgressText(percent, label);
          await wa.sendMessage(jid, { text, edit: progressMsg.key }, {});
        } catch (e) {
        } finally {
          updatingProgress = false;
        }
      }, 2000);
    };

    const finishProgress = async (jid) => {
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }

      if (!progressMsg) return;

      try {
        await wa.sendMessage(jid, {
          delete: progressMsg.key,
        });
      } catch (e) {}

      progressMsg = null;
    };

    try {
      const media = await wa.getMediaBufferFromReply(msg);
      if (!media) {
        await wa.react("ℹ️");
        const prefix = msg.prefix || ".";
        return await wa.sendMessage(
          msg.key.remoteJid,
          { text: `🎬 *تحويل الصوت إلى فيديو*\n\nقم بالرد على صوت أو ملصق متحرك:\n\`${prefix}فيد\`` },
          { quoted: msg }
        );
      }

      const mimetype = media.mimetype || "";
      const isAudio = media.type === "audio";
      const isAnimatedSticker = mimetype.includes("image/webp");

      if (!isAudio && !isAnimatedSticker) {
        wa.react("⚠️");
        return;
      }

      const jid = msg.key.remoteJid;
      const tempDir = getProjectTempDir();
      const unique = Date.now() + "_" + Math.floor(Math.random() * 99999);
      const rawInput = path.join(tempDir, `nebras_in_${unique}`);
      const outputPath = path.join(tempDir, `nebras_out_${unique}.mp4`);

      // ---------------------------------------------
      // CASE 1: AUDIO -> VIDEO (Advanced Filter)
      // ---------------------------------------------
      if (isAudio) {
        const audioPath = rawInput + ".ogg";
        tempFiles.push(audioPath, outputPath);
        fs.writeFileSync(audioPath, media.buffer);

        // Get image directly from project
        const imagePath = path.join(process.cwd(), "src", "zaraf.jpg");
        
        if (!fs.existsSync(imagePath)) {
            throw new Error( `لم يتم العثور على الصورة:\n${imagePath}`);
        }

        const durationSec = await getAudioDurationSeconds(audioPath);
        const estimatedConvertTime = Math.min(Math.max(durationSec * 0.5, 10), 300);

        await startProgress(jid, msg, "جاري تحويل الصوت إلى فيديو احترافي...", estimatedConvertTime);

        // خوارزمية FFmpeg المطلوبة
        const ffmpegCmd = `ffmpeg -y -i "${audioPath}" -loop 1 -framerate 24 -i "${imagePath}" \
-filter_complex \
"[1:v]split=2[bg_src][avatar_src]; \
[bg_src]scale=640:640:force_original_aspect_ratio=increase,crop=640:640,boxblur=30:10,eq=brightness=-0.4[bg]; \
[0:a]showwaves=s=640x250:mode=cline:rate=24:colors=0x00BFFF|0xFF1493[waves]; \
[avatar_src]scale=280:280:force_original_aspect_ratio=increase,crop=280:280,format=rgba, \
geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte((X-W/2)*(X-W/2)+(Y-H/2)*(Y-H/2),(W/2)*(W/2)),255,0)'[avatar]; \
[bg][waves]overlay=0:(H-h)/2[bg_waves]; \
[bg_waves][avatar]overlay=(W-w)/2:(H-h)/2:format=auto[v]" \
-map "[v]" -map 0:a \
-c:v libx264 -preset medium -crf 28 \
-c:a aac -b:a 128k \
-shortest -pix_fmt yuv420p "${outputPath}"`;

        await runCommand(ffmpegCmd);

        if (!fs.existsSync(outputPath)) throw new Error("فشل إنشاء ملف الفيديو.");

        const result = fs.readFileSync(outputPath);
        const caption = await buildCaption("audio");
        await wa.sendMessage(jid, { video: result, caption }, { quoted: msg });
        await finishProgress(jid);
        wa.react("✅");
        return;
      }

      // CASE 2: WEBP STICKER -> VIDEO
      if (isAnimatedSticker) {
        const webpPath = rawInput + ".webp";
        const frameDir = rawInput + "_frames";
        tempFiles.push(webpPath, outputPath);
        fs.writeFileSync(webpPath, media.buffer);

        await startProgress(jid, msg, "تحويل الملصق إلى فيديو...", 15);

        // extract frames from animated webp using ImageMagick
        fs.mkdirSync(frameDir, { recursive: true });
        const extractCmd = `convert "${webpPath}" "${frameDir}/frame_%04d.png"`;
        await runCommand(extractCmd);

        // verify frames extracted
        const frames = fs.readdirSync(frameDir).filter(f => f.endsWith('.png')).sort();
        if (frames.length === 0) throw new Error("فشل استخراج إطارات الملصق.");

        // build video from frames
        const framesPattern = path.join(frameDir, "frame_%04d.png");
        const video2mp4Cmd = 
          `ffmpeg -y -framerate 20 -i "${framesPattern}" ` +
          `-c:v libx264 -preset veryfast -crf 25 -pix_fmt yuv420p ` +
          `-vf "scale=min(720\\,iw):-1:flags=lanczos" ` +
          `-movflags faststart "${outputPath}"`;

        await runCommand(video2mp4Cmd);

        if (!fs.existsSync(outputPath)) throw new Error("فشل تحويل الملصق.");

        const result = fs.readFileSync(outputPath);
        const caption = await buildCaption("sticker");
        await wa.sendMessage(jid, { video: result, caption }, { quoted: msg });
        await finishProgress(jid);
        wa.react("✅");
        return;
      }
    } catch (err) {
      console.error("FID ERROR:", err);
      wa.react("⚠️");
      try {
        await wa.sendMessage(msg.key.remoteJid, { text: "حدث خطأ أثناء التحويل:\n" + String(err) }, { quoted: msg });
      } catch (e) {}
    } finally {
      if (progressTimer) clearInterval(progressTimer);
      for (const file of tempFiles) {
        try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch (e) {}
      }
      // cleanup frames directory
      const possibleFrameDir = tempFiles[0]?.replace(/\.(webp|ogg)$/, '_frames');
      if (possibleFrameDir && fs.existsSync(possibleFrameDir)) {
        try { fs.rmSync(possibleFrameDir, { recursive: true, force: true }); } catch (e) {}
      }
    }
  },
};