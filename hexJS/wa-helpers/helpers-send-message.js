import { currentClient_user } from "../assets/ass-index.js";
import { sendButtons as xerroSendButtons } from "@xerro/buttonx";
import { color } from "bumbum-cli";
//
export async function react(
  emojie,
  waClient = currentClient_user.waClient,
  msg = currentClient_user.msg
) {
  if (!emojie)
    return console.log(
      color.red("Emojie is required, etc: await react('emojie') ")
    );

  // snapshot key at call time — currentClient_user.msg may already point
  // to a newer message by the time a slow command finishes
  const targetKey = msg?.key;
  if (!targetKey) return;

  await waClient.sendMessage(msg.key.remoteJid, {
    react: { text: emojie, key: targetKey },
  });
}

// Native flow buttons helper integration
export async function sendButtons(
  jid,
  data,
  options = {},
  waClient = currentClient_user.waClient
) {
  return await xerroSendButtons(waClient, jid, data, options);
}
