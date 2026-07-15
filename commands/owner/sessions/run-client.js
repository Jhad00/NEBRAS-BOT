import { hex } from "#hexJS/index.js";
import { sendInteractiveMessage } from "../../../hexJS/wa-helpers/helpers-interactive.js";
import { config } from "../../../hexJS/assets/ass-paths.js";

export default {
  cmd: "تشغيل",
  description: "تشغيل جلسة متاحة",
  aliases: ["run", "start"],
  category: "جلسات",
  do: async (wa, msg, args) => {
    try {
      const chatJid = msg.key.remoteJid;
      const prefix = config.prefixes[0];
      
      // 1. if client name is provided, try to start it directly
      const clientName = args?.[0]?.trim() || null;
      
      if (clientName) {
        const allClients = await hex.clientManager.getAllClients();
        
        if (!allClients.includes(clientName)) {
          await wa.react("📂");
          return wa.sendMessage(chatJid, { text: `❌ الجلسة "${clientName}" غير موجودة.` });
        }
        
        if (hex.activeClients[clientName]) {
          await wa.react("⚠️");
          return wa.sendMessage(chatJid, { text: `🟢 الجلسة "${clientName}" شغالة بالفعل.` });
        }
        
        await wa.react("🟢");
        await wa.sendMessage(chatJid, { text: `⏳ جاري تشغيل الجلسة "${clientName}"...` });
        return hex.initClient(clientName);
      }
      
      // 2. no client name provided, show list of inactive clients
      const allClients = await hex.clientManager.getAllClients();
      
      if (allClients.length === 0) {
        await wa.react("⚠️");
        return wa.sendMessage(chatJid, { text: "❌ لا توجد جلسات مسجلة." });
      }
      
      // 3. filter inactive clients
      const inactiveClients = allClients.filter(name => !hex.activeClients[name]);
      
      if (inactiveClients.length === 0) {
        await wa.react("⚠️");
        return wa.sendMessage(chatJid, { text: "✅ جميع الجلسات شغالة حالياً." });
      }
      
      await wa.react("📋");
      
      // 4. build rows for inactive clients
      const rows = inactiveClients.map(name => ({
        title: name.toUpperCase(),
        description: `🔴 غير نشط - اضغط للتشغيل`,
        id: `${prefix}تشغيل ${name}`
      }));
      
      // 5. split rows into sections (max 10 per section)
      const maxRowsPerSection = 10;
      const sections = [];
      
      for (let i = 0; i < rows.length; i += maxRowsPerSection) {
        const chunk = rows.slice(i, i + maxRowsPerSection);
        sections.push({
          title: `الجلسات المغلقة ${i + 1} - ${Math.min(i + maxRowsPerSection, rows.length)}`,
          rows: chunk
        });
      }
      
      // 6. build interactive message
      const interactiveButtons = [{
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: `📋 تشغيل جلسة (${inactiveClients.length})`,
          sections: sections
        })
      }];
      
      // 7. send interactive message
      await sendInteractiveMessage(wa, chatJid, {
        text: `⚙️ *تشغيل جلسة*\n\n` +
              `> الجلسات المغلقة: ${inactiveClients.length}\n` +
              `> الجلسات النشطة: ${allClients.length - inactiveClients.length}\n\n` +
              `📌 اختر الجلسة التي تريد تشغيلها من القائمة أدناه:`,
        interactiveButtons
      });
      
      return wa.react("✅");
      
    } catch (error) {
      console.error("تشغيل command error:", error);
      await wa.react("⚠️");
      await wa.sendMessage(msg.key.remoteJid, {
        text: `❌ خطأ: ${error?.message || error}`
      });
    }
  }
};