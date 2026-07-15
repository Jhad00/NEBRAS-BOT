import chokidar from "chokidar";
import path from "path";
import { commandsMap, commandsList, dp } from "../assets/ass-index.js";

export function watchCommands(dir = dp.commands) {
  const watcher = chokidar.watch(dir, {
    persistent: true,
    ignoreInitial: false,
    depth: 99,
  });

  watcher.on("add", async (filePath) => await safeReload(filePath));
  watcher.on("change", async (filePath) => await safeReload(filePath));
  watcher.on("unlink", (filePath) => safeRemove(filePath));
}

// ─── Safe reload ─────────────────────────────
async function safeReload(filePath) {
  try {
    await reloadCommand(filePath);
  } catch (err) {

  }
}

// ?─── Reload command ─────────────────────────────
async function reloadCommand(filePath) {
  if (!filePath.endsWith(".js") && !filePath.endsWith(".ts")) return;

  const commandModule = await import(filePath + "?update=" + Date.now());
  const cmd = commandModule.default || commandModule;

  if (cmd && cmd.cmd && typeof cmd.do === "function") {
    cmd.filePath = filePath;
    
    // extract tier for live updates
    const relativePath = path.relative(dp.commands, filePath);
    const tier = relativePath.replace(/\\/g, '/').split('/')[0] || "everyone";
    cmd.tier = tier;

    commandsMap.set(cmd.cmd, cmd);
    if (Array.isArray(cmd.aliases)) {
      cmd.aliases.forEach((alias) => commandsMap.set(alias, cmd));
    }

    const index = commandsList.findIndex((c) => c.cmd === cmd.cmd);
    // core cmd properties extracted for memory
    const commandData = {
      cmd: cmd.cmd,
      description: cmd.description ?? null,
      aliases: Array.isArray(cmd.aliases) ? cmd.aliases : null,
      category: cmd.category ?? "general",
      filePath,
      tier: tier,
      noPrefix: cmd.noPrefix || false,
      replyToBot: cmd.replyToBot || false,
      mentionBot: cmd.mentionBot || false
    };

    if (index !== -1) commandsList[index] = commandData;
    else commandsList.push(commandData);
  }
}

// ?─── Safe remove ─────────────────────────────
function safeRemove(filePath) {
  for (const [key, value] of commandsMap.entries()) {
    if (value.filePath === filePath) commandsMap.delete(key);
  }

  const index = commandsList.findIndex((c) => c.filePath === filePath);
  if (index !== -1) commandsList.splice(index, 1);
}
