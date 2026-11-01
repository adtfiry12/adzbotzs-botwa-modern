const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const figlet = require("figlet");
const chalk = require("chalk");
const qrcode = require("qrcode-terminal");
const express = require("express");
const path = require("path");

// Deteksi otomatis binary FFmpeg jika menggunakan @ffmpeg-installer di cloud
try {
  const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
  if (ffmpegInstaller?.path) {
    const ffmpegDir = path.dirname(ffmpegInstaller.path);
    if (!process.env.PATH.includes(ffmpegDir)) {
      process.env.PATH = `${ffmpegDir}:${process.env.PATH}`;
    }
  }
} catch (_) {}

const HandleMsg = require("./HandleMsg");
const config = require("./config");
const { getGroupSettings } = require("./features/groupSettings");

const originalConsoleInfo = console.info.bind(console);
console.info = (...args) => {
  if (args[0] === "Closing session:") return;
  originalConsoleInfo(...args);
};

let isBotStarting = false;
const processedMessageIds = new Set();
const processedMessageQueue = [];
const MAX_PROCESSED_MESSAGE_IDS = 5000;

function wasMessageProcessed(msg) {
  const key = msg?.key || {};
  const messageId = key.id;
  if (!messageId) return false;

  const uniqueId = [
    key.remoteJid || "",
    key.participant || "",
    messageId,
  ].join(":");
  if (processedMessageIds.has(uniqueId)) return true;

  processedMessageIds.add(uniqueId);
  processedMessageQueue.push(uniqueId);
  if (processedMessageQueue.length > MAX_PROCESSED_MESSAGE_IDS) {
    processedMessageIds.delete(processedMessageQueue.shift());
  }
  return false;
}

async function startBot() {
  if (isBotStarting) return;
  isBotStarting = true;

  console.clear();

  const botTitle = config.botName || "ADZBOTZS";
  console.log(
    chalk.cyanBright(
      figlet.textSync(botTitle, {
        font: "Slant",
        horizontalLayout: "fitted",
      }),
    ),
  );

  const terminalLines = [
    "╔════════════════════════════════════════════════════════════════╗",
    "║  ◈ ADZBOTZS // BOT-WA CONTROL NODE                             ║",
    "╠════════════════════════════════════════════════════════════════╣",
    `║  ◇ OPERATOR  :: ${String(config.ownerName || "Developer").padEnd(43)}    ║`,
    `║  ◇ CONTACT   :: +${String(config.ownerNumber || "-").padEnd(42)}    ║`,
    "║  ◇ PLATFORM  :: LINUX // BACKEND NODE                          ║",
    "║  ◇ ENGINE    :: BAILEYS WEBSOCKET (MULTI-DEVICE)               ║",
    "╠════════════════════════════════════════════════════════════════╣",
    "║  [ SYSTEM READY ]  //  SECURE SESSION INITIALIZING             ║",
    "║  [ SIGNAL ]        //  AWAITING WHATSAPP LINK                  ║",
    "╚════════════════════════════════════════════════════════════════╝",
  ];
  console.log(
    terminalLines
      .map((line, index) =>
        index === 1
          ? chalk.cyanBright(line)
          : index === 8 || index === 9
            ? chalk.cyan(line)
            : chalk.magenta(line),
      )
      .join("\n") + "\n",
  );

  const { state, saveCreds } = await useMultiFileAuthState("./session-baileys");

  const usePairingCode = Boolean(config.botNumber);

  const piyo = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: ["Ubuntu", "Chrome", "20.0.04"],
  });

  piyo.ev.on("creds.update", saveCreds);

  // Pairing code is used when BOT_NUMBER is set; otherwise show a terminal QR.
  if (!state.creds.registered) {
    if (usePairingCode) {
      setTimeout(async () => {
        const rawNumber = process.env.BOT_NUMBER || "";
        const cleanNumber = rawNumber.replace(/[^0-9]/g, "");

        if (!cleanNumber) {
          console.log(
            chalk.bgRed.white(
              "BOT_NUMBER tidak valid. Gunakan nomor internasional tanpa tanda +.",
            ),
          );
          return;
        }

        try {
          const code = await piyo.requestPairingCode(cleanNumber);
          console.log(
            chalk.black.bgCyan(`\n╔══════════════════════════════════════════════╗`),
          );
          console.log(
            chalk.black.bgCyan(`║        ◈ KODE PAIRING WHATSAPP ANDA ◈        ║`),
          );
          console.log(
            chalk.black.bgCyan(`╠══════════════════════════════════════════════╣`),
          );
          console.log(
            chalk.black.bgCyan(`║  Kode : ${chalk.bold(code.padEnd(35))}  ║`),
          );
          console.log(
            chalk.black.bgCyan(`║  Buka WA > Perangkat Tertaut > Tautkan No HP ║`),
          );
          console.log(
            chalk.black.bgCyan(`╚══════════════════════════════════════════════╝\n`),
          );
        } catch (err) {
          console.error("Gagal meminta kode pairing: ", err);
        }
      }, 3000);
    } else {
      console.log(
        chalk.yellow(
          "[MODE] Terminal aktif (BOT_NUMBER kosong).\n" +
            "» QR code akan ditampilkan di bawah.\n" +
            "» Isi BOT_NUMBER jika ingin memakai kode pairing.\n",
        ),
      );
    }
  }

  piyo.ev.on("group-participants.update", async (update) => {
    if (update.action !== "add") return;

    try {
      const settings = await getGroupSettings(update.id);
      if (!settings?.welcome) return;

      const metadata = await piyo.groupMetadata(update.id);
      const mentions = update.participants;
      const names = mentions.map((jid) => `@${jid.split("@")[0]}`).join(", ");
      await piyo.sendMessage(update.id, {
        text:
          `┏━━━ ⟡ *WELCOME NODE*\n` +
          `┃ ▸ Selamat datang ${names}\n` +
          `┃ ▸ Grup: *${metadata.subject}*\n` +
          `┗━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        mentions,
      });
    } catch (error) {
      console.error("Error welcome group:", error.message);
    }
  });

  piyo.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Tampilkan QR Code di terminal jika belum terhubung dan tidak memakai pairing code
    if (qr && !usePairingCode && !state.creds.registered) {
      console.log(
        chalk.cyan("\n[QR CODE] Scan kode QR berikut via WhatsApp > Perangkat Tertaut:"),
      );
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      isBotStarting = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(
        chalk.red(`» Koneksi terputus! (Kode: ${statusCode || "unknown"}). Reconnecting...`),
      );

      if (shouldReconnect) {
        setTimeout(() => startBot(), 3000);
      } else {
        console.log(
          chalk.bgRed.white(
            "Sesi WhatsApp logout. Hapus folder 'session-baileys' lalu hubungkan ulang.",
          ),
        );
      }
    } else if (connection === "open") {
      isBotStarting = false;
      console.log(
        chalk.greenBright(
          "\n<-|◈====== CONTROL BOT SUKSES TERSAMBUNG KE WHATSAPP ======◈|->\n",
        ),
      );
    }
  });

  piyo.ev.on("messages.upsert", async (m) => {
    const msg = m.messages?.[0];
    if (!msg || m.type !== "notify") return;
    if (wasMessageProcessed(msg)) return;

    const messageText =
      msg?.message?.conversation ||
      msg?.message?.extendedTextMessage?.text ||
      msg?.message?.imageMessage?.caption ||
      msg?.message?.videoMessage?.caption ||
      "";
    const isCommand = /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/.test(messageText);

    if (!msg.key.fromMe || isCommand) {
      try {
        await HandleMsg(piyo, msg);
      } catch (error) {
        console.error("Error memproses pesan:", error.message);
      }
    }
  });
}

startBot();

// --- WEB SERVER KEEP-ALIVE (BACK4APP HOSTING) ---
const app = express();
const port = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send(`
    <html>
      <head><title>ADZBOTZS // ONLINE</title></head>
      <body style="background:#0d1117;color:#58a6ff;font-family:monospace;padding:2rem;">
        <h1>◈ ADZBOTZS // ACTIVE NODE 24/7</h1>
        <p>Status: Running</p>
        <p>Engine: Node.js & Baileys Multi-Device</p>
      </body>
    </html>
  `);
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`[WEB] Health server aktif di port ${port}.`);
});
