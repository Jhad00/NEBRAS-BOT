import { getGlobalSettings, saveGlobalSettings, currentClient_user } from "../../../hexJS/assets/ass-index.js";
import { sendInteractiveMessage } from "../../../hexJS/wa-helpers/helpers-interactive.js";
import { config } from "../../../hexJS/assets/ass-paths.js";

export default {
  cmd: "الكل",
  description: "قفل أو فتح أوامر العامة للمطور فقط",
  aliases: ["everyone", "عام"],
  category: "ادارة",
  // only this command lets the bot itself bypass owner-tier, even without a dev lid
  selfOverride: true,
  
  do: async (wa, msg, args) => {
    try {
      const chatJid = msg.key.remoteJid;
      const prefix = config.prefixes[0];
      const clientName = wa.clientName;
      const currentSettings = getGlobalSettings(clientName);
      const currentState = currentSettings.everyoneTierOpen;

      // 1. check if action is passed as argument (for direct use)
      const action = args?.[0]?.trim() || null;

      // 2. if action is provided, handle it directly (backward compatibility)
      if (action === "قفل") {
        if (!currentState) {
          await wa.react("⚠️");
          return wa.sendMessage(chatJid, { 
            text: "⚠️ أوامر العامة مقفلة بالفعل." 
          }, { quoted: msg });
        }
        
        currentSettings.everyoneTierOpen = false;
        saveGlobalSettings(clientName, currentSettings);
        await wa.react("🔒");
        return wa.sendMessage(chatJid, { 
          text: "🔒 *تم قفل أوامر العامة.*\nالآن المطور فقط من يمكنه استخدام أوامر قسم العامة" 
        }, { quoted: msg });
      }

      if (action === "فتح") {
        if (currentState) {
          await wa.react("⚠️");
          return wa.sendMessage(chatJid, { 
            text: "⚠️ أوامر العامة مفتوحة بالفعل." 
          }, { quoted: msg });
        }
        
        currentSettings.everyoneTierOpen = true;
        saveGlobalSettings(clientName, currentSettings);
        await wa.react("🔓");
        return wa.sendMessage(chatJid, { 
          text: "🔓 *تم فتح أوامر العامة.*\nالآن يمكن لجميع المستخدمين استخدامها." 
        }, { quoted: msg });
      }

      // 3. if no action, show interactive menu
      await wa.react("⚙️");

      // Build current status indicator
      const statusText = currentState ? "🟢 مفتوحة" : "🔴 مقفلة";
      const statusEmoji = currentState ? "🔓" : "🔒";

      // Build rows for interactive list
      const rows = [
        {
          title: "🔓 فتح الأوامر",
          description: currentState ? "✓ مفتوحة حالياً" : "فتح أوامر العامة للجميع",
          id: `${prefix}الكل فتح`
        },
        {
          title: "🔒 قفل الأوامر",
          description: currentState ? "قفل أوامر العامة للمطور فقط" : "✓ مقفلة حالياً",
          id: `${prefix}الكل قفل`
        }
      ];

      const interactiveButtons = [{
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: `⚙️ إدارة أوامر العامة`,
          sections: [{
            title: `الحالة الحالية: ${statusText}`,
            rows: rows
          }]
        })
      }];

      await sendInteractiveMessage(wa, chatJid, {
        text: `📋 *التحكم بأوامر العامة*\n\n` +
              `> الحالة الحالية: ${statusEmoji} ${statusText}\n` +
              `> ${currentState ? 'الجميع يستطيعون استخدام أوامر العامة' : 'المطور فقط من يستطيع استخدام أوامر العامة'}\n\n` +
              `📌 اختر الإجراء المطلوب من القائمة أدناه:`,
        interactiveButtons
      });

      return wa.react("✅");

    } catch (error) {
      console.error("الكل command error:", error);
      await wa.react("⚠️");
      await wa.sendMessage(msg.key.remoteJid, {
        text: `❌ خطأ: ${error?.message || error}`
      });
    }
  }
};