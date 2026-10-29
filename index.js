const {
  default: makeWASocket,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const figlet = require("figlet");
const chalk = require("chalk");
const HandleMsg = require("./HandleMsg");
const config = require("./config"); // Memanggil data dari config.js

async function startBot() {
  // 1. Bersihin terminal biar rapi
  console.clear();

  // 2. Cetak Banner ASCII dengan font 'Slant' biar miring dan garang
  console.log(
    chalk.cyanBright(
      figlet.textSync(config.botName, {
        font: "Slant",
        horizontalLayout: "fitted",
      }),
    ),
  );

  // 3. Kotak Info & Quotes Keren (Pakai border ganda)
  console.log(
    chalk.magenta(
      " ╔════════════════════════════════════════════════════════════════╗",
    ),
  );
  console.log(
    chalk.magenta(" ║ ") +
      chalk.blueBright("👨‍💻 Owner      : ") +
      chalk.yellow(config.ownerName),
  );
  console.log(
    chalk.magenta(" ║ ") +
      chalk.blueBright("📱 Kontak     : ") +
      chalk.yellow(`+${config.ownerNumber}`),
  );
  console.log(
    chalk.magenta(" ║ ") +
      chalk.blueBright("🖥️  OS Sistem  : ") +
      chalk.yellow("Lubuntu Linux (Backend PPLG)"),
  );
  console.log(
    chalk.magenta(" ║ ") +
      chalk.blueBright("🚀 Engine     : ") +
      chalk.greenBright("Baileys WebSocket"),
  );
  console.log(
    chalk.magenta(
      " ╠════════════════════════════════════════════════════════════════╣",
    ),
  );
  console.log(
    chalk.magenta(" ║ ") +
      chalk.cyan('"Talk is cheap. Show me the code." - Linus Torvalds       ') +
      chalk.magenta("║"),
  );
  console.log(
    chalk.magenta(" ║ ") +
      chalk.cyan(
        "  (Pantang tekan Ctrl+C sebelum errornya hilang!)           ",
      ) +
      chalk.magenta("║"),
  );
  console.log(
    chalk.magenta(
      " ╚════════════════════════════════════════════════════════════════╝\n",
    ),
  );

  const { state, saveCreds } = await useMultiFileAuthState("./session-baileys");

  const piyo = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
  });

  piyo.ev.on("creds.update", saveCreds);

  piyo.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(chalk.green("» Scan QR Code ini pakai WhatsApp lu:"));
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const shouldReconnect = lastDisconnect.error?.output?.statusCode !== 401;
      console.log(chalk.red("» Koneksi terputus! Reconnecting..."));
      if (shouldReconnect) startBot();
    } else if (connection === "open") {
      console.log(
        chalk.greenBright(
          "\n✅ MANTAP! Bot udah berhasil tersambung ke WhatsApp!",
        ),
      );
    }
  });

  piyo.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0];
    if (msg && !msg.key.fromMe && m.type === "notify") {
      try {
        await HandleMsg(piyo, msg);
      } catch (error) {
        console.error("Error memproses pesan:", error);
      }
    }
  });
}

startBot();
