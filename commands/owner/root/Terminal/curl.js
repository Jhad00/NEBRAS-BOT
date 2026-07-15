import { spawn } from "child_process";
import { getCwdForChat } from "./core/TerminalState.js";

// helper to build a visual progress bar
function buildProgressBar(percent) {
  const totalBars = 12;
  const filledBars = Math.floor((percent / 100) * totalBars);
  const emptyBars = totalBars - filledBars;
  return `[${"█".repeat(filledBars)}${"░".repeat(emptyBars)}]`;
}

export default {
  name: "curl",
  aliases: [],
  description: "Advanced curl command with beautiful live progress",

  run: async (wa, msg, args) => {
    const jid = msg.key.remoteJid;
    const cwd = getCwdForChat(jid);
    
    // combine arguments to support shell features like redirects (>)
    const fullCommand = ["curl", ...args].join(" ");

    // send initial starting message
    let textMsg = `*⬇️ Downloading File...*\n*📍:* \`${cwd}\`\n*⌨️:* \`${fullCommand}\`\n*⏳:* \`Connecting to server...\``;
    const sentMsg = await wa.sendMessage(jid, { text: textMsg });

    // spawn as a child process with shell enabled to read data stream
    const child = spawn(fullCommand, { cwd, shell: true });

    let lastUpdate = Date.now();
    let finalError = "";

    child.stderr.on("data", (data) => {
      const chunk = data.toString();
      finalError += chunk;

      // split output by carriage return/newline to get the latest progress row
      const lines = chunk.split(/[\r\n]+/);
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        
        // validate if this line is a curl progress table row (contains numbers and ~11 columns)
        if (parts.length >= 11 && !isNaN(parts[0]) && parts[0] !== "") {
          const percent = parseInt(parts[0], 10);
          const totalSize = parts[1];
          const downloaded = parts[3];
          const speed = parts[11] || parts[6] || "0"; 
          const timeLeft = parts[10] || "--:--:--";

          // update message every 2 seconds to avoid WhatsApp rate limiting
          if (Date.now() - lastUpdate > 2000) {
            lastUpdate = Date.now();
            const bar = buildProgressBar(percent);
            const progressText = `*⬇️ Downloading File...*\n*📍:* \`${cwd}\`\n\n*📊 Progress:* \`${bar} ${percent}%\`\n*💾 Size:* \`${downloaded} / ${totalSize}\`\n*🚀 Speed:* \`${speed}/s\`\n*⏳ Time Left:* \`${timeLeft}\``;
            
            // edit the message seamlessly
            wa.sendMessage(jid, { text: progressText, edit: sentMsg.key }).catch(() => {});
          }
        }
      }
    });

    child.on("close", async (code) => {
      if (code === 0) {
        const successText = `*✅ Download Complete!*\n*📍:* \`${cwd}\`\n*⌨️:* \`${fullCommand}\`\n\n*🔽 The file has been successfully saved.*`;
        await wa.sendMessage(jid, { text: successText, edit: sentMsg.key }).catch(() => {});
      } else {
        // extract the specific error line from curl if it fails
        const errorLine = finalError.split(/[\r\n]+/).find(l => l.toLowerCase().includes('curl:')) || "Unknown error";
        const failText = `*❌ Download Failed!*\n*📍:* \`${cwd}\`\n*⌨️:* \`${fullCommand}\`\n\n*⚠️ Error:* \`${errorLine.trim()}\``;
        await wa.sendMessage(jid, { text: failText, edit: sentMsg.key }).catch(() => {});
      }
    });
  },
};