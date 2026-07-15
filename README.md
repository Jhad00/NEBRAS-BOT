<div align="center">

# NEBRAS-BOT

[![Stars](https://img.shields.io/github/stars/Jhad00/NEBRAS-BOT?style=for-the-badge&color=25D366&labelColor=black)](https://github.com/Jhad00/NEBRAS-BOT/stargazers)
[![Forks](https://img.shields.io/github/forks/Jhad00/NEBRAS-BOT?style=for-the-badge&color=25D366&labelColor=black)](https://github.com/Jhad00/NEBRAS-BOT/network/members)
[![Last Commit](https://img.shields.io/github/last-commit/Jhad00/NEBRAS-BOT?style=for-the-badge&color=25D366&labelColor=black)](https://github.com/Jhad00/NEBRAS-BOT/commits)
[![License](https://img.shields.io/github/license/Jhad00/NEBRAS-BOT?style=for-the-badge&color=25D366&labelColor=black)](LICENSE)

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](#)
[![Baileys](https://img.shields.io/badge/Baileys-7.0-orange?style=for-the-badge)](#)

**بوت واتساب متعدد الأجهزة — Multi-Device WhatsApp Bot**

[العربية](#nebras-bot-ar) &nbsp;|&nbsp; [English](#english-version)

</div>

---

<a name="nebras-bot-ar"></a>
## النسخة العربية

بوت واتساب متعدد الأجهزة (Multi-Device) مبني على مكتبة Baileys، بمعمارية وحدات (modular commands) تسمح بإضافة أو تعديل أي أمر دون المساس ببقية النظام. يدعم إدارة الجلسات المتعددة، صلاحيات متدرجة (عام / نخبة / مالك)، وأدوات تحميل وتحويل وسائط متكاملة.

### الفهرس

- [المميزات](#المميزات)
- [هيكل المشروع](#هيكل-المشروع)
- [المتطلبات الأساسية](#المتطلبات-الأساسية)
- [التثبيت والتشغيل](#التثبيت-والتشغيل)
- [الحصول على المفاتيح](#الحصول-على-المفاتيح-المطلوبة-apisjson)
- [قائمة الأوامر](#قائمة-الأوامر)
- [إنشاء أمر جديد](#إنشاء-أمر-جديد)
- [حل المشاكل](#حل-المشاكل-الشائعة)
- [المساهمة](#المساهمة)

### المميزات

**بنية ديناميكية**
أي ملف `.js` داخل `commands/` يُحمَّل تلقائيًا (hot-reload) دون تعديل أي كود آخر.

**صلاحيات متدرجة**
`everyone` / `elites` / `owner` — كل تصنيف بمجلد خاص.

**جلسات متعددة**
تشغيل أكثر من رقم واتساب من نفس السيرفر (`تشغيل` / `ايقاف` / `جلسات`).

**ربط بكود إقران**
لا حاجة لمسح QR يدويًا في كل مرة.

**أدوات وسائط متكاملة**
تحميل يوتيوب/انستغرام، تحويل صوت↔فيديو، فصل صوت عن موسيقى، تفريغ نصي، ملصقات، PDF.

**إدارة مجموعات متقدمة**
ترقية/خفض، طرد، منشن مخفي وجماعي، قفل/فتح الشات، طلبات الانضمام.

**توسعة كاملة**
أضف أمرك الخاص خلال دقائق.

**تكامل PM2**
تشغيل دائم مع auto-restart بالإنتاج.

### هيكل المشروع

```
h4x2/
├── main.js                  # نقطة تشغيل المشروع
├── config.js                # الإعدادات العامة
├── apis.json                # مفاتيح واجهات برمجية خارجية
├── auto-run-pm2.js          # سكربت تشغيل تلقائي متوافق مع PM2
│
├── hexJS/                   # النواة (Core)
│   ├── wa-socket/           # الاتصال بواتساب عبر Baileys
│   ├── wa-socket-plus/      # إضافات ربط برمز الإقران
│   ├── wa-helpers/          # دوال مساعدة للرسائل والوسائط
│   ├── env/                 # تحميل الأوامر تلقائيًا + hot-reload
│   ├── assets/              # الإعدادات المُجمَّعة
│   └── interface/           # واجهة الطرفية (CLI)
│
├── commands/
│   ├── everyone/            # أوامر متاحة للجميع
│   ├── elites/              # أوامر النخبة
│   └── owner/               # أوامر المالك فقط
│
├── src/                     # ملفات مساعدة ثابتة
└── temp/                    # ملفات مؤقتة
```

> ملاحظة: تم حذف مجلد أوامر الذكاء الاصطناعي بالكامل من هذه النسخة العلنية.

### المتطلبات الأساسية

| الأداة | الحد الأدنى | الاستخدام |
|---|---|---|
| [Node.js](https://nodejs.org) | 20.x+ | تشغيل المشروع |
| npm | مع Node.js | تثبيت الحزم |
| FFmpeg | حديث | معالجة صوت/فيديو |
| ImageMagick | حديث | معالجة صور/ملصقات |
| Git | أي إصدار | استنساخ وتحديث |
| PM2 (اختياري) | — | تشغيل دائم |

```bash
sudo apt-get update && sudo apt-get install -y imagemagick ffmpeg git
```

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20 && nvm use 20
```

### التثبيت والتشغيل

```bash
git clone https://github.com/Jhad00/NEBRAS-BOT.git
cd NEBRAS-BOT
npm install
```

عدّل `config.js`:
```js
export default {
    logger: false,
    browser_set: { name: "NEBRAS", browser: "Safari" },
    scan_attempts: 2,
    client_dirname: "clients",
    commands_dirname: "commands",
    prefixes: [".", "!", "1"],
    dev: ["9639XXXXXXXX"],            // رقمك الدولي بدون + أو 00
    github_url: "https://github.com/Jhad00/NEBRAS-BOT",
    whatsapp_channel_url: "https://whatsapp.com/channel/0029VbDJIbqJUM2Uo9kmjY0w",
};
```

عبّئ `apis.json` (اختياري حسب الأوامر المطلوبة):
```json
{
  "groq": { "api_key": "" },
  "mvsep": { "email": "", "password": "" }
}
```

تشغيل:
```bash
npm start
```

اختر رمز الإقران، أدخل رقمك، ثم من واتساب: الأجهزة المرتبطة > ربط جهاز > ربط برقم الهاتف.

تشغيل دائم:
```bash
npm install -g pm2
pm2 start auto-run-pm2.js --name nebras-bot
pm2 save && pm2 startup
```

### الحصول على المفاتيح المطلوبة (apis.json)

| الخدمة | الاستخدام | المصدر |
|---|---|---|
| Groq API Key | `نص` | [console.groq.com](https://console.groq.com/keys) — مجاني |
| MVSep | `فصل` | [mvsep.com](https://mvsep.com) — مجاني |

### قائمة الأوامر

البادئة محددة في `prefixes` بملف `config.js`. مثال: `.انستا <رابط>`

**أوامر عامة (الجميع)**

| الأمر | الوصف |
|---|---|
| `يوتيوب` | تحميل فيديو من يوتيوب |
| `انستا` | تحميل ريلز انستغرام |
| `فيس` | تحميل فيديو من فيسبوك |
| `ملصق` | إنشاء ملصق من صورة/فيديو |
| `فيد` | تحويل صوت/ملصق متحرك إلى فيديو |
| `تحويل` | تحويل بين صيغ الفيديو والصوت |
| `ضغط` | ضغط الملفات الصوتية |
| `فصل` | فصل الصوت عن الموسيقى |
| `نص` | تحويل صوت/فيديو إلى نص |
| `topdf` | دمج صور بملف PDF |
| `تصفح` | التقاط صفحة موقع كـ PDF |
| `ويكيبيديا` | جلب مقالة من ويكيبيديا |
| `بروفايل` | صورة بروفايل حساب واتساب |
| `عرض` | استرجاع وسائط View Once |
| `اوامر` | عرض كل الأوامر |
| `المطور` | بيانات تواصل المطور |

**أوامر النخبة (Elites)**

| الأمر | الوصف |
|---|---|
| `اشراف` | ترقية عضو لمشرف |
| `خفض` | سحب إشراف عضو |
| `خفض_الكل` | سحب إشراف الجميع |
| `طرد` | طرد عضو |
| `حذف` | حذف رسالة بالرد |
| `منشن` | منشن مخفي للجميع |
| `جماعي` | منشن جماعي كقائمة |
| `شات` | قفل/فتح دردشة المجموعة |
| `طلبات` | إدارة طلبات الانضمام |
| `بوتات` | الأجهزة المرتبطة بالأعضاء |
| `نخبة_اضف` / `نخبة_ازل` | إضافة/إزالة من النخبة |
| `النخبة` | عرض قائمة النخبة |
| `نخبة_اشراف` | رفع كل النخبة لمشرف |

**أوامر المالك (Owner)**

| الأمر | الوصف |
|---|---|
| `تشغيل` / `ايقاف` / `جلسات` | إدارة الجلسات المتعددة |
| `تنصيب` | إنشاء رمز إقران لجلسة جديدة |
| `الكل` | فتح/قفل أوامر العامة |
| `مجموعات` | عرض مجموعات البوت |
| `رابط` | رابط دعوة مجموعة |
| `تخمين` | تخمين أرقام واتساب |
| `تست` | اختبار البوت |
| `$` | Terminal مدمج |

### إنشاء أمر جديد

```js
// commands/everyone/tools/hello.js
export default {
  cmd: "هلا",
  description: "يرد بتحية بسيطة",
  aliases: ["hi", "hello"],
  category: "ادوات",

  do: async (wa, msg, args) => {
    await wa.sendMessage(
      msg.key.remoteJid,
      { text: "أهلاً بك" },
      { quoted: msg }
    );
  },
};
```

احفظ الملف فقط — النظام يكتشفه تلقائيًا. ضعه في `everyone` / `elites` / `owner` حسب الصلاحية المطلوبة.

### حل المشاكل الشائعة

**الأمر لا يستجيب**
تأكد من البادئة في `config.js`، وأن الأمر ليس من تصنيف `owner`/`elites` وأنت لست مصنّفًا كذلك.

**فشل تحويل صوت/فيديو**
تحقق من التثبيت عبر `ffmpeg -version`.

**فشل ملصق/صورة**
تحقق من التثبيت عبر `convert -version`.

**انقطاع متكرر**
تحقق من الإنترنت، أو احذف مجلد الجلسة في `clients/` وأعد الربط.

### المساهمة

```bash
git checkout -b feature/my-feature
git commit -m "feat: وصف مختصر"
git push origin feature/my-feature
```

افتح Pull Request بعد ذلك.

### إخلاء مسؤولية

لأغراض تعليمية وإدارة مجموعاتك الخاصة. الاستخدام المخالف لشروط واتساب مسؤولية المستخدم وحده.

### الرخصة

رخصة ISC — استخدام وتعديل وتوزيع حر.

---

<a name="english-version"></a>
## English Version

A Multi-Device WhatsApp bot built on Baileys, with a modular command architecture — add or edit any command without touching the rest of the system. Supports multi-session management, tiered permissions (everyone / elites / owner), and a full set of download/conversion tools.

> Note: command names remain in Arabic, since the bot's core command set is Arabic-first. English speakers can use this section to install, configure, and operate the bot; commands are still triggered with Arabic keywords (e.g. `.يوتيوب <link>`).

### Features

- **Dynamic command loading** — drop a `.js` file into `commands/`; it is auto-loaded (hot-reload) with no other code touched.
- **Tiered permissions** — `everyone` / `elites` / `owner`, one folder per tier.
- **Multi-session** — run multiple WhatsApp numbers from a single server.
- **Pair-code linking** — no manual QR scanning required.
- **Full media toolkit** — YouTube/Instagram downloads, audio↔video conversion, vocal/music separation, speech-to-text, stickers, PDF tools.
- **Advanced group management** — promote/demote, kick, hidden/tagged mentions, chat lock, join-request handling.
- **Fully extensible** — add a custom command in minutes.
- **PM2 integration** — persistent process with auto-restart in production.

### Requirements

| Tool | Minimum | Purpose |
|---|---|---|
| Node.js | 20.x+ | Runs the project |
| npm | Bundled with Node.js | Installs dependencies |
| FFmpeg | Recent | Audio/video processing |
| ImageMagick | Recent | Image/sticker processing |
| Git | Any | Clone and update |
| PM2 (optional) | — | Keep-alive process manager |

```bash
sudo apt-get update && sudo apt-get install -y imagemagick ffmpeg git
```

### Install and Run

```bash
git clone https://github.com/Jhad00/NEBRAS-BOT.git
cd NEBRAS-BOT
npm install
```

Edit `config.js`:
```js
export default {
    logger: false,
    browser_set: { name: "NEBRAS", browser: "Safari" },
    scan_attempts: 2,
    client_dirname: "clients",
    commands_dirname: "commands",
    prefixes: [".", "!", "1"],
    dev: ["9639XXXXXXXX"],       // your international number, no + or 00
    github_url: "https://github.com/Jhad00/NEBRAS-BOT",
    whatsapp_channel_url: "https://whatsapp.com/channel/0029VbDJIbqJUM2Uo9kmjY0w",
};
```

Fill in `apis.json` for the optional tools (Groq, MVSep — see table below), then:

```bash
npm start
```

Select pair-code linking, enter your phone number, then in WhatsApp: Linked Devices > Link a Device > Link with phone number.

Keep it running with PM2:
```bash
npm install -g pm2
pm2 start auto-run-pm2.js --name nebras-bot
pm2 save && pm2 startup
```

### API Keys

| Service | Used for | Source |
|---|---|---|
| Groq API Key | `نص` (speech-to-text) | [console.groq.com](https://console.groq.com/keys) — free |
| MVSep | `فصل` (audio separation) | [mvsep.com](https://mvsep.com) — free |

### Commands

Commands remain in Arabic. The prefix is set in `config.js` (default `.`, `!`, or `1`), e.g. `.انستا <link>`.

**Everyone tier** — `يوتيوب` (YouTube download), `انستا` (Instagram download), `فيس` (Facebook download), `ملصق` (sticker), `فيد` (to video), `تحويل` (convert), `ضغط` (compress audio), `فصل` (vocal separation), `نص` (speech-to-text), `topdf`, `تصفح` (webpage to PDF), `ويكيبيديا` (Wikipedia), `بروفايل` (profile picture), `عرض` (view-once media), `اوامر` (command list), `المطور` (developer contact).

**Elites tier** — `اشراف` (promote), `خفض` (demote), `خفض_الكل` (demote all), `طرد` (kick), `حذف` (delete message), `منشن` (hidden mention), `جماعي` (tag all), `شات` (lock/unlock chat), `طلبات` (join requests), `بوتات` (linked devices), `نخبة_اضف`/`نخبة_ازل` (manage elite list), `النخبة` (list elites), `نخبة_اشراف` (promote all elites).

**Owner tier** — `تشغيل`/`ايقاف`/`جلسات` (session management), `تنصيب` (generate pair code), `الكل` (toggle public commands), `مجموعات` (list groups), `رابط` (invite link), `تخمين` (number guessing), `تست` (test bot), `$` (built-in terminal).

### Adding a New Command

```js
// commands/everyone/tools/hello.js
export default {
  cmd: "هلا",
  description: "Simple greeting reply",
  aliases: ["hi", "hello"],
  category: "ادوات",

  do: async (wa, msg, args) => {
    await wa.sendMessage(
      msg.key.remoteJid,
      { text: "أهلاً بك" },
      { quoted: msg }
    );
  },
};
```

Save the file — it is auto-detected. Place it under `everyone` / `elites` / `owner` depending on the required permission tier.

### Troubleshooting

- **Command not responding** — check the prefix in `config.js`; confirm the command is not `owner`/`elites`-only, or that you hold the required tier.
- **Audio/video conversion fails** — verify with `ffmpeg -version`.
- **Sticker/image fails** — verify with `convert -version`.
- **Frequent disconnects** — check your network, or delete the session folder in `clients/` and re-link.

### Contributing

```bash
git checkout -b feature/my-feature
git commit -m "feat: short description"
git push origin feature/my-feature
```

Then open a Pull Request.

### Disclaimer

For educational use and management of your own groups. Any use that violates WhatsApp's Terms of Service is the sole responsibility of the end user.

### License

ISC License — free to use, modify, and redistribute.

---

<div align="center">

[العربية](#nebras-bot-ar) &nbsp;|&nbsp; [English](#english-version)

</div>
