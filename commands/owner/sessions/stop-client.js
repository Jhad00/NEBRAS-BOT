import { hex } from "#hexJS/index.js";
import { sendInteractiveMessage } from "../../../hexJS/wa-helpers/helpers-interactive.js";
import { config } from "../../../hexJS/assets/ass-paths.js";

export default {
  cmd: "ايقاف",
  description: "ايقاف جلسة شغالة",
  aliases: ["stop", "kill"],
  category: "جلسات",
  do: async (wa, msg, args) => {
    try {
      const chatJid = msg.key.remoteJid;
      const prefix = config.prefixes[0];
      
      // 1. if client name is provided, try to stop it directly
      const clientName = args?.[0]?.trim() || null;
      
      if (clientName) {
        const allClients = await hex.clientManager.getAllClients();
        
        if (!allClients.includes(clientName)) {
          await wa.react("📂");
          return wa.sendMessage(chatJid, { text: `❌ الجلسة "${clientName}" غير موجودة.` });
        }
        
        if (!hex.activeClients[clientName]) {
          await wa.react("⚠️");
          return wa.sendMessage(chatJid, { text: `🔴 الجلسة "${clientName}" متوقفة بالفعل.` });
        }
        
        await wa.react("🔴");
        
        const s = hex.activeClients[clientName];
        delete hex.activeClients[clientName];
        s.ev.removeAllListeners();
        s.end();
        
        return wa.sendMessage(chatJid, { text: `✅ تم إيقاف الجلسة "${clientName}" بنجاح.` });
      }
      
      // 2. no client name provided, show list of active clients
      const allClients = await hex.clientManager.getAllClients();
      
      if (allClients.length === 0) {
        await wa.react("⚠️");
        return wa.sendMessage(chatJid, { text: "❌ لا توجد جلسات مسجلة." });
      }
      
      // 3. filter active clients
      const activeClients = Object.keys(hex.activeClients || {});
      
      if (activeClients.length === 0) {
        await wa.react("⚠️");
        return wa.sendMessage(chatJid, { text: "🔴 لا توجد جلسات شغالة حالياً." });
      }
      
      await wa.react("📋");
      
      // 4. build rows for active clients
      const rows = activeClients.map(name => {
        const s = hex.activeClients[name];
        const userNumber = s.user?.id?.split(":")[0] || "غير معروف";
        const userName = s.user?.name || "بدون اسم";
        
        return {
          title: name.toUpperCase(),
          description: `🟢 نشط | 📱 +${userNumber} | 👤 ${userName}`,
          id: `${prefix}ايقاف ${name}`
        };
      });
      
      // 5. split rows into sections (max 10 per section)
      const maxRowsPerSection = 10;
      const sections = [];
      
      for (let i = 0; i < rows.length; i += maxRowsPerSection) {
        const chunk = rows.slice(i, i + maxRowsPerSection);
        sections.push({
          title: `الجلسات الشغالة ${i + 1} - ${Math.min(i + maxRowsPerSection, rows.length)}`,
          rows: chunk
        });
      }
      
      // 6. build interactive message
      const interactiveButtons = [{
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: `📋 إيقاف جلسة (${activeClients.length})`,
          sections: sections
        })
      }];
      
      // 7. send interactive message
      await sendInteractiveMessage(wa, chatJid, {
        text: `⚙️ *إيقاف جلسة*\n\n` +
              `> الجلسات الشغالة: ${activeClients.length}\n` +
              `> الجلسات المغلقة: ${allClients.length - activeClients.length}\n\n` +
              `📌 اختر الجلسة التي تريد إيقافها من القائمة أدناه:`,
        interactiveButtons
      });
      
      return wa.react("✅");
      
    } catch (error) {
      console.error("ايقاف command error:", error);
      await wa.react("⚠️");
      await wa.sendMessage(msg.key.remoteJid, {
        text: `❌ خطأ: ${error?.message || error}`
      });
    }
  }
};