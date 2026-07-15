import * as baileys from "baileys";
import pino from "pino";
import path from "path";
import { dp } from "../assets/ass-index.js";
import { delay } from "../libs/libs.index.js";

let makeInMemoryStore = baileys.makeInMemoryStore;
let store = makeInMemoryStore
  ? makeInMemoryStore({
      logger: pino().child({ level: "silent", stream: "store" }),
    })
  : { bind: () => {}, writeToFile: () => {}, readFromFile: () => {} };

const usePairingCode = true;
let attempts = {};

export async function requestLinkCode(number, clientName, retries, ev) {
  const client_folder = path.join(dp.clients, clientName);
  const { state, saveCreds } = await baileys.useMultiFileAuthState(
    client_folder
  );
  const { version } = await baileys.fetchLatestBaileysVersion();

  const sc = baileys.makeWASocket({
    version,
    printQRInTerminal: !usePairingCode,
    keepAliveIntervalMs: 100000,
    logger: pino({ level: "silent" }),
    auth: state,
    browser: ["Mac Os", "Tor", "121.0.6167.159"],
  });

  if (usePairingCode && !sc.authState.creds.registered) {
    if (!attempts[clientName]) attempts[clientName] = 0;
    attempts[clientName]++;
    await delay(3000);
    const code = await sc.requestPairingCode(number);

    if (ev) ev({ status: "waiting", code: code });
  }

  if (store && store.bind) store.bind(sc.ev);

  sc.ev.on("creds.update", saveCreds);

  sc.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        baileys.DisconnectReason.loggedOut;
      const restartRequired =
        lastDisconnect?.error?.output?.statusCode ===
        baileys.DisconnectReason.restartRequired;
      if (shouldReconnect) {
        if (restartRequired) {
          await requestLinkCode(number, clientName, retries, ev);
        } else {
          if (attempts[clientName] < retries) {
            await requestLinkCode(number, clientName, retries, ev);
          } else {
            sc.ev.removeAllListeners();
            sc.ws.close();
            if (ev) ev({ status: "closed", code: null });
          }
        }
      } else {
        delete attempts[clientName];
        sc.ev.removeAllListeners();
        sc.ws.close();
        if (ev) ev({ status: "closed", code: null });
      }
    } else if (connection === "open") {
      setTimeout(async () => {
        sc.ev.removeAllListeners();
        sc.ws.close();
        delete attempts[clientName];
        if (ev) ev({ status: "connected", code: null });
      }, 3000);
    }
  });
}
