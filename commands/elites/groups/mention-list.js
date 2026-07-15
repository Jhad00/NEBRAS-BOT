import { hex } from "#hexJS/index.js";
import { sendInteractiveMessage } from "../../../hexJS/wa-helpers/helpers-interactive.js";
import { config } from "../../../hexJS/assets/ass-paths.js";

export default {
  cmd: "جماعي",
  description: "منشن جماعي كقائمة",
  aliases: ["collective"],
  category: "مجموعات",
  do: async (wa, msg, args, botId) => {
    if (!wa.isGroup(msg)) return wa.react("⚠️");
    wa.react("🌐");

    const metadata = await wa.fetchGroup(msg.key.remoteJid);
    const participants = await wa.getParticipantsFrom(metadata.participants, {
      includesMe: true,
      jids: botId,
    });

    let response = `𝐌𝐞𝐧𝐭𝐢𝐨𝐧𝐧𝐞𝐝 𝐛𝐲 𝐍𝐄𝐁𝐑𝐀𝐒:\n`;
    response += `> *𝙶𝚛𝚘𝚞𝚙: ${metadata.subject}*\n`;
    response += `> *𝚕𝚎𝚗𝚐𝚝𝚑: ${metadata.size}*\n\n`;

    response +=
      participants
        .map((id, idx) => `*❑ ➼ ${idx + 1}:* @${id.split("@")[0]}`)
        .join("\n") + "\n";

    const interactiveButtons = [
      {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: "VISIT GITHUB",
          url: config.github_url
        })
      }
    ];

    await sendInteractiveMessage(wa, msg.key.remoteJid, {
      text: response,
      contextInfo: { mentionedJid: participants },
      interactiveButtons: interactiveButtons
    });

    return wa.react("✅");
  },
};