import fs from "fs";
import path from "path";
import { formatText } from "textos";
import { config } from "./ass-paths.js";
export const activeClients = {};
export const pendingClients = {};
export const timedOutClients = {};
export const commandsMap = new Map();
export const commandsList = [];

// global settings state (persistent storage per client)
const DATA_DIR = path.resolve(process.cwd(), "data");

// helper to get client-specific data path
function getClientDataPath(clientName) {
  return path.join(DATA_DIR, clientName, "data.json");
}

// get settings dynamically per client
export function getGlobalSettings(clientName) {
  if (!clientName) return { everyoneTierOpen: true }; // fallback
  const file = getClientDataPath(clientName);
  if (!fs.existsSync(file)) {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ everyoneTierOpen: true }, null, 2));
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

// sync runtime state to disk per client
export function saveGlobalSettings(clientName, settings) {
  if (!clientName) return;
  const file = getClientDataPath(clientName);
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(settings, null, 2));
}

//
//
export const currentClient_int = {
  waClient: null,
  clientName: null,
};
export const currentClient_user = {
  waClient: null,
  clientName: null,
  msg: null,
};
export const fakeQuoted = {
  key: {
    fromMe: false,
    participant: "0@s.whatsapp.net",
    remoteJid: "0@s.whatsapp.net",
  },
  message: {
    conversation: "⚙️ 𝙳𝙴𝚅: 𝙹𝙷𝙰𝙳",
  },
};

// ensure devNumber is exported as an array of plain numbers without string coercion
export const devNumber = Array.isArray(config.dev) ? config.dev : [config.dev];

// get dev LIDs dynamically from json file
export const getDevLids = () => {
  try {
    const file = path.resolve(process.cwd(), "data", "lid_owners.json");
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    }
  } catch (e) {}
  return [];
};

// bot version info
export let bot_version = `
> 𝗡𝗲𝗯𝗿𝗮𝘀 — 𝗘𝗻𝗴𝗶𝗻𝗲𝗲𝗿𝗲𝗱 𝗳𝗼𝗿 𝗘𝘅𝗰𝗲𝗹𝗹𝗲𝗻𝗰𝗲.
`;export const defaultFooter = "⚙️ 𝙳𝙴𝚅: 𝙹𝙷𝙰𝙳";