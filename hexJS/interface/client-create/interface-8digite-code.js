//!modules
import inquirer from "inquirer";
import { color, definer, delay } from "../../libs/libs.index.js";
import { testPhone, cli } from "../../libs/libs.index.js";
import { initClient } from "../../wa-socket/wa-index.js";
import { validationManager } from "../../assets/ass-index.js";
import { requestLinkCode } from "../../wa-socket-plus/wsp.index.js";
import { startMenu } from "../interface-index.js";
import { box } from "bumbum-cli";
export async function With8DigiteCode() {
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
  const { newClientPhone } = await inquirer.prompt([
    {
      type: "input",
      name: "newClientPhone",
      message: color.green.bold(
        "Enter a Phone number to recieve 8-digite code :"
      ),
      validate: async (input) => {
        const trimmed = input.trim().toLowerCase();
        if (!trimmed) return "Phone number name connot be empty !";
        if (!testPhone(trimmed).valid)
          return "invalid phone number , must be between 8-15 character. ETC : +972778xxxxx || 972883xxxxx";
        return true;
      },
    },
  ]);
  const testNumber = testPhone(newClientPhone);
  cli.clear();
  console.log(color.green.bold("Creating new client..."));
  await requestLinkCode(
    testNumber.cleaned,
    newClient,
    1,
    async ({ status, code }) => {
      switch (status) {
        case "waiting":
          console.log(
            box(
              color.white.bold("This is your code: ") + color.blue.bold(code),
              {
                borderColor: "white",
              }
            )
          );
          break;

        case "connected":
        cli.clear()
         console.log(
            box(
              color.green.bold("Code was paired , Witing for connect..."),
              {
              borderColor:"white",
              borderStyle:"round"
              }
            )
          );

          await initClient(newClient);
          break;
        case "closed":
        cli.clear()
  
          console.log(
            box(color.green.bold("Cannot get code. return to menu"), {
              borderColor: "red",
            })
          );
                await delay(3000)
          await startMenu();
          break;
      }
    }
  );
}