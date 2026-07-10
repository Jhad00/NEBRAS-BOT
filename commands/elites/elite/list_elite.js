import { HarmDB, HarmManager } from "harm32-js";
import path from "path";
import { hex } from "#hexJS/index.js";
import { getDevLids } from "../../../hexJS/assets/ass-vars.js";
import { sendInteractiveMessage } from "../../../hexJS/wa-helpers/helpers-interactive.js";
import { config } from "../../../hexJS/assets/ass-paths.js";

// init harm manager
const manager = new HarmManager();

export default {
  cmd: "النخبة",
  description: "عرض قائمة النخبة الحاليين، مع إمكانية حذفهم جميعاً",
  aliases: ["elites", "list_elite", "قائمة_النخبة"],
  category: "نخبة",

  do: async (wa, msg, args) => {
    // resolve active client db path
    const clientName = wa.clientName;
    const filePath = path.resolve(
      process.cwd(),
      "data",
      clientName,
      `elite_${clientName}.harm`
    );

    // check db existence
    if (!manager.exists(filePath)) {
      return wa.sendMessage(msg.key.remoteJid, {
        text: "📍 لا يوجد أعضاء نخبة مسجلين في النظام بعد.",
      });
    }

    // Always read fresh data from disk
    const getEliteList = () => {
      const db = new HarmDB(filePath);

      const elitePn = db.get("elitePn") || [];
      const eliteLid = db.get("eliteLid") || [];

      return [...new Set([...elitePn, ...eliteLid])];
    };

    let allElites = getEliteList();

    // edge case: empty list
    if (allElites.length === 0) {
      return wa.sendMessage(msg.key.remoteJid, {
        text: "📍 قائمة النخبة فارغة حالياً.",
      });
    }

    // manual full wipe, triggered either by typing "النخبة حذف" or by tapping the button
    if (args[0] === "حذف") {
      await wa.react("🗑️");
      await wa.removeElite(allElites);
      return wa.sendMessage(msg.key.remoteJid, {
        text: "✅ تمت إزالة جميع أعضاء النخبة.",
      });
    }

    // ux state
    await wa.react("👑");

    // Check for developers in elite list, remove them BEFORE sending anything
    const devLids = getDevLids();
    const devsInElite = allElites.filter((jid) => devLids.includes(jid));

    if (devsInElite.length > 0) {
      await wa.removeElite(devsInElite);
      allElites = getEliteList();
    }

    // Build layout
    const buildLayout = (elites) => {
      let layout = `╭─« ⚜️ *قـائـمـة الـنـخـبـة* ⚜️ »─╮\n│\n`;

      elites.forEach((jid, index) => {
        const number = jid.split("@")[0];
        layout += `│ 🔱 *${index + 1}.* @${number}\n`;
      });

      layout += `│\n╰──────────────────╯`;

      return layout;
    };

    // empty after cleanup, send empty-state message
    if (allElites.length === 0) {
      return wa.sendMessage(msg.key.remoteJid, {
        text: "📍 قائمة النخبة فارغة حالياً.",
      });
    }

    // final clean list with the delete-all button, sent once
    return sendInteractiveMessage(wa, msg.key.remoteJid, {
      text: buildLayout(allElites),
      mentions: allElites,
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "🗑️ حذف جميع النخبة",
            id: `${config.prefixes[0]}النخبة حذف`,
          }),
        },
      ],
    });
  },
};