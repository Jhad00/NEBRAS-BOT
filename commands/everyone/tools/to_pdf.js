import puppeteer from "puppeteer";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const runCommand = (cmd) =>
  new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(stderr || err);
      resolve(stdout || stderr);
    });
  });

const getProjectTempDir = () => {
  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  return tempDir;
};

// recursive walk to grab images even if zip has subfolders
const walkImages = (dir) => {
  const exts = [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"];
  let out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkImages(full));
    else if (exts.includes(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
};

const mimeFromExt = (ext) => {
  const map = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".bmp": "image/bmp", ".gif": "image/gif" };
  return map[ext.toLowerCase()] || "image/png";
};

export default {
  cmd: "topdf",
  description: "دمج صور في ملف pdf",
  aliases: ["zip2pdf", "imgs2pdf"],
  category: "ادوات",

  do: async (wa, msg) => {
    // check if replied to media
    const media = await wa.getMediaBufferFromReply(msg);
    const isZip =
      media?.type === "document" &&
      (media.mimetype?.includes("zip") || media.filename?.toLowerCase().endsWith(".zip"));

    // if no media or not zip -> show help
    if (!media || !isZip) {
      await wa.react("ℹ️");
      const prefix = msg.prefix || ".";
      return await wa.sendMessage(
        msg.key.remoteJid,
        { text: `📋 *تحويل ZIP إلى PDF*\n\nقم بالرد على ملف ZIP يحتوي على صور مرتبة:\n\`${prefix}topdf\`` },
        { quoted: msg }
      );
    }

    wa.react("⏳");
    const jid = msg.key.remoteJid;
    const tempFiles = [];
    let extractDir = null;
    let browser;

    try {
      const tempDir = getProjectTempDir();
      const unique = Date.now() + "_" + Math.floor(Math.random() * 99999);
      const zipPath = path.join(tempDir, `req_${unique}.zip`);
      extractDir = path.join(tempDir, `req_${unique}_extracted`);

      fs.writeFileSync(zipPath, media.buffer);
      tempFiles.push(zipPath);
      fs.mkdirSync(extractDir, { recursive: true });

      await runCommand(`unzip -o "${zipPath}" -d "${extractDir}"`);

      const images = walkImages(extractDir).sort((a, b) =>
        path.basename(a).localeCompare(path.basename(b), undefined, { numeric: true, sensitivity: "base" })
      );

      if (images.length === 0) {
        wa.react("⚠️");
        return await wa.sendMessage(jid, { text: "⚠️ لم يتم العثور على أي صور داخل ملف ZIP." }, { quoted: msg });
      }

      // build html pages, one image per page
      const pagesHtml = images
        .map((imgPath) => {
          const ext = path.extname(imgPath);
          const b64 = fs.readFileSync(imgPath).toString("base64");
          return `<div class="page"><img src="data:${mimeFromExt(ext)};base64,${b64}"></div>`;
        })
        .join("\n");

      const html = `<!DOCTYPE html><html><head><style>
        * { margin:0; padding:0; box-sizing:border-box; }
        .page { width:100vw; height:100vh; display:flex; align-items:center; justify-content:center; page-break-after:always; }
        .page:last-child { page-break-after:auto; }
        img { max-width:100%; max-height:100%; object-fit:contain; }
      </style></head><body>${pagesHtml}</body></html>`;

      const termuxPath = "/data/data/com.termux/files/usr/bin/chromium-browser";
      const execPath = fs.existsSync(termuxPath) ? termuxPath : undefined;

      browser = await puppeteer.launch({
        executablePath: execPath,
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });

      const pdfBuffer = Buffer.from(
        await page.pdf({ format: "A4", printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } })
      );

      await wa.sendMessage(
        jid,
        { document: pdfBuffer, mimetype: "application/pdf", fileName: `Converted_${Date.now()}.pdf` },
        { quoted: msg }
      );

      wa.react("✅");
    } catch (err) {
      console.error("TOPDF ERROR:", err);
      wa.react("⚠️");
      try {
        await wa.sendMessage(jid, { text: "حدث خطأ أثناء التحويل:\n" + String(err) }, { quoted: msg });
      } catch (e) {}
    } finally {
      if (browser) await browser.close();
      for (const f of tempFiles) { try { fs.unlinkSync(f); } catch (e) {} }
      if (extractDir) { try { fs.rmSync(extractDir, { recursive: true, force: true }); } catch (e) {} }
    }
  },
};