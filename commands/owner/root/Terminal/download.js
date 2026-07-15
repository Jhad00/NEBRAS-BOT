import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, "upload");

// Helpers
function stripQuotes(s) {
  const t = String(s || "").trim();
  if (!t) return "";
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1).trim();
  }
  return t;
}

function formatBytes(bytes) {
  const b = Number(bytes || 0);
  if (!Number.isFinite(b) || b <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = b, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

function safeBaseName(name) {
  return String(name || "archive").replace(/[^\w.\-]+/g, "_").replace(/_+/g, "_").slice(0, 120) || "archive";
}

function shQuote(str) {
  return `'${String(str || "").replace(/'/g, `'\\''`)}'`;
}

function getProjectTempDir() {
  const tempDir = path.join(process.cwd(), "temp");
  try { if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true }); } catch {}
  return tempDir;
}

function getUploadFiles() {
  try {
    if (!fs.existsSync(UPLOAD_DIR)) return [];
    return fs.readdirSync(UPLOAD_DIR)
      .filter(f => { try { return fs.statSync(path.join(UPLOAD_DIR, f)).isFile(); } catch { return false; } })
      .sort((a, b) => a.localeCompare(b));
  } catch { return []; }
}

async function statSafe(p) { try { return await fs.promises.stat(p); } catch { return null; } }

async function findByName(startDir, name, opts = {}) {
  const { maxResults = 3, maxDepth = 12, skipDirs = new Set(["node_modules", ".git", ".cache", "cache", "tmp", "temp"]) } = opts;
  const results = [];
  const root = path.resolve(startDir);

  async function walk(dir, depth) {
    if (results.length >= maxResults) return;
    if (depth > maxDepth) return;
    let entries;
    try { entries = await fs.promises.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      if (results.length >= maxResults) return;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (skipDirs.has(ent.name)) continue;
        if (ent.name === name) { results.push(full); if (results.length >= maxResults) return; }
        await walk(full, depth + 1);
      } else if (ent.isFile() && ent.name === name) {
        results.push(full);
        if (results.length >= maxResults) return;
      }
    }
  }

  await walk(root, 0);
  return results;
}

async function resolveStandardTarget(rawInput) {
  const input = stripQuotes(rawInput);
  if (!input) return { ok: false, reason: "No path provided." };
  if (path.isAbsolute(input)) { const st = await statSafe(input); if (st) return { ok: true, path: input, isDir: st.isDirectory(), isFile: st.isFile() }; return { ok: false, reason: `Not found (Absolute): ${input}` } }
  if (input.includes("/") || input.includes("\\") || input.startsWith(".")) { const abs = path.resolve(process.cwd(), input); const st = await statSafe(abs); if (st) return { ok: true, path: abs, isDir: st.isDirectory(), isFile: st.isFile() }; return { ok: false, reason: `Not found (Relative): ${abs}` } }
  const hits = await findByName(process.cwd(), input, { maxResults: 3, maxDepth: 14 });
  if (!hits.length) return { ok: false, reason: `Not found recursively: ${input}` }
  if (hits.length > 1) return { ok: false, reason: `Multiple matches found for "${input}". Be more specific:\n` + hits.map(p => `- ${p}`).join("\n") }
  const chosen = hits[0];
  const st = await statSafe(chosen);
  if (!st) return { ok: false, reason: `Not found: ${chosen}` }
  return { ok: true, path: chosen, isDir: st.isDirectory(), isFile: st.isFile() };
}

async function zipDirectoryToTemp(dirPath) {
  const tempDir = getProjectTempDir();
  const base = safeBaseName(path.basename(dirPath));
  const id = `${Date.now()}_${Math.floor(Math.random() * 999999)}`;
  const outZip = path.join(tempDir, `${base}_${id}.zip`);
  const parent = path.dirname(dirPath);
  const folder = path.basename(dirPath);
  const cmd = `cd ${shQuote(parent)} && zip -r -q ${shQuote(outZip)} ${shQuote(folder)}`;
  try { await execPromise(cmd, { maxBuffer: 1024 * 1024 * 1024, timeout: 0 }); } catch (e) { const errText = (e?.stderr || e?.message || String(e)).toString(); throw new Error(`Zip failed. Ensure 'zip' is installed.\n${errText}`); }
  const st = await statSafe(outZip);
  if (!st || !st.isFile()) throw new Error("Zip output was not created.");
  return { zipPath: outZip, zipSize: st.size };
}

// Main Export
export default {
  name: "download",
  aliases: ["downlod", "dl", "get"],
  description: "Download files. Use -u for upload folder, -rm to remove files, -h for help.",

  run: async (wa, msg, args) => {
    const jid = msg.key.remoteJid;

    // Display help if no args or -h or < download alone
    if (!args.length || args.includes("-h")) {
      const text = `
📄 *Download Command Help* 📄

⬇️  List upload folder files
< download -u
(List files in 'upload' folder with numbers)

⬇️  Download specific file from upload folder
< download -u <number|name>
(Use number from list or exact filename)

❌  Remove file from upload folder
< download -rm <number|name>
(Delete file safely using number or filename)

⬇️  Standard download
< download <path/file>
(Absolute path, relative path, or recursive search)

⚠️  Notes:
- < download alone or with -h shows this help.
- In -u or -rm mode, only number or filename is allowed, no paths.
- Directories are zipped before sending.
`;
      return wa.sendMessage(jid, { text }, { quoted: msg });
    }

    let useUploadOnly = false;
    let removeMode = false;
    const cleanArgs = [];

    for (const arg of args) {
      if (arg === "-u") useUploadOnly = true;
      else if (arg === "-rm") removeMode = true;
      else cleanArgs.push(arg);
    }

    const targetRaw = cleanArgs.join(" ").trim();
    const files = getUploadFiles();

    // LIST / REMOVE / DOWNLOAD from upload folder
    if (useUploadOnly || removeMode) {
      if (!targetRaw) {
        // List files
        const text = files.length
          ? `*Upload Folder Files* 📂\n\n${files.map((f, i) => `${i + 1}. ${f}`).join("\n")}\n\nUse: < download ${removeMode ? "-rm" : "-u"} <number|name>`
          : "*Upload Folder Files* 📂\nEmpty folder.";
        return wa.sendMessage(jid, { text }, { quoted: msg });
      }

      let selectedFile = null;
      if (/^\d+$/.test(targetRaw)) {
        const index = parseInt(targetRaw, 10) - 1;
        if (index >= 0 && index < files.length) selectedFile = files[index];
        else return wa.sendMessage(jid, { text: `*Error*\nInvalid number: ${targetRaw}` }, { quoted: msg });
      } else if (!targetRaw.includes("/") && !targetRaw.includes("\\")) {
        if (files.includes(targetRaw)) selectedFile = targetRaw;
        else { const directCheck = path.join(UPLOAD_DIR, targetRaw); if (fs.existsSync(directCheck)) selectedFile = targetRaw; }
      }

      if (!selectedFile) return wa.sendMessage(jid, { text: `*Error*\nFile not found: ${targetRaw}` }, { quoted: msg });

      const fullPath = path.join(UPLOAD_DIR, selectedFile);

      if (removeMode) {
        try {
          fs.unlinkSync(fullPath);
          return wa.sendMessage(jid, { text: `*Removed Successfully* ❌\nFile: ${selectedFile}` }, { quoted: msg });
        } catch (e) {
          return wa.sendMessage(jid, { text: `*Remove Failed* ❌\n${e?.message || "Unknown error"}` }, { quoted: msg });
        }
      } else {
        // Download
        const st = await statSafe(fullPath);
        if (!st || !st.isFile()) return wa.sendMessage(jid, { text: `*Error*\nFile not found on disk.` }, { quoted: msg });
        await wa.sendMessage(jid, {
          document: { url: fullPath },
          fileName: selectedFile,
          mimetype: "application/octet-stream",
          caption: `Name: ${selectedFile}\nSize: ${formatBytes(st.size)}`,
        }, { quoted: msg });
        return;
      }
    }

    // Standard download
    let resolved = await resolveStandardTarget(targetRaw);
    if (!resolved.ok) return wa.sendMessage(jid, { text: `*Download Error*\n${resolved.reason}` }, { quoted: msg });

    const waitMsg = await wa.sendMessage(jid, { text: "*Download*\nProcessing..." }, { quoted: msg });
    let sendPath = resolved.path;
    let fileName = path.basename(sendPath);
    let sizeBytes = 0;
    let tempCreated = null;

    try {
      if (resolved.isDir) {
        await wa.sendMessage(jid, { text: "*Download*\nDirectory detected. Zipping..." }, { quoted: msg });
        const zipped = await zipDirectoryToTemp(sendPath);
        sendPath = zipped.zipPath;
        tempCreated = sendPath;
        fileName = path.basename(sendPath);
        sizeBytes = zipped.zipSize;
      } else {
        const st = await fs.promises.stat(sendPath);
        sizeBytes = st.size;
      }

      await wa.sendMessage(jid, {
        document: { url: sendPath },
        fileName,
        mimetype: "application/octet-stream",
        caption: `Name: ${fileName}\nSize: ${formatBytes(sizeBytes)}`,
      }, { quoted: msg });

      try { if (waitMsg?.key) await wa.sendMessage(jid, { delete: waitMsg.key }); } catch {}
    } catch (e) {
      return wa.sendMessage(jid, { text: `*Download Failed*\n${e?.message || "Unknown error"}` }, { quoted: msg });
    } finally {
      if (tempCreated) { try { if (fs.existsSync(tempCreated)) fs.unlinkSync(tempCreated); } catch {} }
    }
  },
};