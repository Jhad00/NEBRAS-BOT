import axios from "axios";
import fs from "fs";
import os from "os";
import path from "path";
import { exec } from "child_process";

const apisFile = path.resolve("apis.json");
const apis = JSON.parse(fs.readFileSync(apisFile, "utf-8"));
// ── exec wrapper ──────────────────────────────────────────────────────────────
const runCommand = (cmd) =>
  new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 1024 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(stderr || err);
      resolve(stdout || stderr);
    });
  });

// ── project temp dir ──────────────────────────────────────────────────────────
const getProjectTempDir = () => {
  const tempDir = path.join(process.cwd(), "temp");
  try {
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  } catch (_) {
    return os.tmpdir();
  }
  return tempDir;
};

// ── parse flags ───────────────────────────────────────────────────────────────
function parseFlags(msg) {
  const text =
    msg?.text ||
    msg?.body ||
    msg?.message?.conversation ||
    msg?.message?.extendedTextMessage?.text ||
    "";
  const t = text.toLowerCase();

  const help   = /\s-h(\s|$)/.test(t);
  const music  = /\s-m(\s|$)/.test(t);
  const vocal  = /\s-s(\s|$)/.test(t);
  const record = /\s-r(\s|$)/.test(t);

  return {
    help,
    send:   music ? "music" : vocal ? "vocal" : "both",
    format: record ? "record" : "voice",
  };
}

// ── ffmpeg merge audio to video ───────────────────────────────────────────────
async function mergeAudioVideo(videoPath, audioPath, outputPath) {
  const cmd = `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 "${outputPath}"`;
  await runCommand(cmd);
}

// ── ffmpeg convert ────────────────────────────────────────────────────────────
async function convertAudio(inputPath, outputPath, format) {
  const cmd = format === "record"
    ? `ffmpeg -y -i "${inputPath}" -vn -map_metadata -1 -c:a libopus -b:a 64k -ac 1 -ar 48000 -vbr on -compression_level 10 -application voip -frame_duration 60 -f ogg "${outputPath}"`
    : `ffmpeg -y -i "${inputPath}" -vn -map_metadata -1 -c:a libmp3lame -b:a 128k -ar 44100 "${outputPath}"`;
  await runCommand(cmd);
}

// ── WA payload ────────────────────────────────────────────────────────────────
function buildPayload(filePath, format, isVideo = false) {
  if (isVideo) return { video: { url: filePath } };
  return format === "record"
    ? { audio: { url: filePath }, mimetype: "audio/ogg; codecs=opus", ptt: true }
    : { audio: { url: filePath }, mimetype: "audio/mpeg", ptt: false };
}

// ── download file ─────────────────────────────────────────────────────────────
async function downloadFile(url, destPath) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 120000,
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  fs.writeFileSync(destPath, Buffer.from(res.data));
}

// ── MVSEP credentials from apis.json ────────────────────────────────────────
const MVSEP_EMAIL    = apis.mvsep?.email;
const MVSEP_PASSWORD = apis.mvsep?.password;

// check API keys available
if (!MVSEP_EMAIL || !MVSEP_PASSWORD) {
  console.warn("⚠️ MVSEP API credentials missing in apis.json");
}

// cached token (per-process lifetime)
let _cachedToken = null;

async function getMvsepToken() {
  if (_cachedToken) return _cachedToken;

  const { default: FormData } = await import("form-data");
  const form = new FormData();
  form.append("email",    MVSEP_EMAIL);
  form.append("password", MVSEP_PASSWORD);

  const res = await axios.post("https://mvsep.com/api/app/login", form, {
    headers: form.getHeaders(),
    timeout: 30000,
  });

  if (!res.data?.success) {
    throw new Error("mvsep login failed: " + JSON.stringify(res.data));
  }

  _cachedToken = res.data.data.api_token;
  return _cachedToken;
}

// ── mvsep create separation ───────────────────────────────────────────────────
// sep_type 27 = Demucs4 Vocals 2023 → vocals.mp3 + no_vocals.mp3
async function mvsepCreate(mp3Path, apiToken) {
  const { default: FormData } = await import("form-data");
  const form = new FormData();

  form.append("audiofile", fs.createReadStream(mp3Path), {
    filename:    path.basename(mp3Path),
    contentType: "audio/mpeg",
  });
  form.append("api_token",     apiToken);
  form.append("sep_type",      "27");
  form.append("output_format", "0"); // mp3 320kbps

  const res = await axios.post("https://mvsep.com/api/separation/create", form, {
    headers:          form.getHeaders(),
    timeout:          120000,
    maxContentLength: Infinity,
    maxBodyLength:    Infinity,
  });

  if (!res.data?.success) {
    throw new Error("mvsep create failed: " + JSON.stringify(res.data));
  }

  return res.data.data.hash;
}

// ── poll until done ───────────────────────────────────────────────────────────
async function mvsepPoll(hash, maxWait = 600000) {
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    const res = await axios.get(
      `https://mvsep.com/api/separation/get?hash=${hash}`,
      { timeout: 30000 }
    );

    const { status, data } = res.data;

    if (status === "done" && data?.files) {
      const files = Array.isArray(data.files) ? data.files : Object.values(data.files);

      const vocalFile = files.find((f) => /vocal/i.test(f.name) && !/no_vocal|instrum/i.test(f.name));
      const musicFile = files.find((f) => /no_vocal|instrum|music/i.test(f.name));

      if (vocalFile && musicFile) {
        return { vocalUrl: vocalFile.url, musicUrl: musicFile.url };
      }
      // fallback: index 0 = vocals, index 1 = instrumental
      if (files.length >= 2) {
        return { vocalUrl: files[0].url, musicUrl: files[1].url };
      }
      throw new Error("mvsep: unexpected files: " + JSON.stringify(files));
    }

    if (status === "failed") {
      throw new Error("mvsep failed: " + (data?.message || "unknown"));
    }

    await new Promise((r) => setTimeout(r, 8000));
  }

  throw new Error("mvsep: timeout after 10min");
}

// ─────────────────────────────────────────────────────────────────────────────
export default {
  cmd: "فصل",
  description: "فصل الصوت عن الموسيقى",
  aliases: ["separate", "stemsep"],
  category: "ادوات",

  do: async (wa, msg) => {
    const { help, send, format } = parseFlags(msg);

    // Check if there's a reply with media
    let hasMedia = false;
    try {
      const media = await wa.getMediaBufferFromReply(msg);
      if (media?.buffer) {
        const mime = (media.mimetype || "").toLowerCase();
        const fname = (media.filename || "").toLowerCase();
        const isAudio = media.type === "audio" || media.type === "ptt" || mime.startsWith("audio/") || /\.(mp3|ogg|m4a|wav|aac|flac|opus)$/.test(fname);
        const isVideo = media.type === "video" || mime.startsWith("video/") || /\.(mp4|mkv|mov|avi|webm)$/.test(fname);
        if (isAudio || isVideo) hasMedia = true;
      }
    } catch (_) {}

    if (help || !hasMedia) {
      return wa.sendMessage(msg.key.remoteJid, {
        text: `
📖 *دليل استخدام أمر الفصل (separate)*

يقوم الأمر بفصل الموسيقى عن الصوت باستخدام الذكاء الاصطناعي.

*الخيارات:*
- -m : إرسال الموسيقى فقط.
- -s : إرسال الصوت فقط (بدون موسيقى).
- -r : إرسال النتيجة كتسجيل صوتي (Voice Note).
- -h أو --help : عرض هذه المساعدة.

*طريقة الاستخدام:*
قم بالرد على رسالة صوتية أو فيديو ثم استخدم الأمر.

*أمثلة:*
فصل
فصل -m
فصل -s
فصل -r
فصل -m -r
        `.trim(),
      }, { quoted: msg });
    }

    const tempDir   = getProjectTempDir();
    const id        = `${Date.now()}_${Math.floor(Math.random() * 999999)}`;
    const outExt    = format === "record" ? "ogg" : "mp3";
    const tempFiles = [];

    try {
      // check if API available before starting
      if (!MVSEP_EMAIL || !MVSEP_PASSWORD) {
        wa.react("⚠️");
        return wa.sendMessage(
          msg.key.remoteJid,
          { text: "❌ API غير متوفر - تحقق من بيانات MVSEP في apis.json" },
          { quoted: msg }
        );
      }

      wa.react("🎛");

      const media = await wa.getMediaBufferFromReply(msg);
      if (!media?.buffer) {
        wa.react("⚠️");
        return wa.sendMessage(msg.key.remoteJid, { text: "⚠️ ردّ على مقطع صوتي أولاً." }, { quoted: msg });
      }

      const mime    = (media.mimetype || "").toLowerCase();
      const fname   = (media.filename || "").toLowerCase();
      const isAudio = media.type === "audio" || media.type === "ptt" || mime.startsWith("audio/") || /\.(mp3|ogg|m4a|wav|aac|flac|opus)$/.test(fname);
      const isVideo = media.type === "video" || mime.startsWith("video/") || /\.(mp4|mkv|mov|avi|webm)$/.test(fname);

      if (!isAudio && !isVideo) {
        wa.react("⚠️");
        return wa.sendMessage(msg.key.remoteJid, { text: "⚠️ نوع الوسائط غير مدعوم." }, { quoted: msg });
      }

      // save raw
      const rawPath = path.join(tempDir, `sep_raw_${id}.${isVideo ? "mp4" : "ogg"}`);
      tempFiles.push(rawPath);
      fs.writeFileSync(rawPath, media.buffer);

      // to mp3 for upload
      const uploadPath = path.join(tempDir, `sep_upload_${id}.mp3`);
      tempFiles.push(uploadPath);
      await runCommand(`ffmpeg -y -i "${rawPath}" -vn -map_metadata -1 -c:a libmp3lame -b:a 192k -ar 44100 "${uploadPath}"`);

      wa.react("📡");

      // login + submit
      const token = await getMvsepToken();
      const hash  = await mvsepCreate(uploadPath, token);

      // poll
      const { vocalUrl, musicUrl } = await mvsepPoll(hash);

      // download
      const vocalRaw = path.join(tempDir, `sep_vocal_raw_${id}.mp3`);
      const musicRaw = path.join(tempDir, `sep_music_raw_${id}.mp3`);
      tempFiles.push(vocalRaw, musicRaw);

      if (send === "both" || send === "vocal") await downloadFile(vocalUrl, vocalRaw);
      if (send === "both" || send === "music") await downloadFile(musicUrl, musicRaw);

      // convert to WA format
      const vocalOut = path.join(tempDir, `sep_vocal_${id}.${outExt}`);
      const musicOut = path.join(tempDir, `sep_music_${id}.${outExt}`);
      tempFiles.push(vocalOut, musicOut);

      if (send === "both" || send === "vocal") await convertAudio(vocalRaw, vocalOut, format);
      if (send === "both" || send === "music") await convertAudio(musicRaw, musicOut, format);

      // handle video output
      let finalVocal = vocalOut;
      let finalMusic = musicOut;

      if (isVideo) {
        finalVocal = path.join(tempDir, `sep_vocal_vid_${id}.mp4`);
        finalMusic = path.join(tempDir, `sep_music_vid_${id}.mp4`);
        tempFiles.push(finalVocal, finalMusic);

        if (send === "both" || send === "vocal") await mergeAudioVideo(rawPath, vocalRaw, finalVocal);
        if (send === "both" || send === "music") await mergeAudioVideo(rawPath, musicRaw, finalMusic);
      }

      wa.react("📤");

      if (send === "both") {
        await wa.sendMessage(msg.key.remoteJid, buildPayload(finalVocal, format, isVideo), { quoted: msg });
        await wa.sendMessage(msg.key.remoteJid, buildPayload(finalMusic, format, isVideo), { quoted: msg });
      } else if (send === "vocal") {
        await wa.sendMessage(msg.key.remoteJid, buildPayload(finalVocal, format, isVideo), { quoted: msg });
      } else {
        await wa.sendMessage(msg.key.remoteJid, buildPayload(finalMusic, format, isVideo), { quoted: msg });
      }

      wa.react("✅");
    } catch (err) {
      wa.react("⚠️");
      try {
        await wa.sendMessage(msg.key.remoteJid, { text: "❌ خطأ:\n" + String(err) }, { quoted: msg });
      } catch (_) {}
    } finally {
      for (const f of tempFiles) {
        try { if (f && fs.existsSync(f)) fs.unlinkSync(f); } catch (_) {}
      }
    }
  },
};