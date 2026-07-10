import { params } from "../assets/ass-index.js";
// ? get client JIDs
export const exec = {
  hasPrefix: async (text) => {
    return params.prefixes.find((prefix) => text.startsWith(prefix)) || false;
  },
};
export async function isGroup(msg) {
  return msg.key.remoteJid.endsWith("@g.us");
}
