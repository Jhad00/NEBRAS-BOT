import {
  convertToInteractiveMessage,
  getButtonArgs,
  getButtonType,
  validateInteractiveMessageContent,
  InteractiveValidationError,
} from "@xerro/buttonx";
import {
  generateWAMessageFromContent,
  normalizeMessageContent,
  isJidGroup,
  generateMessageIDV2,
  generateMessageID,
} from "baileys";
import { defaultFooter } from "../assets/ass-vars.js";

// buttonx never wires contextInfo/mentions into the proto, so we rebuild
// the same pipeline here and splice mentionedJid into interactiveMessage manually.
export async function sendInteractiveMessage(wa, jid, data) {
  if (!data.footer) {
    data.footer = defaultFooter;
  }

  // pull mentions out before conversion, buttonx would drop them at the wrong nesting level
  const mentionedJid = data.contextInfo?.mentionedJid ?? data.mentions ?? null;

  const converted = convertToInteractiveMessage(data);

  const contentCheck = validateInteractiveMessageContent(converted);
  if (!contentCheck.valid) {
    throw new InteractiveValidationError("Converted interactive content invalid", {
      context: "sendInteractiveMessage.validateInteractiveMessageContent",
      errors: contentCheck.errors,
      warnings: contentCheck.warnings,
    });
  }

  // mentionedJid has to live INSIDE interactiveMessage.contextInfo, not as a sibling key
  if (mentionedJid && converted.interactiveMessage) {
    converted.interactiveMessage.contextInfo = {
      ...(converted.interactiveMessage.contextInfo ?? {}),
      mentionedJid,
    };
  }

  const userJid = wa.authState?.creds?.me?.id ?? wa.user?.id;

  const fullMsg = generateWAMessageFromContent(jid, converted, {
    logger: wa.logger,
    userJid,
    messageId: generateMessageIDV2 ? generateMessageIDV2(userJid) : generateMessageID?.(),
    timestamp: new Date(),
  });

  const normalizedContent = normalizeMessageContent(fullMsg.message);
  const buttonType = getButtonType(normalizedContent);
  const additionalNodes = [];

  if (buttonType) {
    const isPrivate = !isJidGroup(jid);
    additionalNodes.push(getButtonArgs(normalizedContent));
    if (isPrivate) additionalNodes.push({ tag: "bot", attrs: { biz_bot: "1" } });
  }

  await wa.relayMessage(jid, fullMsg.message, {
    messageId: fullMsg.key.id,
    additionalNodes,
  });

  return fullMsg;
}