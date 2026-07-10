import { formatText } from "textos";
import { config } from "../../../hexJS/assets/ass-paths.js";
import { getDevLids } from "../../../hexJS/assets/ass-vars.js";

export default {
  cmd: "نخبة_اضف",
  description: "اضافة عضو الى نظام النخبة",
  aliases: ["elite_add", "منح_النخبة", "رفع_نخبة"],
  category: "نخبة",
  do: async (wa, msg, args) => {
    try {
      const chatJid = msg.key.remoteJid;
      const prefix = msg.prefix || ".";
      const isGroup = await wa.isGroup(msg);

      // random responses for dev addition attempts
      const devResponses = [
        { emoji: "🤨", text: "يالك من وقح" },
        { emoji: "🧐", text: "أمازحٌ انت أم جاد" },
        { emoji: "🫠", text: "يا لك من عبقري" },
        { emoji: "😏", text: "حاولت وفشلت" },
        { emoji: "🙄", text: "ترا المطور ما يحتاج نخبة" },
        { emoji: "🤣", text: "ضحكتني والله" },
        { emoji: "😅", text: "أظنك نسيت من أنا" },
        { emoji: "🥱", text: "ملينا من محاولاتك" },
        { emoji: "😎", text: "المطور فوق النخبة" },
        { emoji: "🤦", text: "يا رجل لاتسوي نفسك غبي" },
        { emoji: "💀", text: "روح نام احسن لك" },
        { emoji: "🔥", text: "حاول مرة ثانية بس ما رح تنجح" }
      ];

      // get random response
      const randomResponse = devResponses[Math.floor(Math.random() * devResponses.length)];

      // helper: check if a lid belongs to a developer using local storage
      const isDevJid = (lid) => {
        const devLids = getDevLids();
        return devLids.includes(lid);
      };

      // resolve invoker identity once, needed to detect "dev adding himself" case
      const senderJid = msg.key.participant || msg.key.remoteJid;
      const senderLid = (await wa.signalRepository.lidMapping.getLIDForPN(senderJid)) || senderJid;

      // pick the right reply: mock random response, or the self-aware one if the dev targets himself
      const pickDevResponse = (target) => {
        const isSelfAttempt = target === senderJid || target === senderLid;
        return isSelfAttempt
          ? { emoji: "🫠", text: "هل نسيت من تكون 🫠" }
          : randomResponse;
      };

      // 1. check for mentioned user (Priority 1)
      const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
      if (mentionedJids && mentionedJids.length > 0) {
        const jid = mentionedJids[0]; // take the first mentioned user
        const phone = jid.split("@")[0];
        
        // resolve lid straight from signal repo, no pre-check call anymore
        let lid = await wa.signalRepository.lidMapping.getLIDForPN(jid);
        if (!lid) lid = jid;
        
        // check if dev, against the resolved lid not the raw pn jid
        if (isDevJid(lid)) {
          const devResp = pickDevResponse(lid);
          await wa.react(devResp.emoji);
          return wa.sendMessage(chatJid, { 
            text: devResp.text,
            mentions: [jid]
          });
        }
        
        const result = await wa.addElite([lid]);
        if (result && result[0]?.message === "Already exists") {
          await wa.react("ℹ️");
          return wa.sendMessage(chatJid, { 
            text: `ℹ️ @${phone} موجود بالفعل في قائمة النخبة.`,
            mentions: [jid]
          });
        }
        if (result && result[0]?.success) {
          await wa.react("✅");
          return wa.sendMessage(chatJid, { 
            text: `👑 تمت إضافة @${phone} إلى قائمة النخبة بنجاح.`,
            mentions: [jid]
          });
        }
        await wa.react("⚠️");
        return wa.sendMessage(chatJid, { text: "❌ فشل إضافة العضو." });
      }

      // 2. check if user provided a phone number as argument
      const rawArg = args?.join("") || "";
      const phoneMatch = rawArg.match(/\+?(\d{8,15})/);
      
      if (phoneMatch) {
        const phone = phoneMatch[1];
        const pnJid = `${phone}@s.whatsapp.net`;
        
        // resolve lid straight from signal repo, no existence pre-check anymore
        let lid = await wa.signalRepository.lidMapping.getLIDForPN(pnJid);
        if (!lid) lid = pnJid;
        
        // check if dev
        if (isDevJid(lid)) {
          const devResp = pickDevResponse(lid);
          await wa.react(devResp.emoji);
          return wa.sendMessage(chatJid, { 
            text: devResp.text
          });
        }
        
        const result = await wa.addElite([lid]);
        if (result && result[0]?.message === "Already exists") {
          await wa.react("ℹ️");
          return wa.sendMessage(chatJid, { 
            text: `ℹ️ +${phone} موجود بالفعل في قائمة النخبة.` 
          });
        }
        if (result && result[0]?.success) {
          await wa.react("✅");
          return wa.sendMessage(chatJid, { 
            text: `👑 تمت إضافة +${phone} إلى قائمة النخبة بنجاح.` 
          });
        }
        await wa.react("⚠️");
        return wa.sendMessage(chatJid, { text: "❌ فشل إضافة العضو." });
      }

      // 3. check for replied user
      const replyed = await wa.replyedJid(msg);
      if (replyed && replyed.length > 0) {
        const jid = replyed[0];
        const phone = jid.split("@")[0];
        
        // resolve lid straight from signal repo, no pre-check call anymore
        let lid = await wa.signalRepository.lidMapping.getLIDForPN(jid);
        if (!lid) lid = jid;
        
        // check if dev, against the resolved lid not the raw pn jid
        if (isDevJid(lid)) {
          const devResp = pickDevResponse(lid);
          await wa.react(devResp.emoji);
          return wa.sendMessage(chatJid, { 
            text: devResp.text,
            mentions: [jid]
          });
        }
        
        const result = await wa.addElite([lid]);
        if (result && result[0]?.message === "Already exists") {
          await wa.react("ℹ️");
          return wa.sendMessage(chatJid, { 
            text: `ℹ️ @${phone} موجود بالفعل في قائمة النخبة.`,
            mentions: [jid]
          });
        }
        if (result && result[0]?.success) {
          await wa.react("✅");
          return wa.sendMessage(chatJid, { 
            text: `👑 تمت إضافة @${phone} إلى قائمة النخبة بنجاح.`,
            mentions: [jid]
          });
        }
        await wa.react("⚠️");
        return wa.sendMessage(chatJid, { text: "❌ فشل إضافة العضو." });
      }

      // 4. if private chat with bot, add the user directly
      if (!isGroup) {
        const jid = chatJid;
        const phone = jid.split("@")[0];
        
        // resolve lid straight from signal repo, no pre-check call anymore
        let lid = await wa.signalRepository.lidMapping.getLIDForPN(jid);
        if (!lid) lid = jid;
        
        // check if dev, against the resolved lid not the raw pn jid
        if (isDevJid(lid)) {
          const devResp = pickDevResponse(lid);
          await wa.react(devResp.emoji);
          return wa.sendMessage(chatJid, { 
            text: devResp.text,
            mentions: [jid]
          });
        }
        
        const result = await wa.addElite([lid]);
        if (result && result[0]?.message === "Already exists") {
          await wa.react("ℹ️");
          return wa.sendMessage(chatJid, { 
            text: `ℹ️ @${phone} موجود بالفعل في قائمة النخبة.`,
            mentions: [jid]
          });
        }
        if (result && result[0]?.success) {
          await wa.react("✅");
          return wa.sendMessage(chatJid, { 
            text: `👑 تمت إضافة @${phone} إلى قائمة النخبة بنجاح.`,
            mentions: [jid]
          });
        }
        await wa.react("⚠️");
        return wa.sendMessage(chatJid, { text: "❌ فشل إضافة العضو." });
      }

      // 5. if in group with no specific target, show help message
      if (isGroup) {
        await wa.react("👑");
        
        const metadata = await wa.fetchGroup(chatJid);
        const participants = metadata?.participants?.length || 0;
        const currentElite = await wa.elites() || [];
        const eliteCount = currentElite.length;

        const helpText = 
`👑 *رفع إلى النخبة*

> المجموعة: ${metadata?.subject || 'غير معروف'}
> الأعضاء: ${participants}
> النخبة حالياً: ${eliteCount}

📌 *طرق الإضافة:*
• رد على رسالة العضو بـ \`${prefix}نخبة_اضف\`
• اكتب: \`${prefix}نخبة_اضف +123456789\`
• منشن العضو: \`${prefix}نخبة_اضف @محمد\`
• في الخاص: استخدم الأمر بدون وسائط لإضافة نفسك`;

        return wa.sendMessage(chatJid, { text: helpText });
      }

      // 6. fallback: no valid input
      await wa.react("⚠️");
      return wa.sendMessage(chatJid, { 
        text: `⚠️ *طريقة الاستخدام:*\n\n` +
              `• \`${prefix}نخبة_اضف +123456789\` - برقم الهاتف\n` +
              `• منشن العضو: \`${prefix}نخبة_اضف @محمد\`\n` +
              `• رد على رسالة العضو بـ \`${prefix}نخبة_اضف\`\n` +
              `• في الخاص: استخدم الأمر بدون وسائط لإضافة نفسك`
      });

    } catch (error) {
      console.error("نخبة_اضف error:", error);
      await wa.react("⚠️");
      await wa.sendMessage(msg.key.remoteJid, {
        text: `❌ خطأ: ${error?.message || error}`
      });
    }
  }
};
