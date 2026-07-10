import { formatText } from "textos";
import { hex } from "#hexJS/index.js";

// build the caption sent alongside the resent/retrieved media
const successMessage = async (mediaType, mode) => {
  const text =
    mode === "re"
      ? `The ${mediaType.toUpperCase()} has been successfully resent by «NEBRAS» bot.`
      : `The hidden ${mediaType.toUpperCase()} has been successfully retrieved by «NEBRAS» bot.`;
  return (
    formatText({
      text: text,
      font: "bold",
    }) +
    "\n" +
    hex.bot_version
  );
};

// pull raw text out of any msg shape
function getText(msg) {
  return (
    msg?.text ||
    msg?.body ||
    msg?.message?.conversation ||
    msg?.message?.extendedTextMessage?.text ||
    ""
  );
}

// parse flags from the command text
function getViewMode(msg) {
  const t = getText(msg).toLowerCase();
  if (/\s-h(\s|$)/.test(t)) return "help";
  if (/\s-o(\s|$)/.test(t)) return "viewonce";
  if (/\s-c(\s|$)/.test(t)) return "private";
  return "normal";
}

export default {
  cmd: "عرض",
  description: "استرجِع أو أعد إرسال الوسائط (صورة / فيديو / صوت).",
  aliases: ["عين", "view"],
  category: "ادوات",
  do: async (wa, msg) => {
    const mode = getViewMode(msg);

    // check the replied message actually has media
    let hasMediaReply = false;
    try {
      const media = await wa.getMediaBufferFromReply(msg);
      if (media?.buffer && media?.type) {
        hasMediaReply = true;
      }
    } catch (_) {}

    // show help if:
    // 1. user asked for it (-h)
    // 2. or no media reply found
    if (mode === "help" || !hasMediaReply) {
      const helpText = `
📖 *دليل استخدام أمر العرض (view)*

يقوم الأمر بعرض أو إعادة إرسال الوسائط (صورة / فيديو / صوت).

*الخيارات:*
- -o : إرسال الوسائط كـ "مرة واحدة" (View Once) 🕐
- -c : إرسال الوسائط إلى خاص من أرسل الأمر 🤫
- -h أو --help : عرض هذه المساعدة.

*طريقة الاستخدام:*
قم بالرد على صورة أو فيديو أو صوت ثم استخدم الأمر.

*أمثلة:*
عرض
عرض -o
عرض -c
      `.trim();
      return wa.sendMessage(msg.key.remoteJid, { text: helpText });
    }

    // skip reaction in private mode to stay silent
    if (mode !== "private") wa.react("👁️");

    // get media buffer & info
    const media = await wa.getMediaBufferFromReply(msg);

    if (!media || !media.type) {
      if (mode !== "private") {
        wa.react("⚠️");
        return wa.sendMessage(msg.key.remoteJid, {
          text: "⚠️ لا توجد وسائط صالحة في الرسالة المرد عليها.",
        });
      } else {
        return; // silent mode, do nothing
      }
    }

    const jid = msg.key.remoteJid;
    const isViewOnce = mode === "viewonce";
    const isHidden = media.viewOnce === true;
    const caption = await successMessage(media.type, isHidden ? "hidden" : "re");

    // get the invoker's actual JID (user who sent the command)
    const invokerJid = (msg.key.participant || msg.key.remoteJid).replace(/:\d+/, "");
    
    // private mode -> DM the invoker directly
    const targetJid = mode === "private" ? invokerJid : jid;

    try {
      switch (media.type) {
        // image
        case "image":
          await wa.sendMessage(targetJid, {
            image: media.buffer,
            caption: caption,
            viewOnce: isViewOnce,
          });
          break;

        // video
        case "video":
          await wa.sendMessage(targetJid, {
            video: media.buffer,
            caption: caption,
            viewOnce: isViewOnce,
          });
          break;

        // audio / voice note
        case "audio":
        case "voice":
        case "ptt": {
          const mimetype = media.mimetype || "audio/mpeg";
          const pttFlag = !!media.ptt || /voice|ptt/.test(media.type);
          try {
            await wa.sendMessage(targetJid, {
              audio: media.buffer,
              mimetype: mimetype,
              ptt: pttFlag,
              viewOnce: isViewOnce,
            });
          } catch {
            // fallback: send as document if audio send fails
            const filename =
              `audio_${Date.now()}` + (mimetype.includes("ogg") ? ".ogg" : ".mp3");
            await wa.sendMessage(targetJid, {
              document: media.buffer,
              mimetype: mimetype,
              fileName: filename,
              viewOnce: isViewOnce,
            });
          }
          break;
        }

        default:
          if (mode !== "private") wa.react("⚠️");
          return;
      }

      // react success if not private
      if (mode !== "private") wa.react("✅");
    } catch (e) {
      console.error("Error sending media:", e);
      if (mode !== "private") wa.react("⚠️");
    }
  },
};
