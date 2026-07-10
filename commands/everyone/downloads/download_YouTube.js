import axios from "axios";
import https from "https";
import fs from "fs";
import path from "path";
import { exec } from "child_process";

// ── temp dir at project root ──────────────────────────────────
const TEMP_DIR = path.resolve(process.cwd(), "temp");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// ── exec wrapper ──────────────────────────────────────────────
const runCommand = (cmd) =>
  new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 1024 * 1024 * 512 }, (err, stdout, stderr) => {
      if (err) return reject(stderr || err);
      resolve(stdout || stderr);
    });
  });

// ── retry wrapper ─────────────────────────────────────────────
const tryRequest = async (getter, attempts = 3) => {
  let lastError;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await getter();
    } catch (err) {
      lastError = err;
      if (i < attempts) await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
  throw lastError;
};

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
};

// ── API 1: EliteProTech ───────────────────────────────────────
const getEliteProTechVideo = async (url) => {
  const res = await tryRequest(() =>
    axios.get(
      `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(url)}&format=mp4`,
      { timeout: 60000, headers: HEADERS }
    )
  );
  if (res?.data?.success && res?.data?.downloadURL)
    return { download: res.data.downloadURL, title: res.data.title };
  throw new Error("EliteProTech: no downloadURL");
};

// ── API 2: Yupra ──────────────────────────────────────────────
const getYupraVideo = async (url) => {
  const res = await tryRequest(() =>
    axios.get(
      `https://api.yupra.my.id/api/downloader/ytmp4?url=${encodeURIComponent(url)}`,
      { timeout: 60000, headers: HEADERS }
    )
  );
  if (res?.data?.success && res?.data?.data?.download_url)
    return {
      download: res.data.data.download_url,
      title: res.data.data.title,
      thumbnail: res.data.data.thumbnail,
    };
  throw new Error("Yupra: no download_url");
};

// ── API 3: Okatsu ─────────────────────────────────────────────
const getOkatsuVideo = async (url) => {
  const res = await tryRequest(() =>
    axios.get(
      `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp4?url=${encodeURIComponent(url)}`,
      { timeout: 60000, headers: HEADERS }
    )
  );
  if (res?.data?.result?.mp4)
    return { download: res.data.result.mp4, title: res.data.result.title };
  throw new Error("Okatsu: no mp4");
};

// ── sequential fallback ───────────────────────────────────────
const fetchVideoData = async (url) => {
  try { return await getEliteProTechVideo(url); } catch (_) {}
  try { return await getYupraVideo(url); } catch (_) {}
  return await getOkatsuVideo(url);
};

// ── stream download to file ───────────────────────────────────
const downloadToFile = async (downloadUrl, filePath) => {
  const response = await axios.get(downloadUrl, {
    responseType: "stream",
    timeout: 120000,
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    headers: {
      "User-Agent": HEADERS["User-Agent"],
      Accept: "*/*",
      Referer: "https://www.youtube.com/",
    },
  });
  await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
};

// ── time parsing & validation ─────────────────────────────────
const parseTimestamp = (ts) => {
  const match = ts.match(/^(?:(\d+):)?(\d+):(\d+)(?:\.(\d+))?$/);
  if (!match) return null;
  const hours   = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  const frac    = match[4] ? parseFloat(`0.${match[4]}`) : 0;
  if (minutes >= 60 || seconds >= 60) return null;
  return hours * 3600 + minutes * 60 + seconds + frac;
};

const parseTrimRange = (raw) => {
  const dashIdx = raw.lastIndexOf("-");
  if (dashIdx <= 0) throw new Error("INVALID_TIME");
  const startStr = raw.slice(0, dashIdx).trim();
  const endStr   = raw.slice(dashIdx + 1).trim();
  const start = parseTimestamp(startStr);
  const end   = parseTimestamp(endStr);
  if (start === null || end === null) throw new Error("INVALID_TIME");
  if (start >= end) throw new Error("INVALID_TIME_ORDER");
  return { start, end };
};

// ── cleanup helper ────────────────────────────────────────────
const cleanFiles = (...files) => {
  for (const f of files) {
    try { if (f && fs.existsSync(f)) fs.unlinkSync(f); } catch (_) {}
  }
};

// ── parse flags from args array ───────────────────────────────
const parseFlags = (args) => {
  const flags = { mode: "video", query: "", trim: null };
  const parts = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-v") {
      flags.mode = "voice";
    } else if (arg === "-r") {
      flags.mode = "record";
    } else if (arg === "-h") {
      flags.mode = "help";
    } else if (arg === "-t") {
      flags.trim = args[++i] ?? "";
    } else {
      parts.push(arg);
    }
  }
  flags.query = parts.join(" ").trim();
  return flags;
};

// ── help text ─────────────────────────────────────────────────
const HELP_TEXT = `
🎬  *يوتيوب — مساعدة*

• *.يوتيوب <رابط/اسم>*                  ← تحميل فيديو 📹
• *.يوتيوب -v <رابط/اسم>*               ← تحميل كصوت عادي 🎧
• *.يوتيوب -r <رابط/اسم>*               ← تحميل كتسجيل صوتي 🎤
• *.يوتيوب -t MM:SS-MM:SS <رابط>*       ← قص من وقت لوقت ✂️
• *.يوتيوب -v -t MM:SS-MM:SS <رابط>*    ← صوت + قص 🎧✂️
• *.يوتيوب -r -t MM:SS-MM:SS <رابط>*    ← تسجيل + قص 🎤✂️
• *.يوتيوب -h*                           ← عرض هذه المساعدة 📖

*صيغ الوقت المقبولة:*
  MM:SS        مثال: 01:30
  HH:MM:SS     مثال: 01:30:00
  MM:SS.ff     مثال: 08:19.20 (مع أجزاء الثانية)
`.trim();

// ═════════════════════════════════════════════════════════════
export default {
  cmd: "يوتيوب",
  description: "تحميل فيديو من يوتيوب",
  aliases: ["youtube", "ytv", "ytmp4", "yt"],
  category: "تحميل",

  do: async (wa, msg, args) => {
    const chatId = msg.key.remoteJid;
    const { mode, query, trim: trimRaw } = parseFlags(args);

    // ── help ────────────────────────────────────────────────
    if (mode === "help" || !query) {
      await wa.react("ℹ️");
      return wa.sendMessage(chatId, { text: HELP_TEXT }, { quoted: msg });
    }

    // ── validate -t range before doing anything ─────────────
    let trimRange = null;
    if (trimRaw !== null) {
      try {
        trimRange = parseTrimRange(trimRaw);
      } catch (err) {
        const errMsg =
          err.message === "INVALID_TIME_ORDER"
            ? "⚠️ الوقت غير صحيح: وقت البداية يجب أن يكون قبل وقت النهاية.\n*مثال:* `-t 00:30-01:45`"
            : "⚠️ صيغة الوقت غير صحيحة.\n*أمثلة مقبولة:*\n`-t 01:30-02:45`\n`-t 08:19.20-19:20.19`\n`-t 1:00:00-1:30:00`";
        await wa.react("⚠️");
        return wa.sendMessage(chatId, { text: errMsg }, { quoted: msg });
      }
    }

    await wa.react("⏳");

    // ── temp paths ──────────────────────────────────────────
    const id       = Date.now();
    const audioExt = mode === "record" ? "ogg" : "mp3";
    const tempVideo = path.join(TEMP_DIR, `yt_${id}.mp4`);
    const tempAudio = path.join(TEMP_DIR, `yt_${id}.${audioExt}`);
    const tempTrimV = path.join(TEMP_DIR, `yt_${id}_trim.mp4`);
    const tempTrimA = path.join(TEMP_DIR, `yt_${id}_trim.${audioExt}`);

    let thumbnailMsgKey = null;

    try {
      const isUrl = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com|youtu\.be)/.test(query);

      let videoUrl   = query;
      let videoTitle = "";
      let videoThumb = "";

      // ── search by name if not a URL ─────────────────────
      if (!isUrl) {
        const { default: yts } = await import("yt-search");
        const { videos } = await yts(query);
        if (!videos?.length) throw new Error("لم يتم العثور على أي فيديو.");
        videoUrl   = videos[0].url;
        videoTitle = videos[0].title;
        videoThumb = videos[0].thumbnail;
      }

      // ── send thumbnail as loading notice ─────────────────
      try {
        const ytId = (videoUrl.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/) || [])[1];
        const thumb = videoThumb || (ytId ? `https://i.ytimg.com/vi/${ytId}/sddefault.jpg` : null);
        const trimLabel = trimRange ? `\n✂️ القص: \`${trimRaw}\`` : "";
        if (thumb) {
          const sent = await wa.sendMessage(
            chatId,
            {
              image: { url: thumb },
              caption: `*${videoTitle || query}*${trimLabel}\n\n⏳ جاري التحميل...`,
            },
            { quoted: msg }
          );
          thumbnailMsgKey = sent.key;
        }
      } catch (_) {}

      // ── fetch link & download ────────────────────────────
      const videoData  = await fetchVideoData(videoUrl);
      const finalTitle = videoData.title || videoTitle || "video";
      const safeTitle  = finalTitle.replace(/[^\w\s\u0600-\u06FF-]/g, "").trim();

      await downloadToFile(videoData.download, tempVideo);

      if (fs.statSync(tempVideo).size === 0)
        throw new Error("الملف المُحمَّل فارغ");

      // ── trim helper (video or audio) ─────────────────────
      const applyTrim = async (input, output, isAudio) => {
        const ss = trimRange.start.toString();
        const to = trimRange.end.toString();
        let cmd;
        if (!isAudio) {
          cmd = `ffmpeg -y -ss ${ss} -to ${to} -i "${input}" -c copy "${output}"`;
        } else if (mode === "record") {
          cmd = `ffmpeg -y -ss ${ss} -to ${to} -i "${input}" -map_metadata -1 -c:a libopus -b:a 32k -ac 1 -ar 48000 -vbr on -compression_level 10 -application voip -f ogg "${output}"`;
        } else {
          cmd = `ffmpeg -y -ss ${ss} -to ${to} -i "${input}" -map_metadata -1 -c:a libmp3lame -b:a 128k -ar 44100 "${output}"`;
        }
        await runCommand(cmd);
        if (!fs.existsSync(output) || fs.statSync(output).size < 512)
          throw new Error("فشل القص أو الملف فارغ بعد القص");
      };

      // ════════════════════════════════════════════════════
      // MODE: VIDEO
      // ════════════════════════════════════════════════════
      if (mode === "video") {
        let sendPath = tempVideo;

        if (trimRange) {
          await applyTrim(tempVideo, tempTrimV, false);
          sendPath = tempTrimV;
        }

        await wa.sendMessage(
          chatId,
          {
            video: { url: sendPath },
            mimetype: "video/mp4",
            fileName: `${safeTitle}.mp4`,
            caption: `🎬 *${finalTitle}*\n${trimRange ? `✂️ مقصوص: \`${trimRaw}\`\n` : ""}📥 تم التحميل بنجاح`,
          },
          { quoted: msg }
        );

      // ════════════════════════════════════════════════════
      // MODE: VOICE / RECORD
      // ════════════════════════════════════════════════════
      } else {
        const convertCmd =
          mode === "record"
            ? `ffmpeg -y -i "${tempVideo}" -vn -map_metadata -1 -c:a libopus -b:a 32k -ac 1 -ar 48000 -vbr on -compression_level 10 -application voip -f ogg "${tempAudio}"`
            : `ffmpeg -y -i "${tempVideo}" -vn -map_metadata -1 -c:a libmp3lame -b:a 128k -ar 44100 "${tempAudio}"`;

        await runCommand(convertCmd);

        if (!fs.existsSync(tempAudio) || fs.statSync(tempAudio).size < 1024)
          throw new Error("فشل تحويل الصوت أو لا يوجد مسار صوتي");

        let sendPath = tempAudio;

        if (trimRange) {
          await applyTrim(tempAudio, tempTrimA, true);
          sendPath = tempTrimA;
        }

        if (mode === "record") {
          await wa.sendMessage(
            chatId,
            { audio: { url: sendPath }, mimetype: "audio/ogg; codecs=opus", ptt: true },
            { quoted: msg }
          );
        } else {
          await wa.sendMessage(
            chatId,
            { audio: { url: sendPath }, mimetype: "audio/mpeg", ptt: false },
            { quoted: msg }
          );
        }
      }

      // delete thumbnail message after successful send
      if (thumbnailMsgKey) {
        try {
          await wa.sendMessage(chatId, { delete: thumbnailMsgKey });
        } catch (_) {}
      }

      await wa.react("✅");

    } catch (err) {
      console.error("YT CMD ERR:", err);
      await wa.react("⚠️");
      
      // delete thumbnail message on error too
      if (thumbnailMsgKey) {
        try {
          await wa.sendMessage(chatId, { delete: thumbnailMsgKey });
        } catch (_) {}
      }
      
      await wa.sendMessage(
        chatId,
        { text: `⚠️ خطأ:\n\`\`\`${err?.message || err}\`\`\`` },
        { quoted: msg }
      );
    } finally {
      cleanFiles(tempVideo, tempAudio, tempTrimV, tempTrimA);
    }
  },
};