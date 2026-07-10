// !─── Libs ────────────────────────────────────────────────
import { clientManager, activeClients } from "../assets/ass-index.js";
import {  definer } from "../libs/libs.index.js";
import {color , box} from "bumbum-cli"
import {HarmDB , HarmManager} from "harm32-js"
const CREEDS_PATH = "../resources/CLIENTS_CREEDS.harm";
const manager = new HarmManager()
// !─── Display Active Clients ──────────────────────────────
export async function displayActiveClients() {
  const clients = await clientManager.getActiveClients();

  for (const client of clients) {
    const user = activeClients[client]?.user;
    if (!user) continue;

    const jids = {
      id: "+"+user.id?.split(":")[0] ,
      lid: user.lid?.split(":")[0],
    };

    const result = buildClientInfo(client, jids);
    console.log(box(result , { 
      borderColor: "green",  }));
  }
}
// !─── Display all clients ──────────────────────────────
export async function displayExistingClient() {
  if(manager.exists(CREEDS_PATH)){
 
  }
 
}

// ?─── Helpers ────────────────────────────
function buildClientInfo(client, jids) {
  return (
    color.green.bold("Client information:") +
    "\n\n" +
    definer([
      {
        name: color.green.bold("Name"),
        value: color.white.bold(client.toUpperCase()),
      },
      {
        name: color.green.bold("Jid"),
        value: color.white.bold(jids.id),
      },
      {
        name: color.green.bold("Lid"),
        value: color.white.bold(jids.lid),
      },
    ])
  );
}
