import { HarmDB, HarmManager } from "harm32-js";
import { dp, currentClient_user } from "../assets/ass-index.js";
import path from "path";
import fs from "fs";

const manager = new HarmManager();
//* functions
function getEliteFilePath() {
  const clientName = currentClient_user.clientName;
  const targetDir = path.resolve(process.cwd(), "data", clientName);
  
  // ensure client data dir exists before db operations
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
  
  // resolve client specific elite database (Must be .harm for HarmDB)
  return path.join(targetDir, `elite_${clientName}.harm`);

}

//? <Add elite>
export async function addElite(jids) {
  // Convert to an array if it has a single ID 
  if (!Array.isArray(jids)) {
    jids = [jids];
  }

  if (!manager.exists(getEliteFilePath())) {
    manager.create(getEliteFilePath());
    const db = new HarmDB(getEliteFilePath());
    db.set("elitePn", []);
    db.set("eliteLid", []);
    db.set("fullJids", {});
  }

  const db = new HarmDB(getEliteFilePath());
  const elitePn = db.get("elitePn") || [];
  const eliteLid = db.get("eliteLid") || [];
  const fullJids = db.get("fullJids") || {};

  let results = [];
  let updated = false;

  for (const jid of jids) {
    if (!jid.endsWith("lid") && !jid.endsWith("s.whatsapp.net")) {
      results.push({ jid, success: false, error: "Invalid JID format" });
      continue;
    }
    try {
      if (jid.endsWith("s.whatsapp.net")) {
        // resolve lid straight from signal repo, no existence pre-check anymore
        const resolvedLid = await currentClient_user.waClient.signalRepository.lidMapping.getLIDForPN(jid);
        const userJids = { pn: jid, lid: resolvedLid || jid };
        let changed = false;

        if (!eliteLid.includes(userJids.lid)) {
          eliteLid.push(userJids.lid);
          changed = true;
        }

        if (!elitePn.includes(userJids.pn)) {
          elitePn.push(userJids.pn);
          changed = true;
        }

        if (!fullJids[userJids.lid] || !fullJids[userJids.pn]) {
          fullJids[userJids.lid] = userJids.pn;
          fullJids[userJids.pn] = userJids.lid;
          changed = true;
        }

        if (changed) {
          updated = true;
        }

        results.push({ jid, success: true, data: userJids });
      } else if (jid.endsWith("@lid")) {
        if (eliteLid.includes(jid)) {
          results.push({ jid, success: true, message: "Already exists" });
          continue;
        }

        eliteLid.push(jid);
        updated = true;
        results.push({ jid, success: true });
      }
    } catch (error) {
      results.push({ jid, success: false, error: error.message });
    }
  }

  if (updated) {
    db.set("elitePn", elitePn);
    db.set("eliteLid", eliteLid);
    db.set("fullJids", fullJids);
  }

  return results;
}
//? <Remove elite>
export async function removeElite(jids) {
  if (!Array.isArray(jids)) {
    jids = [jids];
  }

  if (!manager.exists(getEliteFilePath())) {
    return jids.map((jid) => ({
      jid,
      success: false,
      error: "Database file does not exist",
    }));
  }

  const db = new HarmDB(getEliteFilePath());
  const elitePn = db.get("elitePn") || [];
  const eliteLid = db.get("eliteLid") || [];
  const fullJids = db.get("fullJids") || {};

  let results = [];
  let updated = false;

  for (const jid of jids) {
    if (!jid.endsWith("@lid") && !jid.endsWith("@s.whatsapp.net")) {
      results.push({ jid, success: false, error: "Invalid JID format" });
      continue;
    }

    try {
      if (jid.endsWith("@s.whatsapp.net")) {
        // resolve lid straight from signal repo, no existence pre-check anymore
        const resolvedLid = await currentClient_user.waClient.signalRepository.lidMapping.getLIDForPN(jid);
        const userJids = { pn: jid, lid: resolvedLid || jid };
        let changed = false;

        const pnIndex = elitePn.indexOf(userJids.pn);
        if (pnIndex !== -1) {
          elitePn.splice(pnIndex, 1);
          changed = true;
        }

        const lidIndex = eliteLid.indexOf(userJids.lid);
        if (lidIndex !== -1) {
          eliteLid.splice(lidIndex, 1);
          changed = true;
        }

        if (fullJids[userJids.lid]) {
          delete fullJids[userJids.lid];
          changed = true;
        }
        if (fullJids[userJids.pn]) {
          delete fullJids[userJids.pn];
          changed = true;
        }

        if (changed) {
          updated = true;
        }

        results.push({ jid, success: true, data: userJids });
      } else if (jid.endsWith("@lid")) {
        let changed = false;
        const lidIndex = eliteLid.indexOf(jid);
        if (lidIndex !== -1) {
          eliteLid.splice(lidIndex, 1);
          changed = true;
        }
        if (fullJids[jid]) {
          const userPn = fullJids[jid];
          const pnIndex = elitePn.indexOf(userPn);
          if (pnIndex !== -1) {
            elitePn.splice(pnIndex, 1);
            changed = true;
          }
          delete fullJids[jid];
          delete fullJids[userPn];
          changed = true;
        }

        if (changed) {
          updated = true;
        }

        results.push({ jid, success: true });
      }
    } catch (error) {
      results.push({ jid, success: false, error: error.message });
    }
  }
  if (updated) {
    db.set("elitePn", elitePn);
    db.set("eliteLid", eliteLid);
    db.set("fullJids", fullJids);
  }

  return results;
}

//? <Check is elite>
export async function isElite(jid) {
  if (
    jid.endsWith("@lid") ||
    (jid.endsWith("@s.whatsapp.net") && manager.exists(getEliteFilePath()))
  ) {
    const db = new HarmDB(getEliteFilePath());
    if (!db.has("elitePn") && !db.has("eliteLid") && !db.has("fullJids"))
      return false;
    const elitePn = db.get("elitePn");
    const eliteLid = db.get("eliteLid");
    const fullJids = db.get("fullJids");
    if (jid.endsWith("s.whatsapp.net")) {
      if (elitePn.includes(jid)) return true;
      // resolve lid straight from signal repo, no existence pre-check anymore
      const resolvedLid = await currentClient_user.waClient.signalRepository.lidMapping.getLIDForPN(jid);
      const userJids = { pn: jid, lid: resolvedLid || jid };
      if (eliteLid.includes(userJids.lid)) {
        const newElitePn = [...elitePn, userJids.pn];
        const newFullJids = {
          ...fullJids,
          [userJids.lid]: userJids.pn,
          [userJids.pn]: userJids.lid,
        };
        db.set("elitePn", newElitePn);
        db.set("fullJids", newFullJids);
        return true;
      }
      return false;
    }
    if (jid.endsWith("lid")) {
      if (eliteLid.includes(jid)) {
        return true;
      }
      return false;
    }
  }
  return false;
}
// ? get elites
export async function elites() {
  if (!manager.exists(getEliteFilePath())) return null;
  const db = new HarmDB(getEliteFilePath());
  if (!db.has("elitePn") && !db.has("eliteLid") && !db.has("fullJids"))
    return null;
  return db.get("eliteLid") || [];
}
// ? get lid<->pn jid map for elites — the mention resolver needs this to send a real WhatsApp mention
// instead of the raw lid, since baileys only renders the blue tag correctly with a PN-format jid
export async function eliteFullJids() {
  if (!manager.exists(getEliteFilePath())) return {};
  const db = new HarmDB(getEliteFilePath());
  if (!db.has("fullJids")) return {};
  return db.get("fullJids") || {};
}