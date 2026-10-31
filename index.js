const {
  default: makeWASocket,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const figlet = require("figlet");
const chalk = require("chalk");
const HandleMsg = require("./HandleMsg");
const config = require("./config");
const { getGroupSettings } = require("./features/groupSettings");

async function startBot() {
  console.clear();

  console.log(
    chalk.cyanBright(
      figlet.textSync(config.botName, {
        font: "Slant",
        horizontalLayout: "fitted",
      }),
    ),
  );

  const terminalLines = [
    "╔════════════════════════════════════════════════════════════════╗",
    "║  ◈ ADZBOTZS // BOT-WA CONTROL NODE                             ║",
    "╠════════════════════════════════════════════════════════════════╣",
    `║  ◇ OPERATOR  :: ${String(config.ownerName).padEnd(43)}    ║`,
    `║  ◇ CONTACT   :: +${String(config.ownerNumber).padEnd(42)}    ║`,
    "║  ◇ PLATFORM  :: LINUX // BACKEND NODE                          ║",
    "║  ◇ ENGINE    :: BAILEYS WEBSOCKET                              ║",
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

  const piyo = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: ["Ubuntu", "Chrome", "20.0.04"],
  });

  piyo.ev.on("creds.update", saveCreds);

  if (!piyo.authState.creds.registered) {
    setTimeout(async () => {
      // Ambil nomor dari variabel Back4app dan bersihkan simbol/spasi
      let rawNumber = process.env.BOT_NUMBER;

      if (!rawNumber) {
        console.log(
          chalk.bgRed.white(
            " ⚠️ ERROR: Variabel BOT_NUMBER belum diisi di env Back4app! ⚠️ ",
          ),
        );
        return;
      }

      const cleanNumber = rawNumber.replace(/[^0-9]/g, "");

      try {
        const code = await piyo.requestPairingCode(cleanNumber);
        console.log(
          chalk.bgRed.white(`\n========================================`),
        );
        console.log(chalk.bgRed.white(` ⚠️ KODE PAIRING LU: ${code} ⚠️ `));
        console.log(
          chalk.bgRed.white(`========================================\n`),
        );
      } catch (err) {
        console.log("Gagal minta kode pairing: ", err);
      }
    }, 3000);
  }

  piyo.ev.on("group-participants.update", async (update) => {
    if (
      update.action !== "add" ||
      !(await getGroupSettings(update.id)).welcome
    ) {
      return;
    }

    try {
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
      console.error("Error welcome group:", error);
    }
  });

  piyo.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const shouldReconnect = lastDisconnect.error?.output?.statusCode !== 401;
      console.log(chalk.red("» Koneksi terputus! Reconnecting..."));
      if (shouldReconnect) startBot();
    } else if (connection === "open") {
      console.log(
        chalk.greenBright(
          "\n<-|◈====== CONTROL BOT SUKSES TERSAMBUNG KE WHATSAPP ======◈|->",
        ),
      );
    }
  });

  piyo.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0];
    const messageText =
      msg?.message?.conversation ||
      msg?.message?.extendedTextMessage?.text ||
      msg?.message?.imageMessage?.caption ||
      msg?.message?.videoMessage?.caption ||
      "";
    const isCommand = /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/.test(messageText);

    if (msg && m.type === "notify" && (!msg.key.fromMe || isCommand)) {
      try {
        await HandleMsg(piyo, msg);
      } catch (error) {
        console.error("Error memproses pesan:", error);
      }
    }
  });
}

startBot();

const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Server ADZBOTZS Aktif 24 Jam!"));
app.listen(process.env.PORT || 8080, () =>
  console.log("Web Server jalan buat pancingan Back4app"),
);
