import { hex } from "#hexJS/index.js";
import { sendInteractiveMessage } from "../../../hexJS/wa-helpers/helpers-interactive.js";
import { config } from "../../../hexJS/assets/ass-paths.js"; // Import global config for fallback prefixes

export default {
  cmd: "اوامر",
  description: "عرض قائمة الاوامر",
  aliases: ["أوامر", "الأوامر", "الاوامر", "menu"],
  category: "ادوات",
  do: async (wa, msg, args) => {
    // init vars
    const commands = hex.commandsList || [];
    const prefix = config.prefixes[0]; // Resolve runtime prefix or use config default
    const targetCategory = args && args.length > 0 ? args.join(" ") : null;

    await wa.react("📜");

    // ==========================================
    // 1. SUB-MENU MODE: Show cmds for a specific category
    // ==========================================
    if (targetCategory) {
      const catCmds = commands.filter((c) => c.category === targetCategory);
      
      // guard: category not found
      if (catCmds.length === 0) {
        return await wa.sendMessage(msg.key.remoteJid, { text: "⚠️ القسم المطلوب غير موجود." });
      }

      // map cmds to bottom-sheet rows
      const rows = catCmds.map((cmd) => ({
        title: cmd.cmd,
        // limit description length to avoid interactive validation errors (WhatsApp limit is ~72 chars)
        description: cmd.description ? cmd.description.slice(0, 68) + ".." : "بدون وصف", 
        id: `${prefix}${cmd.cmd}` // sending cmd with prefix to trigger it directly
      }));

      const interactiveButtons = [
        {
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: "قائمة الأوامر",
            sections: [{ title: `.أوامر ${targetCategory}`, rows }]
          })
        }
      ];

      return await sendInteractiveMessage(wa, msg.key.remoteJid, {
        text: `╭─ • ✦ *${targetCategory}* ✦ • ─╮\n\nاختر الأمر الذي تود تنفيذه من القائمة أدناه:`,
        interactiveButtons
      });
    }

    // ==========================================
    // 2. MAIN MENU MODE: Show tiers and categories
    // ==========================================
    
    // define tiers structure
    const tiersConfig = [
      { id: "owner", title: "المطور 👑", header: "أقسام المطور" },
      { id: "elites", title: "النخبة 🌟", header: "أقسام النخبة" },
      { id: "everyone", title: "الجميع 👥", header: "أقسام العامة" }
    ];

    const interactiveButtons = [];

    tiersConfig.forEach((tier) => {
      // filter cmds by tier
      const tierCmds = commands.filter((c) => c.tier === tier.id);
      if (tierCmds.length === 0) return; // skip if tier has no commands

      // extract unique categories dynamically
      const categories = [...new Set(tierCmds.map((c) => c.category))].filter(Boolean);

      // map categories to bottom-sheet rows
      const rows = categories.map((cat) => ({
        title: `أوامر ${cat}`,
        description: "", // Removed description entirely
        id: `${prefix}اوامر ${cat}`
      }));

      // build button for this tier
      interactiveButtons.push({
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: tier.title,
          sections: [{ title: tier.header, rows }]
        })
      });
    });

    // add link buttons (GitHub + WhatsApp Channel)
    interactiveButtons.push(
      {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: "GitHub",
          url: config.github_url
        })
      },
      {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: "Channel",
          url: config.whatsapp_channel_url
        })
      }
    );

    // send main menu
    await sendInteractiveMessage(wa, msg.key.remoteJid, {
      text: "╭─ • ✦ *قائمة الأوامر* ✦ • ─╮\n\nيُرجى اختيار الرتبة لعرض الأقسام المتاحة:",
      interactiveButtons
    });
  },
};
