
import { delay } from "../../libs/libs.index.js";
export async function pairCode_on(waClient, clientName, BIND_CONFIG) {
    await delay(9000);
  const pairingCode = await waClient.requestPairingCode(BIND_CONFIG.Phone);
  await delay(3000);
  console.log(`Pairing code for ${clientName}: ${pairingCode}`);
}
