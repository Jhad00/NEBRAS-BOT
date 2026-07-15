import { pendingClients } from "../../assets/ass-index.js";
import { initClient } from "../wa-index.js";
import { options } from "./coonection.redirect.js";
export async function connect_on(waClient, clientName ,BIND_CONFIG) {
 if(pendingClients[clientName]){ if (!pendingClients[clientName].isReconnected) {
    pendingClients[clientName].isReconnected = true;
    return await initClient(clientName,BIND_CONFIG);
  }}
  return await options.onConnect(clientName,waClient);
}
