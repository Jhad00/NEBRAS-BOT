<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:25D366,100:128C7E&height=200&section=header&text=NEBRAS-BOT&fontSize=60&fontColor=ffffff&animation=fadeIn&fontAlignY=35&desc=WhatsApp%20Multi-Device%20Bot&descAlignY=55&descSize=20" width="100%"/>

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=26&duration=2500&pause=1000&color=25D366&center=true&vCenter=true&width=600&lines=%D8%A8%D9%88%D8%AA+%D9%88%D8%A7%D8%AA%D8%B3%D8%A7%D8%A8+%D8%A7%D8%AD%D8%AA%D8%B1%D8%A7%D9%81%D9%8A;Fast+%E2%80%A2+Modular+%E2%80%A2+Arabic+First;Powered+by+Baileys" alt="Typing SVG" />

<br/>

![Stars](https://img.shields.io/github/stars/Jhad00/NEBRAS-BOT?style=for-the-badge&color=25D366&labelColor=black)
![Forks](https://img.shields.io/github/forks/Jhad00/NEBRAS-BOT?style=for-the-badge&color=25D366&labelColor=black)
![Last Commit](https://img.shields.io/github/last-commit/Jhad00/NEBRAS-BOT?style=for-the-badge&color=25D366&labelColor=black)
![License](https://img.shields.io/github/license/Jhad00/NEBRAS-BOT?style=for-the-badge&color=25D366&labelColor=black)

![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)
![WhatsApp](https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)
![Baileys](https://img.shields.io/badge/Baileys-7.0-orange?style=for-the-badge)

<br/>

[![عربي](https://img.shields.io/badge/🇸🇦_اللغة-العربية-25D366?style=for-the-badge)](#-nebras-bot-1)
[![English](https://img.shields.io/badge/🇬🇧_Language-English-128C7E?style=for-the-badge)](#-english-version)

</div>

---

<a name="-nebras-bot-1"></a>
# 🤖 NEBRAS-BOT

بوت واتساب متعدد الأجهزة (Multi-Device) مبني على مكتبة **Baileys**، بمعمارية وحدات (modular commands) تسمح بإضافة أو تعديل أي أمر دون المساس ببقية النظام. يدعم إدارة الجلسات المتعددة، صلاحيات متدرجة (عام / نخبة / مالك)، وأدوات تحميل وتحويل وسائط متكاملة.

<div align="center">
<img src="https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b520-4e1e4b90e5a7.gif" width="500">
</div>

---

## 📑 الفهرس

- [المميزات](#-المميزات)
- [هيكل المشروع](#-هيكل-المشروع)
- [المتطلبات الأساسية](#️-المتطلبات-الأساسية)
- [التثبيت والتشغيل](#-التثبيت-والتشغيل)
- [الحصول على المفاتيح](#-الحصول-على-المفاتيح-المطلوبة-apisjson)
- [قائمة الأوامر](#-قائمة-الأوامر)
- [إنشاء أمر جديد](#-إنشاء-أمر-جديد)
- [حل المشاكل](#-حل-المشاكل-الشائعة)
- [المساهمة](#-المساهمة)

---

## ✨ المميزات

<table>
<tr>
<td width="50%">

**⚡ بنية ديناميكية**
أي ملف `.js` داخل `commands/` يُحمَّل تلقائيًا (hot-reload) دون تعديل أي كود آخر.

**🔐 صلاحيات متدرجة**
`everyone` / `elites` / `owner` — كل تصنيف بمجلد خاص.

**📱 جلسات متعددة**
تشغيل أكثر من رقم واتساب من نفس السيرفر (`تشغيل` / `ايقاف` / `جلسات`).

**🔑 ربط بكود إقران**
لا حاجة لمسح QR يدويًا في كل مرة.

</td>
<td width="50%">

**🎬 أدوات وسائط متكاملة**
تحميل يوتيوب/انستغرام، تحويل صوت↔فيديو، فصل صوت عن موسيقى، تفريغ نصي، ملصقات، PDF.

**👑 إدارة مجموعات متقدمة**
ترقية/خفض، طرد، منشن مخفي وجماعي، قفل/فتح الشات، طلبات الانضمام.

**🧩 توسعة كاملة**
أضف أمرك الخاص خلال دقائق.

**🖥️ تكامل PM2**
تشغيل دائم مع auto-restart بالإنتاج.

</td>
</tr>
</table>

---

## 📂 هيكل المشروع

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

> ℹ️ تم حذف مجلد أوامر الذكاء الاصطناعي بالكامل من هذه النسخة العلنية.

---

## 🛠️ المتطلبات الأساسية

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

---

## 🚀 التثبيت والتشغيل

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
    dev: ["9639XXXXXXXX"],            // ⚠️ رقمك الدولي بدون + أو 00
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

اختر رمز الإقران، أدخل رقمك، ثم من واتساب: `الأجهزة المرتبطة > ربط جهاز > ربط برقم الهاتف`.

تشغيل دائم:
```bash
npm install -g pm2
pm2 start auto-run-pm2.js --name nebras-bot
pm2 save && pm2 startup
```

---

## 🔑 الحصول على المفاتيح المطلوبة (apis.json)

| الخدمة | الاستخدام | المصدر |
|---|---|---|
| Groq API Key | `نص` | [console.groq.com](https://console.groq.com/keys) مجاني |
| MVSep | `فصل` | [mvsep.com](https://mvsep.com) مجاني |

---

## 📜 قائمة الأوامر

> البادئة من `prefixes` بـ `config.js`. مثال: `.انستا <رابط>`

<details>
<summary><b>🌐 أوامر عامة (الجميع)</b></summary>

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

</details>

<details>
<summary><b>👥 أوامر النخبة (Elites)</b></summary>

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

</details>

<details>
<summary><b>🔐 أوامر المالك (Owner)</b></summary>

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

</details>

---

## ➕ إنشاء أمر جديد

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
      { text: "أهلاً بك! 👋" },
      { quoted: msg }
    );
  },
};
```

احفظ فقط — النظام يكتشفه تلقائيًا. ضعه بـ `everyone` / `elites` / `owner` حسب الصلاحية المطلوبة.

---

## 🩹 حل المشاكل الشائعة

<details>
<summary>الأمر لا يستجيب</summary>

تأكد من البادئة بـ `config.js`، وأن الأمر مو `owner`/`elites` وأنت لست مصنّفًا كذلك.
</details>

<details>
<summary>فشل تحويل صوت/فيديو</summary>

`ffmpeg -version` للتأكد من التثبيت.
</details>

<details>
<summary>فشل ملصق/صورة</summary>

`convert -version` للتأكد من ImageMagick.
</details>

<details>
<summary>انقطاع متكرر</summary>

تحقق الإنترنت، أو احذف مجلد الجلسة بـ `clients/` وأعد الربط.
</details>

---

## 🤝 المساهمة

```bash
git checkout -b feature/my-feature
git commit -m "feat: وصف مختصر"
git push origin feature/my-feature
```

افتح Pull Request بعدها.

## ⚠️ إخلاء مسؤولية

لأغراض تعليمية وإدارة مجموعاتك الخاصة. الاستخدام المخالف لشروط واتساب مسؤولية المستخدم وحده.

## 📄 الرخصة

رخصة **ISC** — استخدام وتعديل وتوزيع حر.

---

<a name="-english-version"></a>
<details>
<summary><h2>🇬🇧 English Version (click to expand)</h2></summary>

# 🤖 NEBRAS-BOT

A Multi-Device WhatsApp bot built on **Baileys**, with a modular command architecture — add or edit any command without touching the rest of the system. Supports multi-session management, tiered permissions (everyone / elites / owner), and a full set of download/conversion tools.

> **Note:** Command names stay in Arabic since the bot's core commands are Arabic-first. English speakers can still read this guide to install, configure, and use the bot; you'll just type Arabic command words (e.g. `.يوتيوب <link>`) to trigger them.

## Features

- **Dynamic command loading** — drop a `.js` file in `commands/`, it's auto-loaded (hot-reload), no other code touched.
- **Tiered permissions** — `everyone` / `elites` / `owner`, one folder per tier.
- **Multi-session** — run multiple WhatsApp numbers from one server.
- **Pair-code linking** — no manual QR scanning needed.
- **Full media toolkit** — YouTube/Instagram downloads, audio↔video conversion, vocal/music separation, speech-to-text, stickers, PDF tools.
- **Advanced group management** — promote/demote, kick, hidden/tagged mentions, chat lock, join-request handling.
- **Fully extensible** — add your own command in minutes.
- **PM2 integration** — keep the bot alive with auto-restart in production.

## Requirements

| Tool | Minimum | Purpose |
|---|---|---|
| Node.js | 20.x+ | Runs the project |
| npm | Bundled with Node.js | Installs dependencies |
| FFmpeg | Recent | Audio/video processing |
| ImageMagick | Recent | Image/sticker processing |
| Git | Any | Clone & update |
| PM2 (optional) | — | Keep-alive process manager |

```bash
sudo apt-get update && sudo apt-get install -y imagemagick ffmpeg git
```

## Install & Run

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

Choose pair-code linking, enter your phone number, then in WhatsApp: `Linked Devices > Link a Device > Link with phone number`.

Keep it running with PM2:
```bash
npm install -g pm2
pm2 start auto-run-pm2.js --name nebras-bot
pm2 save && pm2 startup
```

## API Keys

| Service | Used for | Get it from |
|---|---|---|
| Groq API Key | `نص` (speech-to-text) | [console.groq.com](https://console.groq.com/keys) — free |
| MVSep | `فصل` (audio separation) | [mvsep.com](https://mvsep.com) — free |

## Commands

Commands stay in Arabic (the bot is Arabic-first). Prefix is set in `config.js` (default `.`, `!`, or `1`), e.g. `.انستا <link>`.

**Everyone tier** — `يوتيوب` (YouTube download), `انستا` (Instagram download), `فيس` (Facebook download), `ملصق` (sticker), `فيد` (to video), `تحويل` (convert), `ضغط` (compress audio), `فصل` (vocal separation), `نص` (speech-to-text), `topdf`, `تصفح` (webpage to PDF), `ويكيبيديا` (Wikipedia), `بروفايل` (profile pic), `عرض` (view-once media), `اوامر` (command list), `المطور` (dev contact).

**Elites tier** — `اشراف` (promote), `خفض` (demote), `خفض_الكل` (demote all), `طرد` (kick), `حذف` (delete message), `منشن` (hidden mention), `جماعي` (tag all), `شات` (lock/unlock chat), `طلبات` (join requests), `بوتات` (linked devices), `نخبة_اضف`/`نخبة_ازل` (manage elite list), `النخبة` (list elites), `نخبة_اشراف` (promote all elites).

**Owner tier** — `تشغيل`/`ايقاف`/`جلسات` (session management), `تنصيب` (generate pair code), `الكل` (toggle public commands), `مجموعات` (list groups), `رابط` (invite link), `تخمين` (number guessing), `تست` (test bot), `$` (built-in terminal).

## Adding a New Command

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
      { text: "أهلاً بك! 👋" },
      { quoted: msg }
    );
  },
};
```

Just save the file — it's auto-detected. Place it under `everyone` / `elites` / `owner` depending on the required permission tier.

## Troubleshooting

- **Command not responding** — check your prefix in `config.js`; make sure you have the right tier.
- **Audio/video conversion fails** — verify with `ffmpeg -version`.
- **Sticker/image fails** — verify with `convert -version`.
- **Frequent disconnects** — check your network, or delete the session folder in `clients/` and re-link.

## Contributing

```bash
git checkout -b feature/my-feature
git commit -m "feat: short description"
git push origin feature/my-feature
```

Then open a Pull Request.

## Disclaimer

For educational use and managing your own groups. Any use violating WhatsApp's Terms of Service is solely the end user's responsibility.

## License

**ISC License** — free to use, modify, and redistribute.

</details>

---

<div align="center">

### 💚 إن أعجبك المشروع لا تنسَ ترك نجمة ⭐

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:128C7E,100:25D366&height=150&section=footer" width="100%"/>

</div>
