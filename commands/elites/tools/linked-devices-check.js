import { formatText } from "textos";
import { hex } from "#hexJS/index.js";
const keywords = ["prv","خاص"]
export default {
  cmd: "بوتات",
  description: "عرض الاجهزة المتصلة لاعضاء المجموعة",
  aliases: ["متصلة", "linked", "bots"],
  category: "ادوات",
  do: async (wa, msg, args, botId, sender) => {
    await wa.react("🔗");
    let chatId = msg.key.remoteJid;
    if(args[0]&&keywords.includes(args[0])) chatId= sender.participantAlt ||msg.key.remoteJid
    const id =
      (await wa.replyedJid(msg)) ||
      (await wa.mentionnedJids(msg)) ||
      msg.key.remoteJid;
    const devices = await wa.getUsersLinkedDevices(id);
    if (!devices) return wa.react("⚠️");
    const lastIndex = devices.length - 1;
    let message =
      formatText({
        text: "This is users linked bot(s) on this chat:",
        font: "bold",
      }) + "\n";
    message += `> ❑ *𝙲𝚑𝚎𝚌𝚔 𝚝𝚢𝚙𝚎: ${devices.type}*` + "\n";
    message += `> ❑ *𝚄𝚜𝚎𝚛𝚜 𝚕𝚎𝚗𝚐𝚝𝚑: ${devices.length}*` + "\n\n";
    devices.users.forEach((user, idx) => {
      message += ` ➦ *𝚄𝚜𝚎𝚛:* ${user.mention}` + "\n";
      message += ` ➥ *𝙱𝚘𝚝(𝚜) 𝚌𝚘𝚞𝚗𝚝: ${user.count}*` + "\n";
      if (lastIndex !== idx) message += `--------------------------\n`;
    });
    await wa.sendMessage(chatId, {
      text: message + hex.bot_version,
      mentions: devices.jids,
    });
  },
};
