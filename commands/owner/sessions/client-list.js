import { hex } from "#hexJS/index.js";
import { sendInteractiveMessage } from "../../../hexJS/wa-helpers/helpers-interactive.js";
import { config } from "../../../hexJS/assets/ass-paths.js";

export default {
  cmd: "جلسات",
  description: "عرض قائمة الجلسات",
  aliases: ["clients", "sessions"],
  category: "جلسات",
  do: async (wa, msg) => {
    try {
      const chatJid = msg.key.remoteJid;
      const prefix = config.prefixes[0];

      await wa.react("📋");

      const allClients = await hex.clientManager.getAllClients();

      if (allClients.length === 0) {
        await wa.sendMessage(chatJid, { text: "❌ لا توجد جلسات مسجلة." });
        return wa.react("⚠️");
      }

      // build rows for each client
      const rows = [];
      let activeCount = 0;
      let disconnectedCount = 0;

      for (const client of allClients) {
        const isActive = hex.activeClients[client];
        
        if (isActive) {
          activeCount++;
          const s = hex.activeClients[client];
          const userNumber = s.user.id?.split(":")[0] || "غير معروف";
          const userName = s.user.name || "بدون اسم";
          
          rows.push({
            title: `${client.toUpperCase()}`,
            description: `🟢 نشط | 📱 +${userNumber} | 👤 ${userName}`,
            id: `_dummy_client_${client}`
          });
        } else {
          disconnectedCount++;
          rows.push({
            title: `${client.toUpperCase()}`,
            description: `🔴 غير نشط`,
            id: `_dummy_client_${client}`
          });
        }
      }

      // split rows into sections (max 10 per section)
      const maxRowsPerSection = 10;
      const sections = [];
      
      for (let i = 0; i < rows.length; i += maxRowsPerSection) {
        const chunk = rows.slice(i, i + maxRowsPerSection);
        sections.push({
          title: `الجلسات ${i + 1} - ${Math.min(i + maxRowsPerSection, rows.length)}`,
          rows: chunk
        });
      }

      const interactiveButtons = [{
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: `📋 قائمة الجلسات (${allClients.length})`,
          sections: sections
        })
      }];

      // send interactive message
      await sendInteractiveMessage(wa, chatJid, {
        text: `📋 *قائمة الجلسات*\n\n` +
              `> إجمالي الجلسات: ${allClients.length}\n` +
              `> 🟢 نشطة: ${activeCount}\n` +
              `> 🔴 غير نشطة: ${disconnectedCount}\n\n` +
              `📌 اختر جلسة لعرض تفاصيلها (قراءة فقط) 👇`,
        interactiveButtons
      });

      return wa.react("✅");

    } catch (error) {
      console.error("جلسات command error:", error);
      await wa.react("⚠️");
      await wa.sendMessage(msg.key.remoteJid, {
        text: `❌ خطأ: ${error?.message || error}`
      });
    }
  }
};