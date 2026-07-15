import { isAllowed, getChatJid, getCwdForChat } from "./Terminal/core/TerminalState.js";
import { getTextFromMsg, parseInvocation } from "./Terminal/core/Parser.js";
import { executeShellCommand } from "./Terminal/core/ShellExecutor.js";
import { loadTerminalCommands } from "./Terminal/core/CommandLoader.js";

export default {
  cmd: "$",
  description: "Terminal",
  aliases: [],
  category: "ادارة",
  noPrefix: true,

  do: async (wa, msg, args, botId) => {
    try {
      if (!isAllowed(msg)) {
        return wa.sendMessage(msg.key.remoteJid, { text: `*🚫 Access denied*` });
      }

      const rawText = getTextFromMsg(msg);
      const parsed = parseInvocation(rawText);

      const subcmd = parsed?.subcmd || (args?.[0] ? String(args[0]) : null);
      const subargs = parsed?.subargs || (args?.slice(1) || []);

      const all = await loadTerminalCommands();

      if (!subcmd) {
        const cwd = getCwdForChat(getChatJid(msg));
        const names = all.map((c) => c.name).sort();
        const help = `*📍:* \`${cwd}\`\n*📌 Commands:* ${names.length ? names.join(", ") : "None"}\n*💡 Usage:* \`< command [args]>\``;
        return wa.sendMessage(msg.key.remoteJid, { text: help });
      }

      // route to custom command if it exists
      const found = all.find(c => c.name === subcmd || c.aliases?.includes(subcmd));
      if (found) {
        return await found.run(wa, msg, subargs, botId);
      }

      // fallback to shell execution
      return await executeShellCommand(wa, msg, subcmd, subargs);

    } catch (e) {
      try {
        return wa.sendMessage(msg.key.remoteJid, { text: `*🚫 Terminal error:*\n\`${e?.message || "Unknown"}\`` });
      } catch {}
    }
  },
};