// text parsers and formatting utilities
export function getTextFromMsg(msg) {
  return (
    msg?.body ||
    msg?.text ||
    msg?.message?.conversation ||
    msg?.message?.extendedTextMessage?.text ||
    ""
  );
}

export function parseInvocation(rawText) {
  const text = (rawText || "").trim();
  if (!text || text[0] !== "<") return null;
  const rest = text.slice(1).trim();
  if (!rest) return { subcmd: null, subargs: [] };

  const parts = rest.split(/\s+/g);
  return { subcmd: parts[0], subargs: parts.slice(1) };
}

export function safeTruncate(text, max = 3000) {
  const t = String(text || "").trim();
  return t.length <= max ? t : t.slice(0, max) + "\n\n...[Truncated]";
}

export function shellQuote(str) {
  return `'${String(str || "").replace(/'/g, `'\\''`)}'`;
}