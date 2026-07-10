// !─── Node modules ───────────────────────────
import inquirer from "inquirer";

// !─── Libraries ─────────────────────────────
import { color, box, definer, cli } from "../libs/libs.index.js";

// !─── Imports ───────────────────────────────
import { clientManager, validationManager } from "../assets/ass-index.js";
import { startMenu } from "./interface-index.js";
import { With8DigiteCode } from "./client-create/interface-8digite-code.js";
import { WithQRcode } from "./client-create/interface-QRcode.js";
import { displayExistingClient } from "./interface.components.js";

// ?─── Helper function to display active clients ─────────

// ?─── Main function to create a new client ─────────────
export async function createClient() {
  cli.clear();
  console.log(color.green.bold("Create a new client:"));

  const allClients = await clientManager.getAllClients();
  if (allClients.length > 0) await displayExistingClient();

  const { chooseNewClientLinkMethode } = await inquirer.prompt([
    {
      type: "list",
      name: "chooseNewClientLinkMethode",
      message: color.greenLight.bold("Select an option to bind new client :\n"),
      choices: [
        { name: color.greenDark.bold("With QRcode"), value: "qr" },
        {
          name: color.gray.bold("With 8-digit code"),
          value: "digite",
        },
        { name: color.red.bold("Back to menu"), value: "back" },
      ],
    },
  ]);

  switch (chooseNewClientLinkMethode) {
    case "qr":
      cli.clear();
      return WithQRcode();
    case "digite":
      cli.clear();
      return With8DigiteCode();
    case "back":
      cli.clear();
      return startMenu();
  }
}
