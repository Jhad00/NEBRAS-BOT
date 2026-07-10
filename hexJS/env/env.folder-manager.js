import { dp } from "../assets/ass-index.js";
import fs from "fs";
import path from "path";
export function clearEmptyClientFolders(dir = dp.clients) {
  // ensure root clients directory exists on startup
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // if clients dir is empty, create placeholder file for hosting compatibility
  const clientsItems = fs.readdirSync(dir);
  if (clientsItems.length === 0) {
    fs.writeFileSync(path.join(dir, ".gitkeep"), "");
  }

  // clear temp directory on startup
  const tempDir = path.join(process.cwd(), "temp");
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.mkdirSync(tempDir, { recursive: true });
  }

  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      clearEmptyClientFolders(fullPath);
      const filesCount = fs
        .readdirSync(fullPath)
        .filter((f) => fs.statSync(path.join(fullPath, f)).isFile()).length;
      if (filesCount < 2) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      }
    }
  }
}
