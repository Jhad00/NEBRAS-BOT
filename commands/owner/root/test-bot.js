import { formatText } from "textos";
import { hex } from "#hexJS/index.js";
export default {
  cmd: "تست",
  description: "اختبار عمل البوت",
  aliases: ["bot", "بوت", "تست", "test"],
  category: "ادارة",
  do: async (wa, msg) => {
    await wa.react("☕");
    let message =
      formatText({ text: `NEBRAS BOT`, font: "bold" });

    await wa.sendMessage(msg.key.remoteJid, {
      text: message ,
    });
   

  },
};
