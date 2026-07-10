import { sendInteractiveMessage } from "../../../hexJS/wa-helpers/helpers-interactive.js";
import { config } from "../../../hexJS/assets/ass-paths.js";

export default {
  cmd: "شات",
  description: "قفل أو فتح شات المجموعة",
  aliases: ["chat"],
  category: "مجموعات",
  do: async (wa, msg, args) => {
    try {
      const chatJid = msg.key.remoteJid;
      if (!wa.isGroup(msg)) return wa.react("⚠️");

      const action = args?.[0]?.trim() || null;
      const settings = await wa.getSettings(chatJid);
      const prefix = config.prefixes[0];

      // Handle direct actions from arguments (for interactive buttons)
      if (action === "قفل") {
        if (settings.locked) {
          return wa.react("⚠️");
        }
        await wa.react("🔒");
        return wa.setChat(chatJid, "close");
      }

      if (action === "فتح") {
        if (!settings.locked) {
          return wa.react("⚠️");
        }
        await wa.react("🔓");
        return wa.setChat(chatJid, "open");
      }

      // Show interactive menu with buttons
      const statusText = settings.locked ? "🔒 مقفل" : "🔓 مفتوح";

      const interactiveButtons = [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "🔒 قفل الشات",
            id: `${prefix}شات قفل`
          })
        },
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "🔓 فتح الشات",
            id: `${prefix}شات فتح`
          })
        }
      ];

      await sendInteractiveMessage(wa, chatJid, {
        text: `📋 *إدارة حالة الشات*\n\n` +
              `> الحالة الحالية: *${statusText}*\n` +
              `> ${settings.locked ? 'الرسائل مقيدة على المشرفين فقط' : 'الرسائل مفتوحة للجميع'}\n\n` +
              `📌 اختر الإجراء المناسب 👇`,
        interactiveButtons
      });

      return wa.react("✅");

    } catch (error) {
      console.error("شات command error:", error);
      await wa.react("⚠️");
      await wa.sendMessage(msg.key.remoteJid, {
        text: `❌ خطأ: ${error?.message || error}`
      });
    }
  }
};