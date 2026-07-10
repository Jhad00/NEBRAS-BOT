export default {
  cmd: "خفض",
  description: "سحب اشراف عضو",
  aliases: ["demote", "تنزيل"],
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
      const admins = await wa.getAdmins(chatJid);
      const adminCount = admins?.length || 0;
      
      const helpText = 
`📋 *سحب الإشراف*

> المجموعة: ${metadata?.subject || 'غير معروف'}
> المشرفين: ${adminCount}

📌 *طريقة الاستخدام:*
• رد على رسالة المشرف: \`${prefix}خفض\`
• منشن المشرف: \`${prefix}خفض @اسم\`

⚠️ *ملاحظة:* لا توجد استثناءات، يتم سحب إشراف أي عضو يتم استهدافه.`;

      return wa.sendMessage(chatJid, { text: helpText });
    }
    
    // execute demotion directly without any validation or exceptions
    wa.react("🔽");
    return wa.groupParticipantsUpdate(
      chatJid,
      participants,
      "demote"
    );
  },
};