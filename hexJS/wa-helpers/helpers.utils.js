import { downloadMediaMessage } from "baileys";
import { currentClient_user } from "../assets/ass-index.js";
//? <get target jids from mention>
export async function mentionnedJids(msg) {
  if (!msg.key.remoteJid.endsWith("@g.us")) return null;
  if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid.length > 0)
    return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  return null;
}
//? <get target jid from reply>
export async function replyedJid(msg) {
  if (!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage)
    return null;
  return [msg.message.extendedTextMessage?.contextInfo?.participant];
}
//?<get text from reply>
export async function extractTextFromReply(msg) {
  if (!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage)
    return null;
  return (
    msg.message.extendedTextMessage.contextInfo.quotedMessage.conversation ||
    msg.message.extendedTextMessage.contextInfo.quotedMessage
      .extendedTextMessage.text
  );
}
//? <get admins from participants array>
export async function getAdminsFrom(
  participants,
  options = { includesMe: null, jids: null }
) {
  if (!options.jids || !participants || typeof participants !== "object")
    return null;
  if (!options.includesMe)
    return participants.filter(
      (p) => p.admin !== options.jids.id || p.id !== options.jids.lid
    );

  if (options.includesMe) return participants.filter(p=>p.admin).map((p) => p.id);
  return null;
}
//? <get participants from participants array>
export async function getParticipantsFrom(
  participants,
  options = { includesMe: null, jids: null }
) {
  if (!options.jids || !participants || typeof participants !== "object")
    return null;
  if (!options.includesMe)
    return participants.filter(
      (p) => p.id !== options.jids.id || p.id !== options.jids.lid
    );

  if (options.includesMe) return participants.map((p) => p.id);
  return null;
}
//? <generate key for reply>
export async function extractKeyFromReply(msg) {
  if (!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage)
    return null;
  return {
    remoteJid: msg.key.remoteJid,
    remoteJidAlt: undefined,
    fromMe: false,
    id: msg.message?.extendedTextMessage?.contextInfo?.stanzaId,
    participant: msg.message?.extendedTextMessage?.contextInfo?.participant,
  };
}
//? <get media buffer>

export async function getMediaBufferFromReply(msg) {
  if (!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage)
    return null;
  const quoted = msg.message?.extendedTextMessage?.contextInfo;
  // block text-only messages, allow media including stickers
  if (
    quoted.quotedMessage.conversation ||
    quoted.quotedMessage.extendedTextMessage
  )
    return null;
  const mediaMessage = {
    key: {
      remoteJid: msg.key.remoteJid,
      id: quoted.stanzaId,
      participant: quoted.participant,
    },
    message: quoted.quotedMessage,
  };
  const buffer = await downloadMediaMessage(
  mediaMessage,
  "buffer",
  {},
  { reuploadRequest: currentClient_user.waClient.updateMediaMessage }
);
  if (quoted.quotedMessage.imageMessage)
    return {
      type: "image",
      viewOnce: quoted.quotedMessage.imageMessage.viewOnce || false,
      buffer: buffer,
    };
  if (quoted.quotedMessage.videoMessage)
    return {
      type: "video",
      viewOnce: quoted.quotedMessage.videoMessage.viewOnce || false,
      buffer: buffer,
    };
  if (quoted.quotedMessage.audioMessage)
    return {
      type: "audio",
      viewOnce: quoted.quotedMessage.audioMessage.viewOnce || false,
      buffer: buffer,
    };
  // add support for sticker buffer extraction
  if (quoted.quotedMessage.stickerMessage)
    return {
      type: "sticker",
      viewOnce: false,
      mimetype: quoted.quotedMessage.stickerMessage.mimetype || "image/webp",
      buffer: buffer,
    };

  // add support for document buffer extraction
  if (quoted.quotedMessage.documentMessage || quoted.quotedMessage.documentWithCaptionMessage) {
    const docMsg = quoted.quotedMessage.documentMessage || quoted.quotedMessage.documentWithCaptionMessage?.message?.documentMessage;
    return {
      type: "document",
      viewOnce: false,
      mimetype: docMsg?.mimetype || "application/octet-stream",
      filename: docMsg?.fileName || docMsg?.title || null,
      buffer: buffer,
    };
  }

  return null;
}
//? <return linked devices check>
export async function getUsersLinkedDevices(
  id,
  options = { waClient: currentClient_user.waClient }
) {
  if (!id) return null;
  let jids = [];
  let result = { type: null, length: 0, jids: [], users: [] };
  if (typeof id === "string" && id.endsWith("@g.us")) {
    jids = await options.waClient.getParticipants(id);
    result.type = "group check";
  }

  if (
    typeof id === "object" &&
    (id[0].endsWith("@lid") || id[0].endsWith("@s.whatsapp.net"))
  ) {
    jids = id;
    result.type = "single check";
  }
  if (
    typeof id === "string" &&
    (id.endsWith("@lid") || id.endsWith("@s.whatsapp.net"))
  ) {
    jids = [id];
    result.type = "single check";
  }

  for (const jid of jids) {
    const devices =
      (await options.waClient.getUSyncDevices([jid], true)).length - 1;
    if (devices && devices > 0) {
      result.length++;
      result.jids.push(jid);
      result.users.push({ mention: "@" + jid.split("@")[0], count: devices });
    }
  }
  if (result.length !== 0) return result;
  return null;
}
