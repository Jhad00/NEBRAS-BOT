import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from "baileys";
import fs from "fs";
import pino from "pino";
import path from "path";
import { dp, params } from "../../assets/ass-index.js";
import { creeds_updates, connection_updates } from "../events/ev-index.js";

export async function initClient(clientName, BIND_CONFIG = {}) {
  const client_folder = path.join(dp.clients, clientName);
  
  // ensure folder exists and create placeholder for hosting compatibility
  if (!fs.existsSync(client_folder)) {
    fs.mkdirSync(client_folder, { recursive: true });
    fs.writeFileSync(path.join(client_folder, ".gitkeep"), "");
  }
  
  const { state, saveCreds } = await useMultiFileAuthState(client_folder);
  const { version } = await fetchLatestBaileysVersion();

  const waClient = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    connectTimeoutMs: 60000,
    auth: state,
    browser: [params.displayName, params.browser, "1.0"],
  });
  waClient.clientName = clientName;

  await creeds_updates(waClient, saveCreds);
  await connection_updates(waClient, clientName, BIND_CONFIG);
}