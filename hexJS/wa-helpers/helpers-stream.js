import { currentClient_user } from "../assets/ass-index.js";

const DEFAULT_MAX_STEPS = 8;
const DEFAULT_STEP_DELAY = 0;

// baileys v7 sendMessage({text, mentions}) auto-builds contextInfo.mentionedJid internally
// BUT the edit path (edit: sent.key) does NOT re-build it — it sends a raw proto patch
// so we must explicitly inject contextInfo.mentionedJid on every edit call ourselves
// otherwise the @number in the text has no backing entry and renders as plain text
function buildMentionContent(text, mentions) {
  if (!mentions || mentions.length === 0) return { text };
  return {
    text,
    mentions,
    // explicit contextInfo ensures the edit proto carries mentionedJid, not just the first send
    contextInfo: { mentionedJid: mentions },
  };
}

// find a safe cut point that never lands inside an @number token mid-stream
// splitting "hello @9365" at position 10 would send "@936" which is just noise
function safeCut(fullText, rawCursor) {
  if (rawCursor >= fullText.length) return fullText.length;

  const chunk = fullText.slice(0, rawCursor);
  const atIdx = chunk.lastIndexOf("@");

  if (atIdx !== -1) {
    const tail = chunk.slice(atIdx + 1);
    // if everything after the last @ is digits we are mid-mention -> back up to before @
    if (/^\d*$/.test(tail)) return atIdx;
  }

  return rawCursor;
}

// typewriter stream using edit-message — carries contextInfo.mentionedJid on every step
// so @tags never drop back to plain numbers during or after the animation
export async function streamText(jid, text, options = {}, waClient = currentClient_user.waClient) {
  if (!text) return null;

  const {
    quoted,
    messageId,
    mentions,
    maxSteps = DEFAULT_MAX_STEPS,
    stepDelayMs = DEFAULT_STEP_DELAY,
  } = options;

  const totalLen = text.length;
  const step = Math.max(2, Math.ceil(totalLen / maxSteps));

  // first chunk — cut safely to avoid sending half an @number
  const firstCut = safeCut(text, Math.min(step, totalLen));
  const firstChunk = text.slice(0, firstCut);

  // initial send — baileys builds contextInfo here automatically from mentions
  // but we also pass it explicitly so both code paths are covered
  const sent = await waClient.sendMessage(
    jid,
    buildMentionContent(firstChunk, mentions),
    { quoted, messageId }
  );

  let cursor = firstCut;

  while (cursor < totalLen) {
    const rawNext = Math.min(cursor + step, totalLen);
    cursor = safeCut(text, rawNext);

    if (stepDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, stepDelayMs));

    try {
      // inject contextInfo.mentionedJid explicitly — edit proto doesn't derive it from mentions[]
      await waClient.sendMessage(jid, {
        ...buildMentionContent(text.slice(0, cursor), mentions),
        edit: sent.key,
      });
    } catch (e) {
      // mid-animation failure — final sync below still lands the correct full text
      break;
    }
  }

  // final guarantee: bubble always ends with exact full text and intact @tags
  if (cursor < totalLen) {
    try {
      await waClient.sendMessage(jid, {
        ...buildMentionContent(text, mentions),
        edit: sent.key,
      });
    } catch (e) {}
  }

  return sent;
}
