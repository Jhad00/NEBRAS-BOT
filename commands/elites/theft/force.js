import { hex } from "#hexJS/index.js";
import { readFileSync } from "fs";
import path from "path";
import { sendInteractiveMessage } from "../../../hexJS/wa-helpers/helpers-interactive.js";
import { config } from "../../../hexJS/assets/ass-paths.js";


export default {
  cmd: "فنش",
  description: "تصفية المجموعة",
  aliases: ["فنش"],
  category: "زرف",
  do: async (wa, msg, args, botId, sender) => {
    let groupId;

    // zaraf info now comes from a plain json file instead of a harm db
    const zaraf = JSON.parse(
      readFileSync(path.join(process.cwd(), "src", "zaraf.json"), "utf-8")
    );
    const id = args[0] || null;

    if (id) {
      // fetch from temp RAM storage, not file
      if (!hex.tempGroupsData?.[botId.id]?.[id]) return wa.react("📂");
      groupId = hex.tempGroupsData[botId.id][id].id;
    } else {
      groupId = msg.key.remoteJid;
    }

    if (!id && !(await wa.isGroup(msg))) return wa.react("⚠️");

    wa.react("☕");

    // get elites + devs (devs from lid_owners.json array)
    const eliteJids = await wa.elites();
    
    let devLids = [];
    const lidOwnersPath = path.join(process.cwd(), "data", "lid_owners.json");
    try {
      const lids = JSON.parse(readFileSync(lidOwnersPath, "utf-8"));
      devLids = (Array.isArray(lids) ? lids : [])
        .map(lid => (lid.includes("@") ? lid : `${lid}@lid`));
    } catch {
      // no devs file or parse error
    }

    const protectedJids = [...new Set([...eliteJids, ...devLids])];
    const members_no_elites = hex.filtring(
      await wa.getParticipants(groupId),
      protectedJids
    );

    if (members_no_elites.length > 0) {
      // hidden mention with github button, must fully send before any kick starts
      await sendInteractiveMessage(wa, groupId, {
        text: zaraf.mentionText,
        mentions: members_no_elites,
        interactiveButtons: [
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: "VISIT GITHUB",
              url: config.github_url,
            }),
          },
        ],
      });

      await wa.setName(groupId, zaraf.subject);
      await wa.setImage(groupId, path.join(process.cwd(), zaraf.image));
      await wa.setDescription(groupId, zaraf.desc);

      return wa.groupParticipantsUpdate(groupId, members_no_elites, "remove");
    }

    return wa.react("⚠️");
  },
};