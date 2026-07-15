import { igdl } from "ruhend-scraper";
import axios from "axios";
import https from "https";

export default {
  cmd: "انستا",
  description: "تحميل ريلز انستغرام",
  aliases: ["insta", "ig"],
  category: "تحميل",

  do: async (wa, msg, args) => {
    // 1. check if args empty -> show help
    const text = args.join(" ").trim();
    if (!text) {
      await wa.react("ℹ️");
      const prefix = msg.prefix || ".";
      return wa.sendMessage(
        msg.key.remoteJid,
        { text: `📋 *تحميل انستغرام*\n\nضع رابط بعد الأمر:\n\`${prefix}انستا <رابط>\`` },
        { quoted: msg }
      );
    }

    // 2. extract url
    const urlMatch = text.match(/(https?:\/\/(?:www\.)?instagram\.com\/(?:reel|reels|p|tv)\/[^\s/?]+)/i);
    const url = urlMatch ? urlMatch[0] : null;

    if (!url) {
      await wa.react("⚠️");
      return await wa.sendMessage(
        msg.key.remoteJid,
        { text: "⚠️ يرجى إرسال رابط انستغرام صحيح." },
        { quoted: msg }
      );
    }

    await wa.react("⏳");

    try {
      const isReel = url.includes('/reel/') || url.includes('/reels/') || url.includes('/tv/');

      // 3. Extract media links via ruhend-scraper
      let res;
      try {
        res = await igdl(url);
      } catch (scraperErr) {
        throw new Error(`Scraper API Error: ${scraperErr.message || "Failed to extract link"}`);
      }

      const data = res?.data; 
      if (!data || data.length === 0) {
        throw new Error("لم يتم العثور على بيانات. قد يكون الحساب خاصاً أو الفيديو محذوفاً.");
      }

      // 4. custom https agent to bypass strict SSL checks
      const agent = new https.Agent({  
        rejectUnauthorized: false
      });

      // 5. process and dispatch payloads
      for (let media of data) {
        const mediaUrl = media.url; 
        let mediaBuffer;
        let contentType = '';

        // fetch raw buffer via axios with FULL browser headers to prevent 400/403 errors
        try {
          const response = await axios.get(mediaUrl, { 
            responseType: 'arraybuffer',
            httpsAgent: agent,
            headers: { 
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
              'Referer': 'https://www.instagram.com/',
              'Connection': 'keep-alive'
            }
          });
          mediaBuffer = Buffer.from(response.data);
          contentType = response.headers['content-type'] || '';
        } catch (downloadErr) {
           throw new Error(`CDN Download Error: ${downloadErr.message || downloadErr}`);
        }

        // 6. force content type logic
        const forceVideo = isReel || mediaUrl.includes('.mp4') || contentType.includes('video');

        // 7. dispatch to Baileys
        if (forceVideo) {
          await wa.sendMessage(
            msg.key.remoteJid,
            { 
              video: mediaBuffer, 
              mimetype: "video/mp4", 
              caption: "📥 *تم التحميل بنجاح*" 
            },
            { quoted: msg }
          );
        } else {
          await wa.sendMessage(
            msg.key.remoteJid,
            { 
              image: mediaBuffer, 
              mimetype: "image/jpeg", 
              caption: "📥 *تم التحميل بنجاح*" 
            },
            { quoted: msg }
          );
        }
      }

      await wa.react("✅");

    } catch (err) {
      console.error("IG CMD ERR:", err);
      await wa.react("⚠️");
      
      // return clean error to the user based on where it failed
      await wa.sendMessage(
        msg.key.remoteJid,
        { text: `⚠️ خطأ أثناء المعالجة:\n\n\`\`\`${err?.message || err}\`\`\`` },
        { quoted: msg }
      );
    }
  }
};