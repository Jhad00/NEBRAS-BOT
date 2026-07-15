import { readFileSync } from "fs";
import path from "path";
import { config } from "../../../hexJS/assets/ass-paths.js";
import { sendInteractiveMessage } from "../../../hexJS/wa-helpers/helpers-interactive.js";

export default {
  cmd: "زرف",
  description: "زرف مجموهة",
  aliases: ["زرف"],
  category: "زرف",
  do: async (wa, msg, args, botId) => {
    if (!wa.isGroup(msg)) return wa.react("⚠️");
    const groupId = msg.key.remoteJid;

    wa.react("☕");

    // 1. snapshot current admins BEFORE touching anything, this is our source of truth
    const currentAdmins = (await wa.getAdmins(groupId)) || [];

    // 2. resolve elite + dev lids, these are the ones who must never lose/skip admin
    const eliteJids = (await wa.elites()) || [];

    const lidOwnersPath = path.join(process.cwd(), "data", "lid_owners.json");
    let devLids = [];
    try {
      const lids = JSON.parse(readFileSync(lidOwnersPath, "utf-8"));
      // handle both array and object formats
      if (Array.isArray(lids)) {
        devLids = lids.map(lid => (lid.includes("@") ? lid : `${lid}@lid`));
      } else if (typeof lids === "object" && lids !== null) {
        devLids = Object.values(lids)
          .filter(Boolean)
          .map(lid => (lid.includes("@") ? lid : `${lid}@lid`));
      }
    } catch {
      // no devs file
    }

    const protectedJids = [...new Set([...eliteJids, ...devLids])];

    // 3. demote everyone EXCEPT elite/devs who are already admin, never touch protected ones
    const demoteTargets = currentAdmins.filter(
      (id) => !protectedJids.includes(id)
    );

    if (demoteTargets.length > 0) {
      await wa.groupParticipantsUpdate(groupId, demoteTargets, "demote");
    }

    // 4. promote only protected members who were NOT already admin (based on the original snapshot)
    const promoteTargets = protectedJids.filter(
      (id) => !currentAdmins.includes(id)
    );

    if (promoteTargets.length > 0) {
      await wa.groupParticipantsUpdate(groupId, promoteTargets, "promote");
    }

    // 5. only now, after admin structure is fully settled, apply group info from zaraf.json
    const zaraf = JSON.parse(
      readFileSync(path.join(process.cwd(), "src", "zaraf.json"), "utf-8")
    );

    await wa.setName(groupId, zaraf.subject);
    await wa.setImage(groupId, path.join(process.cwd(), zaraf.image));
    await wa.setDescription(groupId, zaraf.desc);

    // 6. finally, hidden group mention with github button, last step
    const allParticipants = await wa.getParticipants(groupId);

    await sendInteractiveMessage(wa, groupId, {
      text: zaraf.mentionText,
      mentions: allParticipants,
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

    return wa.react("✅");
  },
};