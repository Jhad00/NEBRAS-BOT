// File: commands/owner/root/guess.js
// Tier: owner

import sharp from "sharp";

export default {
  cmd: "تخمين",
  description: "له استخدامات عديدة ومنها تخمين ارقام واتساب",
  aliases: ["guess"],
  category: "ادارة",
  do: async (wa, msg, args) => {
    const jid = msg.key.remoteJid;
    
    // help menu - trigger if no args or -h or --help
    if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
      const helpText = `
📖 *دليل استخدام أمر التخمين (guess)*

يقوم الأمر بتوليد قائمة أرقام بناءً على نمط يحتوي على علامات * (نجمة) كأماكن للأرقام المتغيرة.

*الخيارات:*
- -f : حفظ النتيجة كملف نصي (إجبارياً إذا تجاوز العدد 150).
- -m : إظهار النتيجة مباشرة في الشات (حتى لو كان العدد كبيراً).
- -wg : تفعيل الفحص الفعلي عبر شبكة واتساب للتحقق من وجود الحسابات.
- -wc / -w : فحص حساب واحد محدد (يعرض الصورة والحالة).
- -p y أو --photo y : تصفية النتائج التي تملك صورة شخصية (يعمل مع -wg فقط).
- -p n أو --photo n : تصفية النتائج التي لا تملك صورة شخصية (يعمل مع -wg فقط).
- -h أو --help : عرض هذه المساعدة.

*أمثلة:*
guess 09*******0
guess -f 09*******0
guess -wg 09*******0
guess -wg -p y 09*******0
guess -w +966512345678.
      `;
      return wa.sendMessage(jid, { text: helpText }, { quoted: msg });
    }
    
    try {
      const rawInput = args.join(" ");

      // 1. parse routing & execution flags
      const hasF = rawInput.includes("-f");
      const hasM = rawInput.includes("-m");
      const hasWg = rawInput.includes("-wg");
      const hasW = rawInput.includes("-wc") || rawInput.includes("-w");

      // extract photo filter flag (-p or --photo)
      const pMatch = rawInput.match(/(?:-p|--photo)\s+([^\s]+)/i);
      let pFilter = null;

      if (pMatch) {
        const val = pMatch[1].toLowerCase();
        if (val === 'y' || val === 'n') {
          pFilter = val;
        } else {
          return wa.sendMessage(jid, {
            text: "⚠️ Syntax Error: -p or --photo accepts ONLY 'y' or 'n'.\nEx: .guess -wg +963*** -p n"
          }, { quoted: msg });
        }
      }

      // extract raw pattern by stripping all known flags
      const pattern = rawInput.replace(/-f|-m|-wg|-wc|-w|(?:-p|--photo)\s+[^\s]+/gi, "").trim();

      // 2. branch A: single account checker (profile & avatar)
      if (hasW && !hasWg && !pattern.includes("*")) {
        // strict phone validation
        const phoneMatch = pattern.match(/\+?(\d{8,15})/);
        if (!phoneMatch) {
          return wa.sendMessage(jid, {
            text: "⚠️ Syntax: .guess -w +<CountryCode><Number>"
          }, { quoted: msg });
        }

        const phone = phoneMatch[1];
        
        // generate default avatar via sharp (rasterized SVG)
        const svgIcon = `
          <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 24 24" fill="#b0b0b0">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        `;
        const defaultAvatarBuffer = await sharp(Buffer.from(svgIcon)).png().toBuffer();
        const [waStatus] = await wa.onWhatsApp(phone);

        if (!waStatus || !waStatus.exists) {
          return wa.sendMessage(jid, {
            image: defaultAvatarBuffer,
            caption: `❌ *الرقم:* +${phone}\n*الحالة:* ليس لديه حساب على واتساب.`
          }, { quoted: msg });
        }

        let pfpBuffer;
        let hasPfp = false;

        try {
          const pfpUrl = await wa.profilePictureUrl(waStatus.jid, 'image');
          const res = await fetch(pfpUrl);
          pfpBuffer = Buffer.from(await res.arrayBuffer());
          hasPfp = true;
        } catch (err) {
          pfpBuffer = defaultAvatarBuffer;
        }

        // exact formatting REQUIRED for WhatsApp clients to render the PushName (@phone)
        const caption = [
          `✅ *الحالة:* مسجل بواتساب`,
          `👤 *الحساب:* @${phone}`,
          `🖼️ *الصورة الشخصية:* ${hasPfp ? "موجودة" : "لا يملك (أو مخفية لخصوصيته)"}`
        ].join("\n");

        return wa.sendMessage(jid, {
          image: pfpBuffer,
          caption: caption,
          mentions: [waStatus.jid] 
        }, { quoted: msg });
      }

      // validate wildcard presence for permutation modes
      if (!pattern.includes("*")) {
        return wa.sendMessage(jid, {
          text: "ارسل\nتخمين -h\nاو\nguess -h\nيمكنك استخدام كلمة نخمين بدلا من guess"
        }, { quoted: msg });
      }

      const wildcardsCount = (pattern.match(/\*/g) || []).length;
      const total = Math.pow(10, wildcardsCount);

      // fast string interleaving for permutations (memory safe)
      const parts = pattern.replace(/\+/g, "").split('*');
      let permutations = new Array(total);

      for (let i = 0; i < total; i++) {
        const rep = i.toString().padStart(wildcardsCount, '0');
        let str = parts[0];
        for (let j = 0; j < wildcardsCount; j++) {
          str += rep[j] + parts[j + 1];
        }
        permutations[i] = str;
      }

      let finalList = [];

      // 3. branch B: network-filtered permutations (-wg)
      if (hasWg) {
        // network protection: cap at 4 wildcards (10k reqs)
        if (wildcardsCount > 4) {
          return wa.sendMessage(jid, {
            text: "❌ Network Protection: Maximum 4 wildcards allowed for -wg mode to prevent WA bans."
          }, { quoted: msg });
        }

        const filterMsg = pFilter === 'y' ? " (يملك صورة)" : pFilter === 'n' ? " (بدون صورة)" : "";
        await wa.sendMessage(jid, {
          text: `⏳ جاري فحص ${total} احتمال عبر شبكة واتساب${filterMsg}...`
        }, { quoted: msg });

        const BATCH_SIZE = 50; 
        
        for (let i = 0; i < total; i += BATCH_SIZE) {
          const batch = permutations.slice(i, i + BATCH_SIZE);
          
          // concurrent WA registry check + PFP check
          const checks = batch.map(async (num) => {
            try {
              const [status] = await wa.onWhatsApp(num);
              if (!status?.exists) return null;

              // apply pfp filter if requested
              if (pFilter) {
                let hasPfp = false;
                try {
                  await wa.profilePictureUrl(status.jid, 'image');
                  hasPfp = true;
                } catch {
                  // fails if no photo or hidden by privacy
                  hasPfp = false;
                }

                // drop if conditions mismatch
                if (pFilter === 'y' && !hasPfp) return null;
                if (pFilter === 'n' && hasPfp) return null;
              }

              return `+${num}`;
            } catch {
              return null;
            }
          });

          const results = await Promise.all(checks);
          finalList.push(...results.filter(Boolean));

          // throttle network requests to maintain socket health (avoid 428 disconnect)
          await new Promise(r => setTimeout(r, 500));
        }

      } else {
        // 4. branch C: offline pure permutations
        if (wildcardsCount > 6) {
          return wa.sendMessage(jid, {
            text: "❌ OOM Protection: Maximum 6 wildcards allowed for offline mode."
          }, { quoted: msg });
        }
        
        if (pFilter) {
          return wa.sendMessage(jid, {
            text: "⚠️ Notice: -p / --photo flag only works with -wg mode (network checks)."
          }, { quoted: msg });
        }

        finalList = permutations.map(num => `+${num}`);
      }

      if (finalList.length === 0) {
        return wa.sendMessage(jid, {
          text: "⚠️ لا توجد نتائج مطابقة لعملية الفحص والتصفية."
        }, { quoted: msg });
      }

      // 5. output routing mechanism
      const useFile = hasF || (!hasM && finalList.length > 150);

      if (useFile) {
        const buffer = Buffer.from(finalList.join("\n"), "utf-8");
        return wa.sendMessage(jid, {
          document: buffer,
          fileName: `guess-${pattern.replace(/\*/g, 'x')}.txt`,
          mimetype: "text/plain"
        }, { quoted: msg });
      }

      // chunked message dispatch (60k chars limit per message)
      const MAX_CHAR_LIMIT = 60000;
      let currentChunk = "";

      for (let i = 0; i < finalList.length; i++) {
        const line = finalList[i] + "\n";
        if (currentChunk.length + line.length > MAX_CHAR_LIMIT) {
          await wa.sendMessage(jid, { text: currentChunk.trim() }, { quoted: msg });
          // anti-ban dispatch delay
          await new Promise(r => setTimeout(r, 1500));
          currentChunk = line;
        } else {
          currentChunk += line;
        }
      }

      if (currentChunk.trim().length > 0) {
        await wa.sendMessage(jid, { text: currentChunk.trim() }, { quoted: msg });
      }

    } catch (error) {
      // global CLI-style exception handler
      const errMsg = error?.message || String(error);
      const terminalOutput = `*🔴 STDERR: [guess.js]*\n\`\`\`bash\nException Caught:\n${errMsg}\n\`\`\``;
      return wa.sendMessage(jid, { text: terminalOutput }, { quoted: msg });
    }
  }
};