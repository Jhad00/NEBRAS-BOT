import puppeteer from "puppeteer";
import fs from "fs";

export default {
  cmd: "تصفح",
  description: "التقاط صفحة موقع كpdf",
  aliases: ["browse", "web"],
  category: "ادوات",

  do: async (wa, msg, args) => {
    // check if args empty -> show help
    const text = args.join(" ").trim();
    if (!text) {
      await wa.react("ℹ️");
      const prefix = msg.prefix || ".";
      return wa.sendMessage(
        msg.key.remoteJid,
        { text: `📋 *تصفح*\n\nضع رابط الموقع بعد الأمر:\n\`${prefix}تصفح <رابط>\`\n\nمثال:\n\`${prefix}تصفح https://example.com\`` },
        { quoted: msg }
      );
    }

    // extract url
    const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
    const url = urlMatch ? urlMatch[0] : null;

    if (!url) {
      await wa.react("⚠️");
      return await wa.sendMessage(
        msg.key.remoteJid,
        { text: "⚠️ يرجى إرفاق رابط صحيح يبدأ بـ http أو https." },
        { quoted: msg }
      );
    }

    await wa.react("⏳");

    let browser;
    try {
      // detect environment (Termux vs VPS)
      const termuxPath = "/data/data/com.termux/files/usr/bin/chromium-browser";
      const isTermux = fs.existsSync(termuxPath);
      const execPath = isTermux ? termuxPath : undefined;

      // launch with optimizations
      browser = await puppeteer.launch({
        executablePath: execPath,
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--window-size=1920,1080"
        ]
      });

      const page = await browser.newPage();

      // force desktop viewport
      await page.setViewport({ width: 1920, height: 1080 });

      // bypass basic bot protections
      await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

      // 1. Force Dark Mode
      await page.emulateMediaFeatures([
        { name: "prefers-color-scheme", value: "dark" }
      ]);

      // 2. Force Screen CSS (fixes broken layouts in PDF)
      await page.emulateMediaType("screen");

      // nav to target
      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

      // 3. Cookie Crusher: Inject script to remove common cookie/consent overlays
      await page.evaluate(() => {
        const selectors = [
          '[id*="cookie"]', '[class*="cookie"]', 
          '[id*="consent"]', '[class*="consent"]',
          '.cc-window', '.fc-consent-root', 
          '#userconsent', '[data-nosnippet="true"]',
          '#dialog'
        ];
        
        document.querySelectorAll(selectors.join(',')).forEach(el => el.remove());
        
        document.querySelectorAll('*').forEach(el => {
          const style = window.getComputedStyle(el);
          if ((style.position === 'fixed' || style.position === 'sticky') && parseInt(style.zIndex) > 99) {
            el.style.display = 'none';
          }
        });
      });

      // brief delay to allow CSS transitions of removed elements to finish
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 4. Calculate full dynamic height to make it a single continuous page
      const fullHeight = await page.evaluate(() => {
        return Math.max(
          document.body.scrollHeight, document.documentElement.scrollHeight,
          document.body.offsetHeight, document.documentElement.offsetHeight,
          document.body.clientHeight, document.documentElement.clientHeight
        );
      });

      // gen dynamic PDF
      const rawPdf = await page.pdf({
        width: "1920px",
        height: `${fullHeight}px`,
        printBackground: true,
        margin: { top: 0, bottom: 0, left: 0, right: 0 }
      });

      const pdfBuffer = Buffer.from(rawPdf);

      // send document
      await wa.sendMessage(
        msg.key.remoteJid,
        {
          document: pdfBuffer,
          mimetype: "application/pdf",
          fileName: `Web_Capture_${Date.now()}.pdf`,
          caption: `🌐 *تم التقاط الموقع:*\n${url}`
        },
        { quoted: msg }
      );

      await wa.react("✅");

    } catch (err) {
      console.error("BROWSE CMD ERROR:", err);
      await wa.react("⚠️");
      await wa.sendMessage(
        msg.key.remoteJid,
        { text: `حدث خطأ أثناء معالجة الرابط:\n${err.message}` },
        { quoted: msg }
      );
    } finally {
      if (browser) await browser.close();
    }
  }
};