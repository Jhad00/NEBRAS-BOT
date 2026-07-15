export default {
  cmd: "حذف",
  description: "حذف رسالة بالرد عليها",
  aliases: ["delete", "مسح"],
  category: "مجموعات",
  do: async (wa, msg, args = []) => {
    const input = args.join(" ").trim();
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    const hasReply = !!contextInfo?.stanzaId;

    // trigger help menu if called empty (no reply) or with help flags
    if (!hasReply || input === "-h" || input === "--help") {
      const helpText = `
📖 *دليل استخدام أمر الحذف (delete)*

يقوم الأمر بحذف الرسائل من المحادثة.

*الصلاحيات:*
- يمكنك دائماً حذف رسائلك الخاصة.
- في المجموعات: تحتاج إلى إشراف (Admin) لحذف رسائل الآخرين.

*طريقة الاستخدام:*
قم بالرد على الرسالة المراد حذفها واكتب الأمر.

*أمثلة:*
حذف
حذف -h
      `.trim();
      return wa.sendMessage(msg.key.remoteJid, { text: helpText });
    }

    // get the author of the replied message
    const targetJid = contextInfo.participant || msg.key.remoteJid;

    // safely extract bot's normal JID
    const botIdRaw = wa.user?.id || wa.user?.jid || "";
    const botJid = botIdRaw ? (botIdRaw.split(":")[0] + "@s.whatsapp.net") : "";
    
    // extract bot's LID (Baileys v6.8.0+ stores it in wa.user.lid)
    const botLidRaw = wa.user?.lid || "";
    const botLid = botLidRaw ? (botLidRaw.split(":")[0] + "@lid") : "";

    // check if the replied message is from the bot (matches normal JID or LID)
    const isFromMe = targetJid === botJid || targetJid === botLid;

    // manually construct the exact key using the matched targetJid
    const keyToDelete = {
      remoteJid: msg.key.remoteJid,
      fromMe: isFromMe,
      id: contextInfo.stanzaId,
      participant: targetJid
    };

    try {
      await wa.sendMessage(msg.key.remoteJid, { delete: keyToDelete });
    } catch (err) {
      console.error("Delete error:", err);
      wa.react("⚠️");
    }
  },
};
