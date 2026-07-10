import { formatText } from "textos";
import { hex } from "#hexJS/index.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";

/**
 * Safely get text body after the command from common message shapes.
 */
const getCommandArgsText = (msg) => {
  const m = msg?.message || {};
  const text =
    m?.conversation ||
    m?.extendedTextMessage?.text ||
    m?.imageMessage?.caption ||
    m?.videoMessage?.caption ||
    m?.documentMessage?.caption ||
    "";
  return String(text || "").trim();
};

/**
 * Get default avatar SVG (exactly as in guess.js)
 */
const getDefaultAvatar = () => {
  const svgPath = path.join(process.cwd(), "src", "assets", "default-avatar.svg");
  try {
    if (fs.existsSync(svgPath)) {
      return fs.readFileSync(svgPath);
    }
  } catch (_) {}
  
  // Fallback inline SVG - same as guess.js
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="#E0E0E0" rx="50"/>
    <circle cx="200" cy="150" r="80" fill="#9E9E9E"/>
    <path d="M200 250 C120 250 50 320 50 400 L350 400 C350 320 280 250 200 250Z" fill="#9E9E9E"/>
  </svg>`);
};

/**
 * Convert SVG to PNG buffer using sharp
 */
const svgToPng = async (svgBuffer) => {
  try {
    return await sharp(svgBuffer).png().toBuffer();
  } catch (_) {
    return svgBuffer;
  }
};

export default {
  cmd: "بروفايل",
  description: "أبروفايل حساب بواتساب",
  aliases: ["profile", "bio"],
  category: "ادوات",

  do: async (wa, msg) => {
    try {
      wa.react("👤");

      const chatJid = msg?.key?.remoteJid;

      const fullText = getCommandArgsText(msg);
      const parts = fullText.split(/\s+/).filter(Boolean);
      const afterCommand = parts.slice(1).join(" ").trim();

      // Check if there's a mention or phone number
      let phone = null;
      
      // Priority 1: mentioned JID
      const mentionedJid = (() => {
        try {
          const m = msg?.message || {};
          const ctx =
            m?.extendedTextMessage?.contextInfo ||
            m?.imageMessage?.contextInfo ||
            m?.videoMessage?.contextInfo ||
            m?.documentMessage?.contextInfo ||
            m?.audioMessage?.contextInfo ||
            null;
          const arr = ctx?.mentionedJid;
          if (Array.isArray(arr) && arr.length > 0) return arr[0];
        } catch (_) {}
        return null;
      })();

      if (mentionedJid) {
        // Get phone number from mentioned JID
        const num = String(mentionedJid).split("@")[0];
        phone = num.replace(/^\+/, "");
      } else if (afterCommand) {
        // Priority 2: phone number from text
        const raw = String(afterCommand).trim();
        phone = raw.replace(/[^\d]/g, "");
      } else {
        // Priority 3: self
        const selfJid =
          wa?.user?.id ||
          wa?.sock?.user?.id ||
          wa?.client?.user?.id ||
          msg?.key?.participant ||
          msg?.participant ||
          null;
        
        if (selfJid) {
          const num = String(selfJid).split("@")[0];
          phone = num.replace(/^\+/, "");
        }
      }

      if (!chatJid || !phone) {
        wa.react("⚠️");
        await wa.sendMessage(
          chatJid,
          {
            text: "الرجاء الرد على رسالة شخص أو إرسال رقم هاتف للتحقق."
          },
          { quoted: msg }
        );
        return;
      }

      // Check if number exists on WhatsApp using the same method as guess.js
      const [waStatus] = await wa.onWhatsApp(phone);
      
      if (!waStatus || !waStatus.exists) {
        // Case: Number doesn't have WhatsApp
        const defaultAvatar = await svgToPng(getDefaultAvatar());
        const formattedNumber = `+${phone}`;
        
        await wa.sendMessage(
          chatJid,
          {
            image: defaultAvatar,
            caption: `❌ *الرقم:* ${formattedNumber}\n*الحالة:* ليس لديه حساب على واتساب.`
          },
          { quoted: msg }
        );
        
        wa.react("❌");
        return;
      }

      // Case: Number has WhatsApp account
      const jid = waStatus.jid;
      const formattedNumber = `+${phone}`;
      
      // Extract LID from waStatus - ONLY from the LID field, NOT from JID
      let lid = "غير متوفر";
      
      // Check if waStatus has a lid property directly
      if (waStatus.lid) {
        // Remove "@lid" suffix if present
        lid = String(waStatus.lid).replace(/@lid$/, "");
      }
      // Some implementations might have it as waStatus.id or waStatus.userId
      else if (waStatus.id && String(waStatus.id).includes("@lid")) {
        lid = String(waStatus.id).replace(/@lid$/, "");
      }
      // Do NOT use waStatus.jid or phone number as fallback

      // Get profile picture using same method as guess.js
      let pfpUrl = null;
      let hasPic = false;
      
      try {
        pfpUrl = await wa.profilePictureUrl(jid, "image");
        if (pfpUrl) hasPic = true;
      } catch (_) {
        hasPic = false;
      }

      // Build caption with mention (same format as guess.js)
      let statusText = "مسجل بواتساب";
      let caption = `✅ *الحالة:* ${statusText}\n`;
      caption += `👤 *الحساب:* @${phone}\n`;
      caption += `🆔 *المعرف (LID):* ${lid}\n`;
      
      if (hasPic) {
        caption += `🖼️ *الصورة الشخصية:* موجودة`;
      } else {
        caption += `🖼️ *الصورة الشخصية:* لا يملك (أو مخفية لخصوصيته)`;
      }

      // Send profile picture or default avatar
      let imageToSend;
      if (hasPic && pfpUrl) {
        // Download the image from URL
        try {
          const response = await fetch(pfpUrl);
          const buffer = await response.arrayBuffer();
          imageToSend = Buffer.from(buffer);
        } catch (_) {
          imageToSend = await svgToPng(getDefaultAvatar());
        }
      } else {
        imageToSend = await svgToPng(getDefaultAvatar());
      }
      
      await wa.sendMessage(
        chatJid,
        {
          image: imageToSend,
          caption: caption,
          mentions: [jid]
        },
        { quoted: msg }
      );

      wa.react("✅");
    } catch (err) {
      console.error("PROFILE ICON ERROR:", err);

      try {
        wa.react("⚠️");
      } catch (_) {}

      try {
        await wa.sendMessage(
          msg?.key?.remoteJid,
          { text: "حدث خطأ أثناء جلب معلومات الحساب.\n" + String(err) },
          { quoted: msg }
        );
      } catch (e) {
        console.error("FAILED TO SEND ERROR MESSAGE:", e);
      }
    }
  },
};