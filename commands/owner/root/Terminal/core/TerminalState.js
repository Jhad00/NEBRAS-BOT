// state manager for terminal sessions (cwd, admins)
export const cwdByJid = new Map();

const ADMIN_JIDS = (process.env.ADMIN_JIDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function isAllowed(msg) {
  if (ADMIN_JIDS.length === 0) return true;
  const jid = msg?.key?.participant || msg?.key?.remoteJid || "";
  return ADMIN_JIDS.includes(jid) || ADMIN_JIDS.includes(msg?.key?.remoteJid || "");
}

export function getChatJid(msg) {
  return msg?.key?.remoteJid || "";
}

export function getCwdForChat(jid) {
  if (!cwdByJid.has(jid)) cwdByJid.set(jid, process.cwd());
  return cwdByJid.get(jid);
}

export function setCwdForChat(jid, newCwd) {
  if (newCwd && typeof newCwd === "string") cwdByJid.set(jid, newCwd);
}