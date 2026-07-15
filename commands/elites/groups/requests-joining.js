import { sendInteractiveMessage } from "../../../hexJS/wa-helpers/helpers-interactive.js";
import { config } from "../../../hexJS/assets/ass-paths.js";

export default {
  cmd: "طلبات",
  description: "عرض/قبول/رفض طلبات الانضمام",
  aliases: ["requests"],
  category: "مجموعات",
  do: async (wa, msg, args) => {
    try {
      const chatJid = msg.key.remoteJid;
      if (!wa.isGroup(msg)) return wa.react("⚠️");

      const action = args?.[0]?.trim() || null;
      const requests = await wa.requestJoin(chatJid);

      // Approve all pending requests
      if (action === "قبول") {
        if (!requests || requests.length === 0) {
          await wa.react("📭");
          return wa.sendMessage(chatJid, {
            text: "📭 *لا توجد طلبات انضمام لقبولها حالياً.*"
          }, { quoted: msg });
        }
        await wa.groupRequestParticipantsUpdate(chatJid, requests, "approve");
        return wa.react("✅");
      }

      // Reject all pending requests
      if (action === "رفض") {
        if (!requests || requests.length === 0) {
          await wa.react("📭");
          return wa.sendMessage(chatJid, {
            text: "📭 *لا توجد طلبات انضمام لرفضها حالياً.*"
          }, { quoted: msg });
        }
        await wa.groupRequestParticipantsUpdate(chatJid, requests, "reject");
        return wa.react("❌");
      }

      // Show pending requests with action buttons
      const prefix = config.prefixes[0];

      if (!requests || requests.length === 0) {
        await wa.react("📭");
        
        const metadata = await wa.fetchGroup(chatJid);
        
        const interactiveButtons = [
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "🔄 تحديث",
              id: `${prefix}طلبات`
            })
          }
        ];

        return sendInteractiveMessage(wa, chatJid, {
          text: `📭 *طلبات الانضمام*\n\n` +
                `> المجموعة: ${metadata?.subject || 'غير معروف'}\n` +
                `> 🔢 عدد الطلبات: *0*\n\n` +
                `📌 لا توجد طلبات انضمام معلقة حالياً.`,
          interactiveButtons
        });
      }

      const interactiveButtons = [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "✅ قبول الطلبات",
            id: `${prefix}طلبات قبول`
          })
        },
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "❌ رفض الطلبات",
            id: `${prefix}طلبات رفض`
          })
        }
      ];

      await sendInteractiveMessage(wa, chatJid, {
        text: `📥 *طلبات الانضمام المعلقة*\n\n` +
              `> 🔢 العدد: *${requests.length}* طلب\n\n` +
              `📌 اختر الإجراء المناسب 👇`,
        interactiveButtons
      });

      return wa.react("✅");
    } catch (error) {
      console.error("طلبات command error:", error);
      await wa.react("⚠️");
      await wa.sendMessage(msg.key.remoteJid, {
        text: `❌ خطأ: ${error?.message || error}`
      });
    }
  }
};