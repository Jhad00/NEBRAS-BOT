import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TERMINAL_DIR = path.join(__dirname);
const UPLOAD_DIR = path.join(TERMINAL_DIR, "upload");

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Format bytes
function formatBytes(bytes) {
  const b = Number(bytes || 0);
  if (!Number.isFinite(b) || b <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = b, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

// Guess file extension based on magic bytes
function detectExtension(buffer) {
  if (!buffer || buffer.length < 4) return "";
  const hex = buffer.toString("hex", 0, 4);

  // Images
  if (hex.startsWith("ffd8ff")) return ".jpg";
  if (hex.startsWith("89504e47")) return ".png";
  if (hex.startsWith("52494646") && buffer.toString("ascii", 8, 12) === "WEBP") return ".webp";

  // Videos
  if (hex.startsWith("00000018") || hex.startsWith("00000020")) return ".mp4"; 
  if (hex.startsWith("66747970")) return ".mp4";

  // Audio
  if (hex.startsWith("494433")) return ".mp3"; 
  if (hex.startsWith("4f676753")) return ".ogg"; 
  if (hex.startsWith("52494646") && buffer.toString("ascii", 8, 12) === "WAVE") return ".wav"; 

  // PDF
  if (hex.startsWith("25504446")) return ".pdf";

  // ZIP
  if (hex.startsWith("504b0304")) return ".zip";

  // Text-like
  const text = buffer.toString("utf8", 0, 512);
  if (/^[\x00-\x7F\s]*$/.test(text)) {
    if (text.includes("import ") || text.includes("def ")) return ".py";
    if (text.includes("function ") || text.includes("console.")) return ".js";
    if (text.startsWith("# ")) return ".md";
    return ".txt";
  }

  return "";
}

function helpMessage() {
  return `
📤 *Upload Command Help* 📤

⬇️ Upload media or files (reply to media or file)
< upload
(Reply to an image, video, audio, document, sticker, or voice message)

✏️ Custom filename
< upload -n <filename>
(Will auto-add correct extension if missing, analyzed from file)

⚠️ Notes:
- Supported types: Images, Videos, Audio, Voice, Documents, Stickers.
- If file has no extension, bot analyzes file to detect type.
- Unknown file types are saved without extension.
- -n allows specifying custom name; extension is auto-added if missing.
- < upload alone (with reply) uploads the media.
`;
}

export default {
  name: "upload",
  aliases: ["uplod", "up", "u"],
  description: "Upload media or file to server",

  run: async (wa, msg, args) => {
    const jid = msg.key.remoteJid;

    // If -h used OR user did not reply to any message → show help
    if (args.includes("-h") || !msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      return wa.sendMessage(jid, { text: helpMessage() }, { quoted: msg });
    }

    try {
      if (typeof wa.getMediaBufferFromReply !== "function") {
        throw new Error("System error: wa.getMediaBufferFromReply is missing.");
      }

      const media = await wa.getMediaBufferFromReply(msg);
      if (!media || !media.buffer) {
        return wa.sendMessage(jid, {
          text: "*Upload Failed*\nNo media or file found. Reply to a file, image, video, or audio."
        }, { quoted: msg });
      }

      // Extract doc msg if media sent as file/document
      const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const docMsg = quotedMsg?.documentMessage || quotedMsg?.documentWithCaptionMessage?.message?.documentMessage;
      
      // Fallback to doc fileName or title
      let originalName = docMsg?.fileName || docMsg?.title || media.filename || `file_${Date.now()}`;
      let originalExt = path.extname(originalName);

      if (!originalExt) {
        // Try detect extension by file content
        originalExt = detectExtension(media.buffer);
      }

      // Handle -n option
      let customNameIndex = args.findIndex(a => a === "-n");
      let finalName;
      if (customNameIndex !== -1 && args[customNameIndex + 1]) {
        let inputName = args[customNameIndex + 1];
        let inputExt = path.extname(inputName) || originalExt;
        finalName = path.basename(inputName, inputExt) + inputExt;
      } else {
        finalName = path.basename(originalName, originalExt) + originalExt;
      }

      const finalPath = path.join(UPLOAD_DIR, finalName);

      // Save file
      await fs.promises.writeFile(finalPath, media.buffer);
      const stats = await fs.promises.stat(finalPath);

      // Prioritize doc mimetype if media.mimetype is missing
      const mimeType = docMsg?.mimetype || media.mimetype || "unknown";

      await wa.sendMessage(jid, {
        text: `*Upload Complete* ✅\n\n• Name: ${finalName}\n• Size: ${formatBytes(stats.size)}\n• Type: ${mimeType}\n• Location: upload/`
      }, { quoted: msg });

    } catch (e) {
      console.error(e);
      await wa.sendMessage(jid, {
        text: `*Upload Error* ❌\nFailed to save file.\nDetails: ${e?.message || "Unknown error"}`
      }, { quoted: msg });
    }
  },
};