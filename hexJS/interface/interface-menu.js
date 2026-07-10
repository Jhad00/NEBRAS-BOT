// !─── Modules ────────────────────────────────────────────────
import inquirer from "inquirer";
// !─── Internal Libs ─────────────────────────────────────────
import { color, cli } from "../libs/libs.index.js";
import { clientManager } from "../assets/ass-index.js";
import { createClient, startClient, displayActiveClients } from "./interface-index.js";

// ?─── Main Menu ─────────────────────────────────────────────
export async function startMenu() {
  cli.clear();
console.log(color.cyan.bold("𝗪𝗲𝗹𝗰𝗼𝗺𝗲 𝘁𝗼 𝗡𝗲𝗯𝗿𝗮𝘀."));
  const activeClients = await clientManager.getActiveClients();
  if (activeClients.length > 0) {
    await displayActiveClients();
  }
  cli.nl();

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: color.cyan.bold("Select an action:"),
      choices: [
        { name: "1: Start existing client", value: "run" },
        { name: "2: Create new client", value: "new" },
        { name: "3: Delete existing client", value: "delete" },
        { name: color.red.bold("5: Shutdown HexJS"), value: "exit" },
      ],
    },
  ]);

  handleAction(action);
}

// ?─── Action Handler ────────────────────────────────────────
function handleAction(action) {
  cli.clear();

  switch (action) {
    case "run":
      cli.clear()
      return startClient();

    case "new":
      cli.clear()
      return createClient();

    case "delete":
    case "exit":
      console.log(color.yellow.bold("👋 𝗦𝗲𝗲 𝘆𝗼𝘂 𝘀𝗼𝗼𝗻. 𝗧𝗵𝗮𝗻𝗸𝘀 𝗳𝗼𝗿 𝘂𝘀𝗶𝗻𝗴 𝗡𝗲𝗯𝗿𝗮𝘀."));
      return process.exit(0);

    
  }
}


