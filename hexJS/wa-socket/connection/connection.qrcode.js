//modules
import { pendingClients, params } from "../../assets/ass-index.js";
import { options } from "./coonection.redirect.js";
import { cli, box, color } from "../../libs/libs.index.js";
import qrcode from "qrcode-terminal";
export async function qrcode_on(qr, waClient, clientName , BIND_CONFIG ) {
  if (!pendingClients[clientName])
    pendingClients[clientName] = { attempts: 0, isReconnected: false };
  pendingClients[clientName].attempts++;
  if (pendingClients[clientName].attempts > params.scanAttempts) {
    await options.onQrScanAttemptsExceeded(clientName);
  }
  cli.clear();
  console.log(
    box(
      color.pinkDark.bold(
        `Attempts (${pendingClients[clientName].attempts}/${params.scanAttempts}) to scan QR-code`
      )
    )
  );
  qrcode.generate(qr, { small: true });
}
