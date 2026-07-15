// !─── Node Modules ──────────────────────────────────────────
import inquirer from "inquirer";
import { color, cli } from "bumbum-cli";
// !─── Imports ──────────────────────────────────────────────
import { clientManager } from "../assets/ass-index.js";
import { startMenu, displayActiveClients } from "./interface-index.js";
import { initClient } from "../wa-socket/wa-index.js";

// ?─── Start Client ─────────────────────────────────────────
export async function startClient() {
  cli.clear();
  console.log(color.blueLight.bold("Start existing client:"));

  const clients = {
    active: await clientManager.getActiveClients(),
    all: await clientManager.getAllClients(),
  };

  if (clients.active.length > 0) {
    await displayActiveClients();
  }

  let choices = buildClientChoices(clients);

  const { selectedClient } = await inquirer.prompt([
    {
      type: "list",
      name: "selectedClient",
      message: color.greenLight.bold("Choose a client to run:\n"),
      choices,
    },
  ]);

  if (selectedClient === "back") {
    return startMenu();
  }

  cli.clear();
  console.log(color.greenLight.bold(`Starting client...`));
  await initClient(selectedClient);
}

// ?─── Helpers ──────────────────────────────────────────────
function buildClientChoices(clients) {
  if (clients.all.length === 0) {
    console.log(color.grayDark.bold("No client registered !!"));
    cli.nl();
  }

  const choices =
    clients.all
      .filter((client) => !clients.active.includes(client))
      .map((client) => ({
        name: `👤: ${color.white.bold(client.toUpperCase())}`,
        value: client,
      })) || [];

  // Always add back option
  choices.push({ name: color.yellow.bold("Return to menu"), value: "back" });

  return choices;
}
