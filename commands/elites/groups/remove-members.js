export default {
  cmd: "طرد",
  description: "طرد عضو من المجموعة",
  aliases: ["kick", "ابلع"],
  category: "مجموعات",
  do: async (wa, msg) => {
    // group check
    if (!wa.isGroup(msg)) return wa.react("⚠️");
    
    const chatJid = msg.key.remoteJid;
    const prefix = msg.prefix || ".";
    
    // get target from mention or reply
    const mentioned = await wa.mentionnedJids(msg);
    const replied = await wa.replyedJid(msg);
    const participants = mentioned || replied || null;
    
    // if no target -> show help menu
    if (!participants) {
      await wa.react("ℹ️");
      
      const metadata = await wa.fetchGroup(chatJid);
      const memberCount = metadata?.participants?.length || 0;
      
      const helpText = 
`📋 *طرد عضو*

> المجموعة: ${metadata?.subject || 'غير معروف'}
> الأعضاء: ${memberCount}

📌 *طريقة الاستخدام:*
• رد على رسالة العضو: \`${prefix}طرد\`
• منشن العضو: \`${prefix}طرد @اسم\`

⚠️ *ملاحظة:* لا توجد استثناءات، يتم طرد أي عضو يتم استهدافه.`;

      return wa.sendMessage(chatJid, { text: helpText });
    }
    
    // execute kick directly without any validation or exceptions
    wa.react("👋");
    return wa.groupParticipantsUpdate(
      chatJid,
      participants,
      "remove"
    );
  },
};