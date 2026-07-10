import axios from "axios";

// Extract text after command
function extractQuery(msg) {
  const text =
    msg?.text ||
    msg?.body ||
    msg?.message?.conversation ||
    msg?.message?.extendedTextMessage?.text ||
    "";
  const parts = text.trim().split(/\s+/);
  parts.shift(); // remove command
  return parts.join(" ").trim();
}

// Search for article title
async function searchWikipedia(query, lang = "ar") {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    query
  )}&format=json`;
  const res = await axios.get(url, {
    timeout: 10000,
    headers: { "User-Agent": "NEBRAS-WikiBot/5.0" },
  });
  const results = res.data?.query?.search || [];
  if (!results.length) return null;
  return results[0].title;
}

// Get and clean article HTML
async function getCleanArticle(title, lang = "ar") {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(
    title
  )}`;
  const res = await axios.get(url, {
    timeout: 20000,
    headers: { "User-Agent": "NEBRAS-WikiBot/5.0" },
  });
  let html = res.data;

  // Remove unnecessary tags
  html = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<table[^>]*>[\s\S]*?<\/table>/gi, "")
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, "")
    .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, "")
    .replace(/<div[^>]*class="metadata"[^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<span[^>]*class="mw-editsection"[^>]*>[\s\S]*?<\/span>/gi, "")
    .replace(/<ol[^>]*>[\s\S]*?<\/ol>/gi, "")
    .replace(/<ul[^>]*>[\s\S]*?<\/ul>/gi, "");

  // Headings and paragraph formatting
  html = html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "\n\n# $1\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\n\n## $1\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "\n\n### $1\n")
    .replace(/<p[^>]*>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n");

  // Clean remaining tags and entities
  html = html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n");

  return html.trim();
}

export default {
  cmd: "ويكيبيديا",
  aliases: ["ويكي", "ويكيبي", "بيديا", "Wikipedia", "Wiki"],
  description: "يجلب المقالة الكاملة من ويكيبيديا برسالة واحدة منظمة وواضحة",
  category: "ادوات",

  do: async (wa, msg) => {
    try {
      const query = extractQuery(msg);
      const prefix = msg.prefix || ".";
      
      if (!query) {
        await wa.react("ℹ️");
        return wa.sendMessage(msg.key.remoteJid, {
          text: `📋 *ويكيبيديا*\n\nضع عنوان الموضوع بعد الأمر:\n\`${prefix}ويكيبيديا <عنوان>\`\n\nمثال:\n\`${prefix}ويكيبيديا الرياض\``
        });
      }

      await wa.react("🔎");

      // Search Arabic then English
      let title = await searchWikipedia(query, "ar");
      let lang = "ar";
      if (!title) {
        title = await searchWikipedia(query, "en");
        lang = "en";
      }

      if (!title) {
        return wa.sendMessage(msg.key.remoteJid, {
          text: `⚠️ لم أجد معلومات عن «${query}» في ويكيبيديا.`,
        });
      }

      // Get article
      const cleanText = await getCleanArticle(title, lang);
      const pageUrl = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`;

      // Padding repeated more than 10 times
      const paddingLine =
        "‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‎";
      const repeatedPadding = paddingLine.repeat(12); // 12 times for more space

      const message = `${repeatedPadding}

📌 *Search:* ${title} (${lang.toUpperCase()})

${cleanText}

🔗 *Wikipedia:* ${pageUrl}`;

      await wa.sendMessage(msg.key.remoteJid, { text: message }, { quoted: msg });
      await wa.react("✅");
    } catch (err) {
      console.error("WIKI ERROR:", err.message);
      await wa.react("⚠️");
      await wa.sendMessage(
        msg.key.remoteJid,
        { text: "⚠️ حدث خطأ أثناء جلب المقالة من ويكيبيديا." },
        { quoted: msg }
      );
    }
  },
};