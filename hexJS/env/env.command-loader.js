import fs from "fs";
import path from "path";
import { commandsMap, commandsList, dp } from "../assets/ass-index.js";

export async function loadCommands(dir = dp.commands) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const files = fs.readdirSync(dir);
  if (files.length === 0) return;

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      await loadCommands(fullPath);
      continue;
    }

    if (file.endsWith(".js") || file.endsWith(".ts")) {
      try {
        const commandModule = await import(fullPath + "?cacheBust=" + Date.now());
        const cmd = commandModule.default || commandModule;

        if (cmd && cmd.cmd && typeof cmd.do === "function") {
          cmd.filePath = fullPath;
          
          // extract tier from folder structure
          const relativePath = path.relative(dp.commands, fullPath);
          const tier = relativePath.replace(/\\/g, '/').split('/')[0] || "everyone";
          cmd.tier = tier;

          commandsMap.set(cmd.cmd, cmd);
          if (Array.isArray(cmd.aliases)) {
            cmd.aliases.forEach((alias) => commandsMap.set(alias, cmd));
          }

          const index = commandsList.findIndex((c) => c.cmd === cmd.cmd);
          
          // setup command memory object
          const commandData = {
            cmd: cmd.cmd,
            description: cmd.description ?? null,
            aliases: Array.isArray(cmd.aliases) ? cmd.aliases : null,
            category: cmd.category ?? "general",
            filePath: fullPath,
            tier: tier,
            noPrefix: cmd.noPrefix || false,
            replyToBot: cmd.replyToBot || false,
            mentionBot: cmd.mentionBot || false 
          };
          
          if (index !== -1) commandsList[index] = commandData;
          else commandsList.push(commandData);
        }
      } catch (err) {
console.log(err)
        continue;
      }
    }
  }
}
