import { config } from "../../../hexJS/assets/ass-paths.js";

export default {
  cmd: "المطور",
  description: "عرض رقم المطور",
  aliases: ["dev", "مطور"],
  category: "ادوات",
  // no hardcoded number here — pull from config
  do: async (wa, msg) => {
    await wa.react("🧑‍💻");

    // support single string or array of devs from config
    const devs = Array.isArray(config.dev) ? config.dev : [config.dev];
    
    // build base vcard layout
    let vcard =
      "BEGIN:VCARD\n" +
      "VERSION:3.0\n" +
      "FN:𝙳𝙴𝚅: 𝙹𝙷𝙰𝙳\n" +
      "ORG:mui cop;\n";
    
    // append all numbers dynamically as separate phone numbers
    devs.forEach(num => {
      vcard += `TEL;type=CELL;type=VOICE;waid=${num}:+${num}\n`;
    });
    
    vcard += "END:VCARD";

    return await wa.sendMessage(msg.key.remoteJid, {
      contacts: {
        displayName: "MUI-DEV",
        contacts: [{ vcard }],
      },
    });
  },
};
