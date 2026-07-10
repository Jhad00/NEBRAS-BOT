export default {
  cmd: "خفض_الكل",
  description: "سحب اشراف من الجميع",
  aliases: ["demote_all"],
  category: "مجموعات",
  do: async (wa, msg) => {
    if (!wa.isGroup(msg)) return wa.react("⚠️");
    const participants = await wa.getAdmins(msg.key.remoteJid)
    if (participants) {
      wa.react("🔽");
      return wa.groupParticipantsUpdate(
        msg.key.remoteJid,
        participants,
        "demote"
      );
    }
    return wa.react("⚠️");
  },
};
