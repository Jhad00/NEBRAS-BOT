import { hex } from "#hexJS/index.js";
import { formatText } from "textos";
import { sendInteractiveMessage } from "../../../hexJS/wa-helpers/helpers-interactive.js";
import { config } from "../../../hexJS/assets/ass-paths.js";

export default {
  cmd: "منشن",
  description: "منشن مخفي لجميع أعضاء المجموعة",
  aliases: ["م", "mention", "m"],
  category: "مجموعات",

  do: async (wa, msg, args) => {
    if (!wa.isGroup(msg)) return wa.react("⚠️");

    await wa.react("🌐");

    const mentions = await wa.getParticipants(msg.key.remoteJid);
    const userText = args.join(" ").trim();

    const defaultText = formatText({ text: "NEBRAS IS CALLING YOU", font: "bold" });

    const finalText = userText || defaultText;

    // Build interactive buttons with CTA URL (opens inside WhatsApp)
    const interactiveButtons = [
      {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: "VISIT GITHUB",
          url: config.github_url
        })
      }
    ];

    // Send single message with mention + button together
    await sendInteractiveMessage(wa, msg.key.remoteJid, {
      text: finalText,
      mentions: mentions,
      interactiveButtons: interactiveButtons
    });

    return wa.react("✅");
  },
};