import { loadCommands } from "./env.command-loader.js";
import { watchCommands } from "./env.command-update.js";
import { currentClient_user } from "../assets/ass-index.js";
import {
  messages_update,
} from "../wa-socket/events/ev-index.js";
import { clearEmptyClientFolders } from "./env.folder-manager.js";
//!pre-launch check
export async function env0() {
  clearEmptyClientFolders();
  await loadCommands();
  watchCommands();
}
//? on bind connection
export async function env1(waClient) {
  currentClient_user.waClient = waClient;
  await messages_update(waClient);

  // fetch dev LIDs and sync with lid_owners.json
  try {
    const fs = await import("fs");
    const path = await import("path");
    const { config } = await import("../assets/ass-paths.js");
    
    const devsPath = path.resolve(process.cwd(), "data", "lid_owners.json");
    const dataDir = path.dirname(devsPath);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    
    let existingLids = [];
    if (fs.existsSync(devsPath)) {
      existingLids = JSON.parse(fs.readFileSync(devsPath, "utf8"));
    }
    
    const devs = Array.isArray(config.dev) ? config.dev : [config.dev];
    const currentLids = [];
    
    for (const phone of devs) {
      const jid = `${phone}@s.whatsapp.net`;
      await waClient.onWhatsApp(jid);
      let lid = await waClient.signalRepository.lidMapping.getLIDForPN(jid);
      if (lid) currentLids.push(lid);
    }
    
    // compare arrays and update only if they differ
    const existingStr = JSON.stringify(existingLids.sort());
    const currentStr = JSON.stringify(currentLids.sort());
    
    if (existingStr !== currentStr) {
      fs.writeFileSync(devsPath, JSON.stringify(currentLids, null, 2));
      console.log("[System] lid_owners.json updated with latest dev LIDs");
    }
  } catch (err) {
    console.error("[System] Failed to sync dev LIDs:", err);
  }
}
