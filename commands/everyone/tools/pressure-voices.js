import { exec } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

// Exec wrapper with large buffer support
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

// Use a temp folder inside the project instead of system tmp
const getProjectTempDir = () => {
const tempDir = path.join(process.cwd(), "temp");
try {
if (!fs.existsSync(tempDir)) {
fs.mkdirSync(tempDir, { recursive: true });
console.log("Created project temp dir:", tempDir);
}
} catch (e) {
console.error("Failed to create project temp dir, fallback to os.tmpdir():", e);
return os.tmpdir();
}
return tempDir;
};

// Parse mode from message text
function getCompressMode(msg) {
const text =
msg?.text ||
msg?.body ||
msg?.message?.conversation ||
msg?.message?.extendedTextMessage?.text ||
"";
const t = text.toLowerCase();
if (/\s-h(\s|$)/.test(t)) return "help";
if (/\s-p(\s|$)/.test(t)) return "pure";
if (/\s-s(\s|$)/.test(t)) return "strong";
return "normal";
}

export default {
cmd: "ضغط",
description:
"تقليل مساحة الصوت",
aliases: ["compress", "zipaudio"],
category: "ادوات",

do: async (wa, msg) => {
const mode = getCompressMode(msg);

if (mode === "help" || mode === "normal") {
  return wa.sendMessage(msg.key.remoteJid, {
    text: `
📖 *دليل استخدام أمر الضغط (compress)*

يقوم الأمر بضغط الصوت أو الرسالة الصوتية (Voice Note) لتقليل حجمها.

*الخيارات:*
- -p : ضغط متوازن مع الحفاظ على جودة جيدة.
- -s : ضغط قوي للحصول على أصغر حجم ممكن.
- -h أو --help : عرض هذه المساعدة.

*طريقة الاستخدام:*
قم بالرد على رسالة صوتية أو ملف صوتي ثم استخدم الأمر.

*أمثلة:*
ضغط -p
ضغط -s
    `.trim(),
  });
}

let inputPath = null;  
let outputPath = null;  
const tempFiles = [];  

try {  
  wa.react("🎧");  

  // Get replied media  
  const media = await wa.getMediaBufferFromReply(msg);  
  console.log("REPLIED MEDIA TYPE:", media?.type, "BUFFER LENGTH:", media?.buffer?.length, "FIRST BYTES:", media?.buffer?.slice(0, 16)?.toString("hex"));  

  const isAudioType =  
    media &&  
    (  
      media.type === "audio" ||  
      media.type === "ptt" ||  
      media.type === "audioMessage" ||  
      media.type === "voice" ||  
      (media.mimetype && media.mimetype.startsWith("audio/"))  
    );  

  if (!media || !media.buffer || !isAudioType) {  
    wa.react("⚠️");  
    await wa.sendMessage(  
      msg.key.remoteJid,  
      {  
        text:  
          "You must reply to an audio or voice message.\n" +  
          "If you are replying to a voice note and it does not work, send me a screenshot of the log.",  
      },  
      { quoted: msg }  
    );  
    return;  
  }  

  const tempDir = getProjectTempDir();  
  const id = Date.now() + "_" + Math.floor(Math.random() * 999999);  

  const isMp3 = media.buffer.slice(0, 3).toString() === "ID3" || (media.buffer[0] === 0xff && (media.buffer[1] & 0xe0) === 0xe0);
  const inExt = isMp3 ? "mp3" : "ogg";
  inputPath = path.join(tempDir, `nebras_in_${id}.${inExt}`);  
  outputPath = path.join(tempDir, `nebras_out_${id}.ogg`);  
  tempFiles.push(inputPath, outputPath);  

  try {  
    fs.writeFileSync(inputPath, media.buffer);  
  } catch (e) {  
    console.error("WRITE INPUT ERROR:", e);  
    if (e.code === "ENOSPC") {  
      wa.react("⚠️");  
      await wa.sendMessage(  
        msg.key.remoteJid,  
        {  
          text:  
            "No space left on device while writing the temp input file.\n" +  
            "Free some storage space and try again.",  
        },  
        { quoted: msg }  
      );  
      return;  
    }  
    throw e;  
  }  

  let ffmpegCmd = "";  

  if (mode === "pure") {  
    ffmpegCmd =  
      `ffmpeg -y -i "${inputPath}" -map 0:a:0 -map_metadata -1 ` +  
      `-ac 1 -ar 16000 -c:a libopus -b:a 16k -vbr on -application voip -f ogg "${outputPath}"`;  
  } else if (mode === "strong") {  
    ffmpegCmd =  
      `ffmpeg -y -i "${inputPath}" -map 0:a:0 -map_metadata -1 ` +  
      `-ac 1 -ar 12000 -c:a libopus -b:a 8k -vbr on -application voip -f ogg "${outputPath}"`;  
  }  

  console.log("Running FFmpeg:", ffmpegCmd);  

  let ffOut;  
  try {  
    ffOut = await runCommand(ffmpegCmd);  
    console.log("FFMPEG OUTPUT:", ffOut);  
  } catch (e) {  
    console.error("FFMPEG ERROR:", e);  
    if (typeof e === "string" && e.includes("No space left on device")) {  
      wa.react("⚠️");  
      await wa.sendMessage(  
        msg.key.remoteJid,  
        {  
          text:  
            "No space left on device during compression.\n" +  
            "Free some storage space (project folder / temp folder) and try again.",  
        },  
        { quoted: msg }  
      );  
      return;  
    }  
    await wa.sendMessage(  
      msg.key.remoteJid,  
      {  
        text: "FFmpeg error while compressing the audio.\n" + String(e),  
      },  
      { quoted: msg }  
    );  
    return;  
  }  

  if (!fs.existsSync(outputPath)) {  
    wa.react("⚠️");  
    console.error("FFMPEG: output file not found:", outputPath);  
    await wa.sendMessage(  
      msg.key.remoteJid,  
      {  
        text:  
          "An error occurred during compression. Output file was not created.",  
      },  
      { quoted: msg }  
    );  
    return;  
  }  

  const result = fs.readFileSync(outputPath);  
  console.log("COMPRESSED FILE SIZE (bytes):", result.length);  

  await wa.sendMessage(  
    msg.key.remoteJid,  
    {  
      audio: result,  
      mimetype: "audio/ogg; codecs=opus",  
      ptt: true,  
    },  
    { quoted: msg }  
  );  

  wa.react("✅");  
} catch (err) {  
  console.error("COMPRESS ERROR (GENERAL):", err);  
  wa.react("⚠️");  
  try {  
    await wa.sendMessage(  
      msg.key.remoteJid,  
      { text: "Unexpected error during compression.\n" + String(err) },  
      { quoted: msg }  
    );  
  } catch (e) {}  
} finally {  
  for (const file of tempFiles) {  
    if (!file) continue;  
    try {  
      if (fs.existsSync(file)) {  
        fs.unlinkSync(file);  
        console.log("Deleted temp file:", file);  
      }  
    } catch (e) {  
      console.error("Failed to delete temp file:", file, e);  
    }  
  }  
}

},
};