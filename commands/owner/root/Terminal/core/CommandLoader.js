// dynamic loader for terminal sub-commands
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// point to the parent Terminal directory
const TERMINAL_DIR = path.join(__dirname, "..");
const commandCache = new Map();

export async function loadTerminalCommands() {
  if (!fs.existsSync(TERMINAL_DIR)) {
    fs.mkdirSync(TERMINAL_DIR, { recursive: true });
  }

  // load only .js files to avoid loading directories like 'core' or 'upload'
  const files = fs.readdirSync(TERMINAL_DIR).filter((f) => f.endsWith(".js"));
  const commands = [];

  for (const file of files) {
    const fullPath = path.join(TERMINAL_DIR, file);
    const stat = fs.statSync(fullPath);
    const cacheKey = `${fullPath}:${stat.mtimeMs}`;

    if (commandCache.has(cacheKey)) {
      commands.push(commandCache.get(cacheKey));
      continue;
    }

    const url = pathToFileURL(fullPath).toString() + `?v=${stat.mtimeMs}`;
    try {
      const mod = await import(url);
      const cmd = mod?.default;

      if (cmd && typeof cmd.name === "string" && typeof cmd.run === "function") {
        commandCache.set(cacheKey, cmd);
        commands.push(cmd);
      }
    } catch (err) {
      console.error(`[Terminal Loader] Error loading ${file}:`, err);
    }
  }
  return commands;
}