import fs from "fs";  
import { exec } from "child_process";  
import path from "path";  
import crypto from "crypto";  
import { Sticker, StickerTypes } from "wa-sticker-formatter";  

function run(cmd) {  
  return new Promise((resolve, reject) => {  
    exec(cmd, (err, stdout, stderr) => {  
      if (err) return reject(new Error(stderr || err.message));  
      resolve({ stdout, stderr });  
    });  
  });  
}  

function getText(msg) {  
  return (  
    msg?.text ||  
    msg?.body ||  
    msg?.message?.conversation ||  
    msg?.message?.extendedTextMessage?.text ||  
    ""  
  );  
}  

function getStickerMode(msg) {
  const t = getText(msg).toLowerCase();
  if (/\s-h(\s|$)/.test(t)) return "help";
  if (/\s-s(\s|$)/.test(t)) return "crop";
  if (/\s-p(\s|$)/.test(t)) return "stretch";
  if (/\s-c(\s|$)/.test(t)) return "coordinates";
  return "normal";
}

// Parse coordinates string into numbers
function parseCoordinates(msg) {
  const t = getText(msg);
  // Expected format: "stiker -c x1,y1,x2,y2"
  const match = t.match(/-c\s+(\d+),(\d+),(\d+),(\d+)/);
  if (!match) return null;
  return {
    x1: parseInt(match[1]),
    y1: parseInt(match[2]),
    x2: parseInt(match[3]),
    y2: parseInt(match[4])
  };
}

function guessExt(mimetype, type) {  
  const m = (mimetype || "").toLowerCase();  

  if (type === "video") {  
    if (m.includes("mp4")) return ".mp4";  
    if (m.includes("webm")) return ".webm";  
    if (m.includes("3gpp") || m.includes("3gp")) return ".3gp";  
    return ".mp4";  
  }  

  if (m.includes("gif")) return ".gif";  
  if (m.includes("png")) return ".png";  
  if (m.includes("webp")) return ".webp";  
  if (m.includes("jpeg") || m.includes("jpg")) return ".jpg";  
  return ".png";  
}  

function buildFilter(mode, coords) {  
  switch (mode) {
    case "crop":  
      return `scale=512:512:force_original_aspect_ratio=increase,fps=15,format=rgba,crop=512:512`;  
    case "stretch":  
      return `scale=512:512,fps=15,format=rgba`;  
    case "coordinates":
      if (!coords) return `scale=512:512,fps=15,format=rgba`;  
      // Calculate bounding box from two points
      const x = Math.min(coords.x1, coords.x2);
      const y = Math.min(coords.y1, coords.y2);
      let width = Math.abs(coords.x2 - coords.x1);
      let height = Math.abs(coords.y2 - coords.y1);

      // Make square by taking the max of width/height
      const size = Math.max(width, height);
      // scale width and height independently to make square (stretch)
      return `crop=${width}:${height}:${x}:${y},scale=512:512,fps=15,format=rgba`;  
    default: // normal
      return `scale=512:512:force_original_aspect_ratio=decrease,fps=15,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=00000000`;  
  }
}  

export default {  
  cmd: "ملصق",  
  description: "انشاء ملصق",  
  aliases: ["ستكر", "stiker"],  
  category: "ادوات",  
  do: async (wa, msg) => {  
    const mode = getStickerMode(msg);
    let coords = null;

    if (mode === "help") {
      return wa.sendMessage(msg.key.remoteJid, {
        text: `
📖 *دليل استخدام أمر الملصق (stiker)*

يقوم الأمر بتحويل الصورة أو الفيديو أو الملصق إلى ملصق واتساب.

*الخيارات:*
- -s : قص الصورة لتصبح مربعة (Crop).
- -p : تمديد الصورة لتملأ المربع بالكامل (Stretch).
- -c x1,y1,x2,y2 : قص جزء محدد من الصورة باستخدام إحداثيات نقطتين.
- -h أو --help : عرض هذه المساعدة.

*أمثلة:*
stiker
stiker -s
stiker -p
stiker -c 120,60,420,360
    `.trim(),
      });
    }

    if (mode === "coordinates") {
      coords = parseCoordinates(msg);
      if (!coords) return wa.sendMessage(msg.key.remoteJid, { text: "❌ Invalid coordinates format.\nUse: stiker -c x1,y1,x2,y2" });
    }

    let inputPath = null;  
    let outputPath = null;  

    try {  
      const media = await wa.getMediaBufferFromReply(msg);  

      // إذا لم يتم الرد على أي وسائط وكان المستخدم كتب الأمر العادي
      // يتم عرض دليل الاستخدام بدلاً من رسالة الخطأ.
      if (!media) {
        return wa.sendMessage(msg.key.remoteJid, {
          text: `
📖 *دليل استخدام أمر الملصق (stiker)*

يقوم الأمر بتحويل الصورة أو الفيديو أو الملصق إلى ملصق واتساب.

*الخيارات:*
- -s : قص الصورة لتصبح مربعة (Crop).
- -p : تمديد الصورة لتملأ المربع بالكامل (Stretch).
- -c x1,y1,x2,y2 : قص جزء محدد من الصورة باستخدام إحداثيات نقطتين.
- -h أو --help : عرض هذه المساعدة.

*أمثلة:*
stiker
stiker -s
stiker -p
stiker -c 120,60,420,360
    `.trim(),
        });
      }

      // السماح بالصور والفيديو والملصقات
      const isValidMedia =
        /image|video|sticker/i.test(media.type) ||
        /image|video/i.test(media.mimetype);

      if (!isValidMedia) {
        return wa.react("🚫");
      }  

      wa.react("🖌️");  

      const PACK_NAME = "⚙️ 𝙳𝙴𝚅";  
      const AUTHOR = "𝙹𝙷𝙰𝙳";  

      const id = crypto.randomBytes(6).toString("hex");  
      const ext = guessExt(media.mimetype, media.type);  

      inputPath = path.join(process.cwd(), `input_${id}${ext}`);  
      outputPath = path.join(process.cwd(), `sticker_${id}.webp`);  

      fs.writeFileSync(inputPath, media.buffer);  

      const mimetype = (media.mimetype || "").toLowerCase();  
        // check if gif
        const isGif = mimetype.includes("gif");  
        // check if animated webp using chunk header
        const isAnimatedWebp = mimetype.includes("webp") && media.buffer.includes("ANIM");
        // validate all animated formats
        const isAnimated = media.type === "video" || isGif || isAnimatedWebp;  

        // bypass ffmpeg for animated webp (prevents ANIM decoding crash) or normal webp
        if (isAnimatedWebp || (mimetype.includes("webp") && mode === "normal")) {
          const sticker = new Sticker(media.buffer, {  
            pack: PACK_NAME,  
            author: AUTHOR,  
            type: StickerTypes.FULL,  
            quality: isAnimated ? 60 : 80,  
          });
          const finalStickerBuffer = await sticker.toBuffer();  
          await wa.sendMessage(msg.key.remoteJid, { sticker: finalStickerBuffer });  
          wa.react("✅");
          return;
        }

        const vf = buildFilter(mode, coords);  

        let ffmpegCmd = "";

      if (!isAnimated) {  
        ffmpegCmd =  
          `ffmpeg -y -i "${inputPath}" ` +  
          `-vf "${vf}" ` +  
          `-vcodec libwebp -lossless 1 -compression_level 6 -qscale 80 "${outputPath}"`;  
      } else {  
        const gifFlags = isGif ? `-ignore_loop 0 ` : "";  
        ffmpegCmd =  
          `ffmpeg -y ${gifFlags}-i "${inputPath}" ` +  
          `-t 9.8 -an -fps_mode passthrough ` +  
          `-vf "${vf}" ` +  
          `-vcodec libwebp -loop 0 -preset default -qscale 60 "${outputPath}"`;  
      }  

      await run(ffmpegCmd);  

      const webpBuffer = fs.readFileSync(outputPath);  

      const sticker = new Sticker(webpBuffer, {  
        pack: PACK_NAME,  
        author: AUTHOR,  
        type: StickerTypes.FULL,  
        quality: isAnimated ? 60 : 80,  
      });  

      const finalStickerBuffer = await sticker.toBuffer();  

      await wa.sendMessage(msg.key.remoteJid, { sticker: finalStickerBuffer });  
      wa.react("✅");  
    } catch (e) {  
      console.log(e);  
      // send error message to chat to debug ffmpeg/buffer issues
      await wa.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${e.message}` });
      wa.react("⚠️");  
    } finally {  
      try { if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch {}  
      try { if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}  
    }  
  },  
};