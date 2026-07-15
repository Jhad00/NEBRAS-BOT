import { fbdl } from "ruhend-scraper";
import axios from "axios";
import https from "https";

export default {
  cmd: "فيس",
  description: "تحميل فيديو فيسبوك",
  aliases: ["facebook", "fb", "face"],
  category: "تحميل",

  do: async (wa, msg, args) => {
    const text = args.join(" ").trim();
    if (!text) {
      await wa.react("ℹ️");
      const prefix = msg.prefix || ".";
      return wa.sendMessage(
        msg.key.remoteJid,
        { text: `📋 *تحميل فيسبوك*\n\nضع رابط بعد الأمر:\n\`${prefix}فيس <رابط>\`` },
        { quoted: msg }
      );
    }

    const urlMatch = text.match(/(https?:\/\/(?:www\.)?(?:facebook\.com|fb\.watch|fb\.com|m\.facebook\.com)\/[^\s]+)/i);
    const url = urlMatch ? urlMatch[0] : null;

    if (!url) {
      await wa.react("⚠️");
      return await wa.sendMessage(
        msg.key.remoteJid,
        { text: "⚠️ يرجى إرسال رابط فيسبوك صحيح." },
        { quoted: msg }
      );
    }

    await wa.react("⏳");

    try {
      let res;
      try {
        res = await fbdl(url);
      } catch (scraperErr) {
        throw new Error(`Scraper API Error: ${scraperErr.message || "Failed to extract link"}`);
      }

      if (!res?.status || !res?.data || res.data.length === 0) {
        throw new Error("لم يتم العثور على بيانات. قد يكون الفيديو خاصاً أو محذوفاً.");
      }

      const agent = new https.Agent({
        rejectUnauthorized: false
      });

      let sent = false;

      for (let media of res.data) {
        const mediaUrl = media?.url;
        if (!mediaUrl) continue;

        try {
          const response = await axios.get(mediaUrl, {
            responseType: 'arraybuffer',
            httpsAgent: agent,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
              'Referer': 'https://www.facebook.com/',
              'Connection': 'keep-alive'
            }
          });
          const mediaBuffer = Buffer.from(response.data);

          await wa.sendMessage(
            msg.key.remoteJid,
            {
              video: mediaBuffer,
              mimetype: "video/mp4",
              caption: "📥 *تم التحميل بنجاح*"
            },
            { quoted: msg }
          );
          sent = true;
        } catch (downloadErr) {
          console.error("FB media skip:", downloadErr.message);
        }
      }

      if (!sent) {
        throw new Error("تعذر تحميل الفيديو من الخوادم.");
      }

      await wa.react("✅");

    } catch (err) {
      console.error("FB CMD ERR:", err);
      await wa.react("⚠️");

      await wa.sendMessage(
        msg.key.remoteJid,
        { text: `⚠️ خطأ أثناء المعالجة:\n\n\`\`\`${err?.message || err}\`\`\`` },
        { quoted: msg }
      );
    }
  }
};
