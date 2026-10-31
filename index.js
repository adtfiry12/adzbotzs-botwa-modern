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
const HandleMsg = require("./HandleMsg");
const config = require("./config");
const { getGroupSettings } = require("./features/groupSettings");

let isBotStarting = false;

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

  const usePairingCode = Boolean(process.env.BOT_NUMBER);

  const piyo = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: ["Ubuntu", "Chrome", "20.0.04"],
  });

  piyo.ev.on("creds.update", saveCreds);

  // --- LOGIKA AUTENTIKASI DUAL MODE ---
  // Mode 1 (Deploy / Cloud / Back4app): Menggunakan BOT_NUMBER untuk meminta Pairing Code
  // Mode 2 (Local Terminal): Menggunakan QR Code di terminal jika BOT_NUMBER tidak diisi
  if (!piyo.authState.creds.registered) {
    if (usePairingCode) {
      setTimeout(async () => {
        const rawNumber = process.env.BOT_NUMBER || "";
        const cleanNumber = rawNumber.replace(/[^0-9]/g, "");

        if (!cleanNumber) {
          console.log(
            chalk.bgRed.white(
              " ⚠️ ERROR: Variabel BOT_NUMBER tidak valid di file .env atau env Back4app! ⚠️ ",
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
          "ℹ️ Mode Terminal Lokal Aktif (BOT_NUMBER tidak diisi).\n" +
            "» QR Code akan ditampilkan di bawah untuk di-scan.\n" +
            "» Tip: Jika ingin memakai kode pairing, set BOT_NUMBER di file .env\n",
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
          `╭─〔 WELCOME 〕\n` +
          `├─ Selamat datang ${names}\n` +
          `╰─ di *${metadata.subject}*`,
        mentions,
      });
    } catch (error) {
      console.error("Error welcome group:", error.message);
    }
  });

  piyo.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Tampilkan QR Code di terminal jika belum terhubung dan tidak memakai pairing code
    if (qr && !usePairingCode && !piyo.authState.creds.registered) {
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
            " ⚠️ Sesi logout dari WhatsApp. Silakan hapus folder 'session-baileys' dan hubungkan ulang. ⚠️ ",
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
  console.log(`🌐 Web Server pancingan aktif di port :${port} (Ready untuk Back4app Keep-Alive)`);
});
