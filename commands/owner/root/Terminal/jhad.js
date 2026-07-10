export default {
  name: "jhad",
  aliases: [],
  description: "Reply with hi",

  run: async (wa, msg, args, botId) => {
    return wa.sendMessage(msg.key.remoteJid, { text: "hi" });
  },
};