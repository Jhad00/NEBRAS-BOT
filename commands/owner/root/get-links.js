import { HarmDB, HarmManager } from "harm32-js";
import { hex } from "#hexJS/index.js";
import { sendInteractiveMessage } from "../../../hexJS/wa-helpers/helpers-interactive.js";
import { config } from "../../../hexJS/assets/ass-paths.js";
import { getGroupsAdminStatus } from "../../../hexJS/wa-helpers/helpers.groups.js";

const manager = new HarmManager();

function normalizePhone(v) {
  return (v || "").toString().replace(/\D/g, "");
}

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

// Main command
export default {
  cmd: "رابط",
  description: "احصل على رابط دعوة لمجموعة محددة",
  aliases: ["url", "link"],
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
      
      // 3. if a client name was passed as argument, use it directly
      let targetClientName = args?.[0]?.trim() || null;

      // 4. if no argument and only one active client, use that one
      if (!targetClientName && activeClients.length === 1) {
        targetClientName = activeClients[0];
      }

      // 5. if still no target, ask user to choose a client (interactive)
      if (!targetClientName) {
        const rows = allClients.map(name => {
          const isActive = activeClients.includes(name);
          return {
            title: name.toUpperCase(),
            description: isActive ? "🟢 نشط" : "🔴 غير نشط",
            id: `${prefix}رابط ${name}`
          };
        });

        const interactiveButtons = [{
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: "اختر الجلسة",
            sections: [{ title: "الجلسات المتاحة", rows }]
          })
        }];

        await sendInteractiveMessage(wa, chatJid, {
          text: "📱 اختر الجلسة التي تريد الحصول على رابط مجموعة منها:",
          interactiveButtons
        });

        return wa.react("📌");
      }

      // 6. check if client exists
      if (!allClients.includes(targetClientName)) {
        await wa.sendMessage(chatJid, { text: `❌ الجلسة "${targetClientName}" غير موجودة.` });
        return wa.react("⚠️");
      }

      // 7. get target client (check if active)
      let targetClient = getActiveClient(targetClientName);
      
      // 8. if client is not active, try to initialize it
      if (!targetClient) {
        await wa.sendMessage(chatJid, { 
          text: `⏳ الجلسة "${targetClientName}" غير نشطة. جاري تشغيلها...` 
        });
        
        try {
          await hex.initClient(targetClientName);
          // wait a moment for connection
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

      // 9. Fetch groups for this client
      if (typeof targetClient.groupFetchAllParticipating !== "function") {
        await wa.sendMessage(chatJid, { text: `❌ الجلسة "${targetClientName}" لا تدعم جلب المجموعات.` });
        return wa.react("❌");
      }

      const groupsObj = await targetClient.groupFetchAllParticipating();
      const groups = Object.values(groupsObj || {});
      
      if (!groups || groups.length === 0) {
        await wa.sendMessage(chatJid, { text: `📭 لا توجد مجموعات في الجلسة "${targetClientName}".` });
        return wa.react("0️⃣");
      }

      // 10. Check if user selected a group (args[1] is number)
      const groupIndexArg = args?.[1]?.trim() || null;

      if (groupIndexArg && !isNaN(groupIndexArg)) {
        const groupIndex = parseInt(groupIndexArg, 10);
        if (groupIndex < 1 || groupIndex > groups.length) {
          await wa.sendMessage(chatJid, { text: `⚠️ رقم المجموعة غير صحيح. يوجد ${groups.length} مجموعات.` });
          return wa.react("⚠️");
        }

        const targetGroup = groups[groupIndex - 1];
        const groupId = targetGroup?.id;
        const groupName = targetGroup?.subject || "Unnamed Group";
        const members = targetGroup?.participants?.length || targetGroup?.size || "unknown";

        if (!groupId) {
          await wa.sendMessage(chatJid, { text: `❌ لا يمكن العثور على معرف المجموعة #${groupIndex}.` });
          return wa.react("❌");
        }

        // Attempt to get invite link
        let inviteLink = null;
        try {
          let inviteCode = null;
          if (typeof targetClient.groupInviteCode === "function") {
            inviteCode = await targetClient.groupInviteCode(groupId);
          } else if (typeof targetClient.groupInviteLink === "function") {
            inviteCode = await targetClient.groupInviteLink(groupId);
          } else {
            const meta = typeof targetClient.groupMetadata === "function"
              ? await targetClient.groupMetadata(groupId)
              : null;
            if (meta && meta.inviteCode) inviteCode = meta.inviteCode;
            else if (meta && meta.inviteLink) inviteCode = meta.inviteLink;
          }
          if (inviteCode) {
            inviteLink = String(inviteCode).startsWith("http") ? String(inviteCode) : `https://chat.whatsapp.com/${inviteCode}`;
          }
        } catch {
          inviteLink = null;
        }

        if (!inviteLink) {
          await wa.sendMessage(chatJid, {
            text: `❌ لا يمكن جلب رابط الدعوة للمجموعة "${groupName}".\nقد لا تكون مشرفاً أو أن الدعوات معطلة.`
          });
          return wa.react("🔒");
        }

        const report = [
          `🔗 رابط دعوة المجموعة`,
          `> الجلسة: ${targetClientName}`,
          `> المجموعة: ${groupName}`,
          `> الأعضاء: ${members}`,
          `> الرابط: ${inviteLink}`,
          `\n${hex.bot_version || ""}`
        ].join("\n");

        await wa.sendMessage(chatJid, { text: report });
        return wa.react("🔗");
      }

      // 10.5 get admin status for all groups before building the buttons
      const adminStatus = await getGroupsAdminStatus(groups, { waClient: targetClient });
      // 11. No group selected -> show list of groups as interactive buttons
      const maxRowsPerSection = 10;
      
      const sections = [];
      for (let i = 0; i < groups.length; i += maxRowsPerSection) {
        const chunk = groups.slice(i, i + maxRowsPerSection);
        const rows = chunk.map((g, idx) => {
          const isAdmin = adminStatus[g.id] || false;
          return {
            title: g.subject || `مجموعة ${i + idx + 1}`,
            description: `👥 ${g.size || g.participants?.length || '?'} عضو | ${isAdmin ? '👑 مشرف' : '👤 عضو'}`,
            id: `${prefix}رابط ${targetClientName} ${i + idx + 1}`
          };
        });
        
        sections.push({
          title: `المجموعات ${i + 1} - ${Math.min(i + maxRowsPerSection, groups.length)}`,
          rows
        });
      }

      const interactiveButtons = [{
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: `اختر مجموعة (${groups.length})`,
          sections: sections
        })
      }];

      await sendInteractiveMessage(wa, chatJid, {
        text: `📋 اختر المجموعة التي تريد الحصول على رابطها من الجلسة "${targetClientName}":`,
        interactiveButtons
      });
      
      return wa.react("📋");

    } catch (err) {
      console.error("رابط command error:", err);
      const em = err?.message || err?.toString() || "Unknown error";
      await wa.sendMessage(msg.key.remoteJid, {
        text: `❌ خطأ: ${em}`
      });
      return wa.react("❌");
    }
  }
};