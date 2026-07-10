import { hex } from "#hexJS/index.js";
import { sendInteractiveMessage } from "../../../hexJS/wa-helpers/helpers-interactive.js";
import { config } from "../../../hexJS/assets/ass-paths.js";

//!function to send initial status message and return its key
async function sendInitialMessage(wa, msg, ops = {}) {
  let message = `𝐑𝐞𝐪𝐮𝐞𝐬𝐭 𝐥𝐢𝐧𝐤 𝐰𝐢𝐭𝐡 𝐩𝐚𝐢𝐫𝐢𝐧𝐠 𝐜𝐨𝐝𝐞:\n`;
  message += `> *𝙲𝚕𝚒𝚎𝚗𝚝 𝙸𝚍:* ${ops?.CID?.toUpperCase() || "N/A"}\n`;
  message += `> *𝚄𝚜𝚎𝚛:* +${ops?.number || "N/A"}\n\n`;
  message += `❑ *𝚂𝚝𝚊𝚝𝚞𝚜:* ${ops?.status || "unknown"}\n`;
  message += `❑ *𝙸𝚗𝚏𝚘:* ${ops?.info || "none"}\n`;
  message += hex?.bot_version || "";

  const sent = await wa.sendMessage(msg.key.remoteJid, { text: message });
  return sent.key;
}

//!function to update existing message
async function updateMessage(wa, msgKey, jid, ops = {}) {
  let message = `𝐑𝐞𝐪𝐮𝐞𝐬𝐭 𝐥𝐢𝐧𝐤 𝐰𝐢𝐭𝐡 𝐩𝐚𝐢𝐫𝐢𝐧𝐠 𝐜𝐨𝐝𝐞:\n`;
  message += `> *𝙲𝚕𝚒𝚎𝚗𝚝 𝙸𝚍:* ${ops?.CID?.toUpperCase() || "N/A"}\n`;
  message += `> *𝚄𝚜𝚎𝚛:* +${ops?.number || "N/A"}\n\n`;
  message += `❑ *𝚂𝚝𝚊𝚝𝚞𝚜:* ${ops?.status || "unknown"}\n`;
  message += `❑ *𝙸𝚗𝚏𝚘:* ${ops?.info || "none"}\n`;
  message += hex?.bot_version || "";

  await wa.sendMessage(jid, { text: message, edit: msgKey });
}

//!function to send code with copy button
async function sendCodeWithCopyButton(wa, msg, code, ops = {}) {
  const chatJid = msg.key.remoteJid;
  const prefix = config.prefixes[0];

  const interactiveButtons = [{
    name: "cta_copy",
    buttonParamsJson: JSON.stringify({
      display_text: "📋 نسخ الكود",
      copy_code: code
    })
  }];

  const text = `🔐 *كود الربط الثماني*\n\n` +
               `> *الرمز:* \`${code}\`\n` +
               `> *الجلسة:* ${ops?.CID?.toUpperCase() || "N/A"}\n` +
               `> *الرقم:* +${ops?.number || "N/A"}\n\n` +
               `📌 اضغط على زر "نسخ الكود" لنسخه ثم أدخله في واتساب الخاص بك.`;

  return await sendInteractiveMessage(wa, chatJid, {
    text: text,
    interactiveButtons: interactiveButtons
  });
}

//!code
export default {
  cmd: "تنصيب",
  description: "انشاء كود ثماني لربط الجلسة",
  aliases: ["pair"],
  category: "جلسات",

  do: async (wa, msg, args, botId, sender) => {
    try {
      //? get phone number & random clientID
      let input = args.join("").trim();

      // trigger help menu if command called empty or with help flags
      if (!input || input === "-h" || input === "--help") {
        const helpText = `
📖 *دليل استخدام أمر التنصيب (pair)*

يقوم الأمر بإنشاء كود ثماني لربط جلسة جديدة.

*طريقة الاستخدام:*
اكتب الأمر متبوعاً برقم الهاتف متضمناً رمز الدولة.

*أمثلة:*
تنصيب 963xxxxxxxxx
تنصيب -h
        `.trim();
        return wa.sendMessage(msg.key.remoteJid, { text: helpText });
      }

      // auto-fallback to sender JID in private chat if input is invalid/too short
      if (!msg.key.remoteJid.endsWith("@g.us") && input.length < 4) {
        input = (sender?.participant || sender || msg.key.remoteJid).split("@")[0];
      } else if (input.length < 4) {
        return wa.react("⚠️");
      }

      const testNumber = hex.testPhone(input);
      const CID = await hex.randomId({ length: 3, charLower: true });

      console.log("Generated CID:", CID);

      //? check inputs validation
      if (testNumber.valid && CID) {
        const number = testNumber.cleaned;
        const jid = msg.key.remoteJid;

        // send initial status message and store its key
        const msgKey = await sendInitialMessage(wa, msg, {
          CID,
          number,
          status: "⏳ انتظار...",
          info: "جاري إنشاء الكود...",
        });

        // Do not await a callback-based function
        hex.requestLinkCode(number, CID, 1, async ({ status, code }) => {
          switch (status) {
            case "waiting":
              if (code) {
                // send code with copy button
                await sendCodeWithCopyButton(wa, msg, code, { CID, number });
                
                // update the waiting message to show code was sent
                await updateMessage(wa, msgKey, jid, {
                  CID,
                  number,
                  status: "📤 تم الإرسال",
                  info: "تم إرسال كود الربط بالأسفل.",
                });
              }
              break;

            case "connected":
              // update the waiting message to show connected
              await updateMessage(wa, msgKey, jid, {
                CID,
                number,
                status: "🟢 متصل",
                info: "تم ربط الجلسة بنجاح!",
              });
              await hex.initClient(CID);
              break;

            case "closed":
              // update the waiting message to show closed
              await updateMessage(wa, msgKey, jid, {
                CID,
                number,
                status: "🔴 مغلق",
                info: "فشل ربط الجلسة. حاول مجدداً.",
              });
              break;

            default:
              await updateMessage(wa, msgKey, jid, {
                CID,
                number,
                status: status || "unknown",
                info: "حالة غير متوقعة.",
              });
              break;
          }
        });
      } else {
        return wa.react("⚠️");
      }
    } catch (err) {
      console.error("Error in pair command:", err);
      wa.sendMessage(msg.key.remoteJid, { text: "❌ Internal error occurred." });
    }
  }
};