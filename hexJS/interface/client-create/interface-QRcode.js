//!modules
import inquirer from "inquirer";
import { color, cli } from "../../libs/libs.index.js";
import { createClient } from "../interface-index.js";
import { validationManager } from "../../assets/ass-index.js";
import { initClient } from "../../wa-socket/wa-index.js";
export async function WithQRcode() {
  const { newClient } = await inquirer.prompt([
    {
      type: "input",
      name: "newClient",
      message: color.green.bold("Enter a name for the new client :"),
      validate: async (input) => {
        const trimmed = input.trim().toLowerCase();
        if (!trimmed) return "Client name connot be empty !";
        const avariable = await validationManager.isClientAvailable(trimmed);
        if (!avariable)
          return "Invalid client name.Must be 3-20 characters and uniquie.";
        return true;
      },
    },
  ]);
  const clientName = newClient.trim().toLowerCase();
  if (["exit", "back"].includes(clientName)) {
    cli.clear();
    return createClient();
  }
  cli.clear();
  console.log(color.green.bold("Creating new client..."));
  await initClient(clientName, { bindType: "qr", Phone: null });
}
