import { hex } from "#hexJS/index.js";
import { sendInteractiveMessage } from "../../../hexJS/wa-helpers/helpers-interactive.js";
import { config } from "../../../hexJS/assets/ass-paths.js";
import { isBotAdmin, getGroupsAdminStatus } from "../../../hexJS/wa-helpers/helpers.groups.js";

// removed - groups stored in RAM only, not persisted

// get active client instance by name
function getActiveClient(clientName) {
  return hex.activeClients[clientName] || null;
}

// collect all active client names
function getActiveClientNames() {
  return Object.keys(hex.activeClients || {});
}

// collect all clients (active + inactive)
async function getAllClientNames() {
  return await hex.clientManager.getAllClients() || [];
}

export default {
  cmd: "مجموعات",
  description: "عرض المجموعات التي يشارك فيها البوت",
  aliases: ["groups", "گروبات"],
  category: "ادارة",
  do: async (wa, msg, args, botId) => {
    try {
      const chatJid = msg.key.remoteJid;
      const prefix = config.prefixes[0];

      // 1. get list of all clients (including inactive)
      const allClients = await getAllClientNames();
      
      if (allClients.length === 0) {
        await wa.sendMessage(chatJid, { text: "❌ لا توجد جلسات مسجلة حالياً." });
        return wa.react("⚠️");
      }

      // 2. get list of active clients
      const activeClients = getActiveClientNames();
      
      if (activeClients.length === 0) {
        await wa.sendMessage(chatJid, { text: "❌ لا توجد جلسات نشطة حالياً. استخدم أمر التشغيل أولاً." });
        return wa.react("⚠️");
      }

      // 3. if a client name was passed as argument, use it directly
      let targetClientName = args?.[0]?.trim() || null;

      // 4. check if arg is filter (admin) and not a client name
      const keywords = ["admin", "ادمن"];
      const isFilterArg = targetClientName && keywords.includes(targetClientName);
      
      // if the argument is a filter, clear it from targetClientName
      let filterAdmin = false;
      if (isFilterArg) {
        filterAdmin = true;
        targetClientName = null;
      }

      // 5. if no target, check if we have multiple clients
      if (!targetClientName && activeClients.length > 1) {
        const rows = activeClients.map(name => ({
          title: name.toUpperCase(),
          description: `🟢 نشط`,
          id: `${prefix}مجموعات ${name}`
        }));

        const interactiveButtons = [{
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: "اختر الجلسة",
            sections: [{ title: "الجلسات النشطة", rows }]
          })
        }];

        await sendInteractiveMessage(wa, chatJid, {
          text: "📱 اختر الجلسة التي تريد عرض مجموعاتها:",
          interactiveButtons
        });

        return wa.react("📌");
      }

      // 6. if no argument and only one active client, use that one
      if (!targetClientName && activeClients.length === 1) {
        targetClientName = activeClients[0];
      }

      // 7. if still no target, ask user to choose
      if (!targetClientName) {
        const rows = activeClients.map(name => ({
          title: name.toUpperCase(),
          description: `🟢 نشط`,
          id: `${prefix}مجموعات ${name}`
        }));

        const interactiveButtons = [{
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: "اختر الجلسة",
            sections: [{ title: "الجلسات النشطة", rows }]
          })
        }];

        await sendInteractiveMessage(wa, chatJid, {
          text: "📱 اختر الجلسة التي تريد عرض مجموعاتها:",
          interactiveButtons
        });

        return wa.react("📌");
      }

      // 8. check if client exists
      if (!allClients.includes(targetClientName)) {
        await wa.sendMessage(chatJid, { text: `❌ الجلسة "${targetClientName}" غير موجودة.` });
        return wa.react("⚠️");
      }

      // 9. get target client (check if active)
      let targetClient = getActiveClient(targetClientName);
      
      // 10. if client is not active, try to initialize it
      if (!targetClient) {
        await wa.sendMessage(chatJid, { 
          text: `⏳ الجلسة "${targetClientName}" غير نشطة. جاري تشغيلها...` 
        });
        
        try {
          await hex.initClient(targetClientName);
          await new Promise(r => setTimeout(r, 3000));
          targetClient = getActiveClient(targetClientName);
          
          if (!targetClient) {
            await wa.sendMessage(chatJid, { 
              text: `❌ فشل تشغيل الجلسة "${targetClientName}".\nيرجى المحاولة يدوياً باستخدام أمر التشغيل.` 
            });
            return wa.react("⚠️");
          }
          
          await wa.sendMessage(chatJid, { 
            text: `✅ تم تشغيل الجلسة "${targetClientName}" بنجاح.` 
          });
        } catch (err) {
          await wa.sendMessage(chatJid, { 
            text: `❌ فشل تشغيل الجلسة "${targetClientName}":\n${err?.message || err}` 
          });
          return wa.react("❌");
        }
      }

      // 11. if filterAdmin was not set from args, check args again
      if (!filterAdmin && args?.[0]) {
        const arg = args[0].trim();
        if (keywords.includes(arg)) {
          filterAdmin = true;
        }
      }

      // 12. fetch groups for this client
      if (typeof targetClient.groupFetchAllParticipating !== "function") {
        await wa.sendMessage(chatJid, { text: `❌ الجلسة "${targetClientName}" لا تدعم جلب المجموعات.` });
        return wa.react("❌");
      }

      const groups = Object.values(await targetClient.groupFetchAllParticipating());

      if (!groups || groups.length === 0) {
        await wa.react("0️⃣");
        return wa.sendMessage(chatJid, { text: `📭 لا توجد مجموعات في الجلسة "${targetClientName}".` });
      }

      await wa.react("🏁");

      // 13. Get admin status for all groups
      const adminStatus = await getGroupsAdminStatus(groups, { waClient: targetClient });

      // 14. Build rows from groups in memory
      const rows = groups
        .map((group, idx) => {
          const groupId = group.id;
          const isAdmin = adminStatus[groupId] || false;

          // skip non-admin groups if filter is active
          if (filterAdmin && !isAdmin) return null;

          let description = `👥 ${group.size || group.participants?.length || '?'} عضو`;
          if (!filterAdmin) {
            description += ` | ${isAdmin ? '👑 مشرف' : '👤 عضو'}`;
          }

          return {
            title: group.subject || `مجموعة ${idx + 1}`,
            description: description,
            id: `_dummy_${idx + 1}`
          };
        })
        .filter(row => row !== null);

      // 16. check if any rows after filtering
      if (rows.length === 0) {
        await wa.react("⚠️");
        return wa.sendMessage(chatJid, { 
          text: filterAdmin 
            ? `⚠️ لا توجد مجموعات تملك صلاحية المشرف فيها في الجلسة "${targetClientName}".` 
            : `⚠️ لا توجد مجموعات لعرضها في الجلسة "${targetClientName}".`
        });
      }

      // 17. split rows into sections (max 10 per section)
      const maxRowsPerSection = 10;
      const sections = [];
      
      for (let i = 0; i < rows.length; i += maxRowsPerSection) {
        const chunk = rows.slice(i, i + maxRowsPerSection);
        sections.push({
          title: `المجموعات ${i + 1} - ${Math.min(i + maxRowsPerSection, rows.length)}`,
          rows: chunk
        });
      }

      // 18. build interactive message
      const interactiveButtons = [{
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: `📋 قائمة المجموعات (${rows.length})`,
          sections: sections
        })
      }];

      // 19. send interactive message
      const filterText = filterAdmin ? '\n> 🔍 تصفية: المشرف فقط' : '';
      await sendInteractiveMessage(wa, chatJid, {
        text: `📋 *قائمة المجموعات*\n\n` +
              `> الجلسة: ${targetClientName.toUpperCase()}\n` +
              `> عدد المجموعات: ${rows.length}\n` +
              filterText +
              `\n\n📌 اختر مجموعة لعرض تفاصيلها (قراءة فقط) 👇`,
        interactiveButtons
      });

      return wa.react("✅");

    } catch (error) {
      console.error("مجموعات command error:", error);
      await wa.react("⚠️");
      await wa.sendMessage(msg.key.remoteJid, {
        text: `❌ خطأ: ${error?.message || error}`
      });
    }
  }
};