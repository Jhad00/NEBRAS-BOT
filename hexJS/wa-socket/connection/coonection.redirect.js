// !─── Imports ─────────────────────────────────────────────
import { startMenu } from "../../interface/interface-index.js";
import { color, box, definer, cli ,delay} from "../../libs/libs.index.js";
import {wa_helpers} from "../../wa-helpers/heplers.index.js"
import {
  clientManager,
  pendingClients,
  timedOutClients,
  activeClients,
} from "../../assets/ass-index.js";
import { env1 } from "../../env/env.index.js";

// ?─── Helpers ─────────────────────────────────────────────

// ?─── render Status Box ───────

function renderStatusBox({ info, client, status, error, colorKey }) {
  const rows = [
    { name: color[colorKey].bold("Information"), value: color.white.bold(info) },
    error && { name: color[colorKey].bold("Error"), value: color.white.bold(error) },
    { name: color[colorKey].bold("Client"), value: color.white.bold(client.toUpperCase()) },
    { name: color[colorKey].bold("Status"), value: color.white.bold(status) },
  ].filter(Boolean);

  cli.clear();
  console.log(box(definer(rows), { borderColor: colorKey }));
}
// ?─── Cleanup client ───────

function cleanupClient(CN, { removeActive = false, removeTimedOut = false } = {}) {
  if (pendingClients[CN]) delete pendingClients[CN];
  if (removeActive && activeClients[CN]) delete activeClients[CN];
  if (removeTimedOut && timedOutClients[CN]) delete timedOutClients[CN];
}

// ?─── Options Functions ──────────────────────────────────

async function onQrScanAttemptsExceeded(CN) {
  cleanupClient(CN);
  renderStatusBox({
    info: "Qrcode not scanned !",
    client: CN,
    status: "return to menu",
    colorKey: "yellow",
  });
  await clientManager.deleteClient(CN);
  await delay(5000);
  await startMenu();
}
// ?─── onLoggedOut ────

async function onLoggedOut(CN) {
  cleanupClient(CN, { removeActive: true });
  renderStatusBox({
    info: "Client is Logged out !",
    client: CN,
    status: "return to menu",
    colorKey: "red",
  });
  await clientManager.deleteClient(CN);
  await delay(5000);
  await startMenu();
}
// ?─── on connect ────

async function onConnect(CN, waClient) {
  cleanupClient(CN);
  activeClients[CN] ={...waClient,...wa_helpers};
  await env1(waClient);
  renderStatusBox({
    info: "Client was connected successfully !!",
    client: CN,
    status: "return to menu...",
    colorKey: "green",
  });
  await delay(5000);
  await startMenu();
}
// ?─── Timedout exceeded ────

async function onTimedOutAttemptsExceeded(CN) {
  cleanupClient(CN, { removeActive: true, removeTimedOut: true });
  renderStatusBox({
    info: "Client is Timed out , Cannot connect !!",
    client: CN,
    status: "return to menu...",
    colorKey: "yellow",
  });
  await delay(5000);
  await startMenu();
}
// ?─── onDisconnect ────

async function onDisconnect(CN, reason) {
  renderStatusBox({
    info: "Client is disconnected !",
    error: reason,
    client: CN,
    status: "reconnecting...",
    colorKey: "yellow",
  });
  await delay(5000);
}

// ?─── Export ─────────────────────────────────────────────
export const options = {
  onQrScanAttemptsExceeded,
  onLoggedOut,
  onConnect,
  onTimedOutAttemptsExceeded,
  onDisconnect,
};
