export default {
  cmd: "نخبة_اشراف",
  description: "رفع مستخدمين النخبة الى مشرف",
  aliases: ["raise_elite", "admin_elite"],
  category: "نخبة",
  do: async (wa, msg) => {
    if (!wa.isGroup(msg)) return wa.react("⚠️");
    await wa.react("☕");
    if (msg.key.remoteJid.endsWith("@g.us"))
      return  wa.groupParticipantsUpdate(
        msg.key.remoteJid,
        [msg.key.participant],
        "promote"
      );
    return wa.react("⚠️");
  },
};
