import {
  qrcode_on,
  connect_on,
  connect_off,
  pairCode_on,
} from "../connection/connection.index.js";

export async function connection_updates(waClient, clientName, BIND_CONFIG) {
  waClient.ev.on("connection.update", async (updates) => {
    const { connection, lastDisconnect, qr } = updates;

    switch (BIND_CONFIG.bindType) {
      case "qr":
        if (qr) {
          return qrcode_on(qr, waClient, clientName, BIND_CONFIG);
        }
        break;

      case "digit":
        if (!waClient.authState.creds.registered) {
          return pairCode_on(waClient, clientName, BIND_CONFIG);
        }
        break;

      default:
        break;
    }

    if (connection === "open") {
      await connect_on(waClient, clientName, BIND_CONFIG);
    } else if (connection === "close") {
      await connect_off(waClient, clientName, lastDisconnect, BIND_CONFIG);
    }
  });
}
