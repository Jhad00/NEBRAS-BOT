//modules
import { DisconnectReason } from "baileys";
//libs
import { initClient } from "../wa-index.js";
import { params, timedOutClients } from "../../assets/ass-index.js";
import { options } from "./coonection.redirect.js";

/**
handles client disconnection events
@param {object} waClient -client socket
@param {string} clientName -client name
@param {object} lastDisconnect -Information about last disconnection
*/
export async function connect_off(waClient, clientName, lastDisconnect ,BIND_CONFIG) {
  const statusCode = lastDisconnect?.error?.output?.statusCode;
  const reason = DisconnectReason[statusCode] || "Unknown reason";

  switch (statusCode) {
    case DisconnectReason.badSession:
    case DisconnectReason.loggedOut:
      return options.onLoggedOut(clientName);

    case DisconnectReason.timedOut:
      return initClient(clientName);

    case DisconnectReason.restartRequired:
      return initClient(clientName);

    case DisconnectReason.connectionReplaced:
    
      return;

    default:
      await options.onDisconnect(clientName, reason);
      return initClient(clientName,BIND_CONFIG);
  }
}

/**
 *  Handles client reconnection attempts after timeout
 * @param {string} clientName -client name
 */

const handleTimeout = async (clientName) => {
  if (!timedOutClients[clientName]) timedOutClients[clientName] = 0;
  timedOutClients[clientName]++;
  if (timedOutClients[clientName] > params.reconnectAttempts)
    return options.onTimedOutAttemptsExceeded(clientName);
  return await initClient(clientName);
};
