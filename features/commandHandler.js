const axios = require("axios");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const activeGames = {};
const config = require("../config");
const db = require("../db");
const { generateAnswer } = require("./gemini");
const { createVoiceNote } = require("./tts");
const { downloadAudio } = require("./youtube");
const { extractMessage } = require("./message");
const { enforceAntiLink } = require("./groupModeration");
const {
  registerConversation,
  relayTargetReply,
  sendSenderReply,
} = require("./menfess");
const os = require("os");
const path = require("path");
const { exec } = require("child_process");
const Tesseract = require("tesseract.js");
const yts = require("yt-search");

const afkUsers = new Map();

const menuLogoPath = process.env.MENU_LOGO_PATH
  ? path.resolve(process.env.MENU_LOGO_PATH)
  : path.join(__dirname, "../assets/menu-logo.png");

function normalizePhoneNumber(value) {
  const digits = String(value || "")
    .split(":")[0]
    .replace(/\D/g, "");
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

function isOwnerMessage(msg) {
  const configuredOwner = normalizePhoneNumber(config.ownerNumber);
  const senderJids = [
    msg.key.participant,
    msg.key.participantAlt,
    msg.key.senderPn,
    msg.key.remoteJid,
    msg.key.remoteJidAlt,
  ];
  return Boolean(
    configuredOwner &&
      senderJids.some(
        (senderJid) =>
          normalizePhoneNumber(senderJid) === configuredOwner,
      ),
  );
}

function getQuotedMessage(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
}

async function downloadMediaBuffer(mediaMessage, mediaType) {
  const stream = await downloadContentFromMessage(mediaMessage, mediaType);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function convertMedia(inputBuffer, inputExtension, outputExtension, options) {
  const baseName = path.join(__dirname, `../temp_${Date.now()}_${process.pid}`);
  const inputPath = `${baseName}.${inputExtension}`;
  const outputPath = `${baseName}.${outputExtension}`;
  fs.writeFileSync(inputPath, inputBuffer);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .addOutputOptions(options)
      .on("end", () => {
        try {
          resolve(fs.readFileSync(outputPath));
        } catch (error) {
          reject(error);
        } finally {
          for (const file of [inputPath, outputPath]) {
            if (fs.existsSync(file)) fs.unlinkSync(file);
          }
        }
      })
      .on("error", (error) => {
        for (const file of [inputPath, outputPath]) {
          if (fs.existsSync(file)) fs.unlinkSync(file);
        }
        reject(error);
      })
      .save(outputPath);
  });
}

module.exports = async (piyo, msg) => {
  try {
    const from = msg.key.remoteJid;

    // Ekstrak tipe pesan dan teksnya
    if (!msg?.message || !from) return;

    const { type, body } = extractMessage(msg);

    if (await relayTargetReply(piyo, msg, body)) return;

    const senderJid = msg.key.participant || msg.key.remoteJid;
    const commandMatch = body.match(
      /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]\s*([^\s]+)/i,
    );
    const senderAfk = afkUsers.get(senderJid);
    if (senderAfk && commandMatch?.[1].toLowerCase() !== "afk") {
      afkUsers.delete(senderJid);
      await piyo.sendMessage(
        from,
        {
          text: `⌁ Selamat datang kembali${senderAfk.reason ? ` dari "${senderAfk.reason}"` : ""}. Status AFK kamu sudah dinonaktifkan.`,
        },
        { quoted: msg },
      );
    }

    // --- LOGIKA PENGECEKAN GAME ---
    if (activeGames[from]) {
      const game = activeGames[from];
      // Cek apakah pesan user sama dengan jawaban di memori
      if (body.toLowerCase().trim() === game.jawaban.toLowerCase()) {
        await piyo.sendMessage(
          from,
          {
            text:
              `🎉 *BENAR SEKALI!*\n\n` +
              `Jawaban: *${game.jawaban}*\n` +
              `Ronde selesai. Kalau mau lanjut, ketik *.kuis* lagi.`,
          },
          { quoted: msg },
        );

        clearTimeout(game.timeout); // Matikan timer biar nggak ngirim "Waktu Habis"
        delete activeGames[from]; // Hapus memori game di chat ini
        return; // Stop proses ke bawah
      }
    }

    if (await enforceAntiLink(piyo, msg, from, body)) return;

    // Pastikan kode di bawah ini tetap ada di posisi aslinya
    const isCmd = /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi.test(body);
    const prefix = isCmd
      ? body.match(/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi)[0]
      : "";

    // --- MIDDLEWARE: SISTEM LEVELING & XP ---
    const sender = senderJid;
    const senderNum = sender.split("@")[0];

    try {
      // Cek apakah user udah ada di database
      const [userRows] = await db.query(
        "SELECT * FROM users WHERE nomor_wa = ?",
        [senderNum],
      );

      if (userRows.length === 0) {
        // Kalau user baru pertama kali chat, daftarin ke database
        await db.query(
          "INSERT INTO users (nomor_wa, xp, level) VALUES (?, ?, ?)",
          [senderNum, 10, 1],
        );
      } else {
        // Kalau udah ada, tambahin XP secara acak (5 - 15 XP per pesan)
        let currentXp = userRows[0].xp + Math.floor(Math.random() * 11) + 5;
        let currentLevel = userRows[0].level;
        let xpNeeded = currentLevel * 100; // Rumus batas XP buat naik level

        if (currentXp >= xpNeeded) {
          currentLevel += 1;
          currentXp -= xpNeeded; // Sisakan kelebihan XP

          // Kirim notifikasi kalau naik level (opsional, bisa lu komen kalau dirasa spam)
          await piyo.sendMessage(from, {
            text: `🎉 *LEVEL UP!*\nSelamat @${senderNum}, lu berhasil naik ke Level ${currentLevel}! 🚀`,
            mentions: [sender],
          });
        }

        // Update data terbaru ke MySQL
        await db.query(
          "UPDATE users SET xp = ?, level = ? WHERE nomor_wa = ?",
          [currentXp, currentLevel, senderNum],
        );
      }
    } catch (error) {
      console.error("Error DB Leveling:", error);
    }

    if (!isCmd) return;

    // Pisahkan Command dan Argumen
    const args = body.substring(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const q = args.join(" ");

    console.log(`[CMD] ${prefix}${command} dari ${from}`);

    switch (command) {
      case "menu":
      case "help":
        const menuOwner = isOwnerMessage(msg)
          ? `┏━━━ ⟡ *OWNER CONSOLE*\n` +
            `┃ ▸ *${prefix}status*           — monitoring server\n` +
            `┃ ▸ *${prefix}exec [cmd]*       — terminal Linux\n` +
            `┗━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
          : "";

        const menuUtama =
          `╔══════════════════════════════╗\n` +
          `║    *A D Z B O T Z S // OS*   ║\n` +
          `╚══════════════════════════════╝\n` +
          `_Personal cyber utility interface_\n\n` +
          `◈ *OPERATOR*\n` +
          `  ├─ Owner  : ${config.ownerName}\n` +
          `  └─ Engine : Node.js / Baileys\n\n` +
          `┏━━━ ⟡ *TOOLS & INTELLIGENCE*\n` +
          `┃ ▸ *${prefix}sticker / s*  — gambar → stiker\n` +
          `┃ ▸ *${prefix}say [teks]*      — teks → voice note\n` +
          `┃ ▸ *${prefix}salin*          — OCR dari foto\n` +
          `┃ ▸ *${prefix}ai [tanya]*     — smart assistant\n` +
          `┃ ▸ *${prefix}ping*            — cek koneksi bot\n` +
          `┃ ▸ *${prefix}toimg*            — stiker → gambar\n` +
          `┃ ▸ *${prefix}tomp3*            — video/audio → MP3\n` +
          `┗━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `┏━━━ ⟡ *DOWNLOAD NODE*\n` +
          `┃ ▸ *${prefix}tt [link]*       — TikTok tanpa watermark\n` +
          `┃ ▸ *${prefix}play [judul]*    — audio MP3\n` +
          `┗━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `┏━━━ ⟡ *SOCIAL & GAME*\n` +
          `┃ ▸ *${prefix}kuis*             — mini game IT\n` +
          `┃ ▸ *${prefix}rank*             — level & XP global\n` +
          `┃ ▸ *${prefix}afk [alasan]*      — status away otomatis\n` +
          `┃ ▸ *${prefix}menfess [nomor] [pesan]*\n` +
          `┃ ▸ *${prefix}jokes*            — random jokes\n` +
          `┗━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `┏━━━ ⟡ *GROUP CONTROL*\n` +
          `┃ ▸ *${prefix}hidetag [teks]*   — pengumuman\n` +
          `┃ ▸ *${prefix}groupinfo*         — info grup\n` +
          `┃ ▸ *${prefix}tagadmin [pesan]* — mention admin\n` +
          `┃ ▸ *Anti-link*              — auto delete & kick\n` +
          `┗━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          menuOwner +
          `⌁ *${prefix}owner* — kontak developer\n\n` +
          `⌁ Ketik *${prefix}menu* kapan saja untuk membuka interface.`;

        if (!fs.existsSync(menuLogoPath)) {
          throw new Error(`Menu logo tidak ditemukan: ${menuLogoPath}`);
        }

        await piyo.sendMessage(
          from,
          { image: fs.readFileSync(menuLogoPath), caption: menuUtama },
          { quoted: msg },
        );
        break;

      case "owner":
      case "creator":
        const vcard =
          "BEGIN:VCARD\n" +
          "VERSION:3.0\n" +
          `FN:${config.ownerName}\n` +
          "ORG:PPLG Developer;\n" +
          `TEL;type=CELL;type=VOICE;waid=${config.ownerNumber}:+${config.ownerNumber}\n` +
          "END:VCARD";

        await piyo.sendMessage(
          from,
          {
            contacts: {
              displayName: config.ownerName,
              contacts: [{ vcard }],
            },
          },
          { quoted: msg },
        );
        break;

      case "jokes":
        try {
          const res = await axios.get(
            "https://candaan-api.vercel.app/api/text/random",
          );
          await piyo.sendMessage(
            from,
            { text: res.data.data },
            { quoted: msg },
          );
        } catch (e) {
          await piyo.sendMessage(
            from,
            { text: "Waduh, server API-nya lagi ngambek bro." },
            { quoted: msg },
          );
        }
        break;

      // --- FITUR AUTO STICKER MAKER ---
      case "s":
      case "sticker":
      case "stiker":
        // Cek apakah pesan ini gambar, atau balasan (quote) ke pesan gambar
        const isImage = type === "imageMessage";
        const isQuotedImage =
          type === "extendedTextMessage" &&
          msg.message.extendedTextMessage.contextInfo?.quotedMessage
            ?.imageMessage;

        if (isImage || isQuotedImage) {
          await piyo.sendMessage(
            from,
            { text: "⏳ *Bentar, lagi di-render jadi stiker...*" },
            { quoted: msg },
          );

          // Tentukan target pesan yang mau di-download
          const targetMessage = isQuotedImage
            ? msg.message.extendedTextMessage.contextInfo.quotedMessage
            : msg.message;
          const mediaType = isQuotedImage ? "imageMessage" : type;

          try {
            // 1. Download gambar dari server WA (berupa stream)
            const stream = await downloadContentFromMessage(
              targetMessage[mediaType],
              "image",
            );
            let mediaBuffer = Buffer.from([]);
            for await (const chunk of stream) {
              mediaBuffer = Buffer.concat([mediaBuffer, chunk]);
            }

            // 2. Bikin nama file temporary (sementara)
            const tempFile = `./temp_${Date.now()}.jpg`;
            const outFile = `./temp_${Date.now()}.webp`;
            fs.writeFileSync(tempFile, mediaBuffer);

            // 3. Konversi gambar ke format stiker WebP pakai FFmpeg
            ffmpeg(tempFile)
              .on("error", (err) => {
                console.error("FFmpeg Error:", err);
                piyo.sendMessage(
                  from,
                  { text: "❌ Gagal bikin stiker bro." },
                  { quoted: msg },
                );
                fs.unlinkSync(tempFile); // Bersihin sampah
              })
              .on("end", () => {
                // 4. Kirim stikernya ke WA
                piyo.sendMessage(
                  from,
                  { sticker: fs.readFileSync(outFile) },
                  { quoted: msg },
                );
                // 5. Hapus file sampah biar disk Lubuntu lu nggak penuh
                fs.unlinkSync(tempFile);
                fs.unlinkSync(outFile);
              })
              .addOutputOptions([
                `-vcodec`,
                `libwebp`,
                `-vf`,
                `scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, format=rgba`,
                `-loop`,
                `0`,
                `-preset`,
                `default`,
                `-an`,
                `-vsync`,
                `0`,
              ])
              .toFormat("webp")
              .save(outFile);
          } catch (err) {
            console.error("Download Error:", err);
            await piyo.sendMessage(
              from,
              { text: "❌ Gagal narik gambar dari server WA." },
              { quoted: msg },
            );
          }
        } else {
          await piyo.sendMessage(
            from,
            {
              text: `Kirim foto dengan caption *${prefix}sticker* atau reply foto dengan *${prefix}sticker*`,
            },
            { quoted: msg },
          );
        }
        break;

      case "say":
        if (!q)
          return await piyo.sendMessage(
            from,
            {
              text: `Teksnya mana bro? Contoh: *${prefix}say Bot ini buatan anak back-end*`,
            },
            { quoted: msg },
          );

        try {
          const audioBuffer = await createVoiceNote(q);

          await piyo.sendMessage(
            from,
            {
              audio: audioBuffer,
              mimetype: "audio/ogg; codecs=opus",
              ptt: true,
            },
            { quoted: msg },
          );
        } catch (err) {
          console.error("Error TTS:", err);
          await piyo.sendMessage(
            from,
            { text: "❌ Server suaranya lagi serak bro." },
            { quoted: msg },
          );
        }
        break;

      // --- KONVERSI STIKER KE GAMBAR ---
      case "toimg":
      case "toimage": {
        const quotedMessage = getQuotedMessage(msg);
        const stickerMessage =
          type === "stickerMessage"
            ? msg.message.stickerMessage
            : quotedMessage?.stickerMessage;

        if (!stickerMessage) {
          return await piyo.sendMessage(
            from,
            {
              text: `Reply sticker dengan *${prefix}toimg* untuk mengubahnya menjadi gambar.`,
            },
            { quoted: msg },
          );
        }

        try {
          await piyo.sendMessage(
            from,
            { text: "⌁ Mengubah sticker menjadi gambar..." },
            { quoted: msg },
          );
          const inputBuffer = await downloadMediaBuffer(
            stickerMessage,
            "sticker",
          );
          const imageBuffer = await convertMedia(
            inputBuffer,
            "webp",
            "png",
            ["-frames:v", "1"],
          );
          await piyo.sendMessage(
            from,
            { image: imageBuffer, caption: "⌁ Sticker berhasil dikonversi." },
            { quoted: msg },
          );
        } catch (error) {
          console.error("Error toimg:", error);
          await piyo.sendMessage(
            from,
            { text: "Gagal mengubah sticker menjadi gambar." },
            { quoted: msg },
          );
        }
        break;
      }

      // --- KONVERSI VIDEO/AUDIO KE MP3 ---
      case "tomp3":
      case "toaudio": {
        const quotedMessage = getQuotedMessage(msg);
        const mediaMessage =
          type === "videoMessage"
            ? msg.message.videoMessage
            : type === "audioMessage"
              ? msg.message.audioMessage
              : quotedMessage?.videoMessage || quotedMessage?.audioMessage;
        const mediaType =
          type === "videoMessage" || quotedMessage?.videoMessage
            ? "video"
            : "audio";

        if (!mediaMessage) {
          return await piyo.sendMessage(
            from,
            {
              text: `Kirim atau reply video/audio dengan caption *${prefix}tomp3*.`,
            },
            { quoted: msg },
          );
        }

        try {
          await piyo.sendMessage(
            from,
            { text: "⌁ Mengonversi media ke MP3..." },
            { quoted: msg },
          );
          const inputBuffer = await downloadMediaBuffer(
            mediaMessage,
            mediaType,
          );
          const audioBuffer = await convertMedia(
            inputBuffer,
            mediaType === "video" ? "mp4" : "ogg",
            "mp3",
            ["-vn", "-codec:a", "libmp3lame", "-b:a", "128k"],
          );
          await piyo.sendMessage(
            from,
            {
              audio: audioBuffer,
              mimetype: "audio/mpeg",
              fileName: "adzbotzs-audio.mp3",
            },
            { quoted: msg },
          );
        } catch (error) {
          console.error("Error tomp3:", error);
          await piyo.sendMessage(
            from,
            { text: "Gagal mengonversi media menjadi MP3." },
            { quoted: msg },
          );
        }
        break;
      }

      // --- FITUR TIKTOK DOWNLOADER (NO WATERMARK) ---
      case "tiktok":
      case "tt":
        if (!q)
          return await piyo.sendMessage(
            from,
            {
              text: `Link TikTok-nya mana bro? Contoh: *${prefix}tt https://vt.tiktok.com/xxxxxx*`,
            },
            { quoted: msg },
          );

        // Kasih respon loading biar user tahu botnya lagi kerja
        await piyo.sendMessage(
          from,
          { text: "⏳ *Sedang narik video dari TikTok, tunggu bentar...*" },
          { quoted: msg },
        );

        try {
          // Nembak REST API TikWM
          const res = await axios.post("https://www.tikwm.com/api/", {
            url: q,
          });

          if (res.data.code === 0) {
            // Code 0 artinya sukses nangkep data
            const videoUrl = res.data.data.play; // Ambil URL video tanpa watermark
            const title = res.data.data.title; // Ambil caption asli videonya
            const author = res.data.data.author.nickname; // Ambil nama uploader

            // Kirim video langsung ke chat WA
            await piyo.sendMessage(
              from,
              {
                video: { url: videoUrl },
                caption: `*👤 Kreator:* ${author}\n*📝 Judul:* ${title}\n\n*🚀 Downloaded via ADZBOTZS*`,
              },
              { quoted: msg },
            );
          } else {
            await piyo.sendMessage(
              from,
              {
                text: "❌ Gagal ngambil video. Pastikan linknya bener dan videonya nggak di-private.",
              },
              { quoted: msg },
            );
          }
        } catch (err) {
          console.error("Error TikTok Downloader:", err);
          await piyo.sendMessage(
            from,
            { text: "❌ Server API lagi down atau link nggak valid." },
            { quoted: msg },
          );
        }
        break;

      // --- FITUR MINI GAME ---
      case "tebak":
      case "kuis":
      case "kuislagi":
      case "nextquiz":
        // Cek dulu, jangan sampai orang spam game kalau game sebelumnya belum kelar
        if (activeGames[from]) {
          return await piyo.sendMessage(
            from,
            {
              text:
                "⚠️ Masih ada soal yang belum dijawab di chat ini.\n" +
                "Jawab dulu soal sebelumnya atau tunggu sampai waktunya habis.",
            },
            { quoted: msg },
          );
        }

        try {
          // Tarik 1 soal acak secara dinamis langsung dari database MySQL
          const [rows] = await db.query(
            "SELECT soal, jawaban FROM soal_kuis ORDER BY RAND() LIMIT 1",
          );

          // Jaga-jaga kalau tabel soal di database lu ternyata masih kosong
          if (rows.length === 0) {
            return await piyo.sendMessage(
              from,
              {
                text: "⚠️ Waduh, bank soal di database MySQL masih kosong bro!",
              },
              { quoted: msg },
            );
          }

          const randomSoal = rows[0];

          // Kirim soal ke WA
          const teksKuis =
            `🎮 *KUIS ADZBOTZS // RONDE BARU*\n\n` +
            `❓ *Soal:* ${randomSoal.soal}\n` +
            `⏳ *Waktu:* 60 Detik\n\n` +
            `_Langsung ketik jawabannya di chat ini!_\n` +
            `_Setelah selesai, ketik *.kuis* untuk ronde berikutnya._`;

          await piyo.sendMessage(from, { text: teksKuis }, { quoted: msg });

          // Simpan state game ke memori dengan timer 60 detik
          activeGames[from] = {
            jawaban: randomSoal.jawaban,
            timeout: setTimeout(async () => {
              // Kalau dalam 60 detik memori masih ada (belum dijawab benar), kirim pesan ini
              if (activeGames[from]) {
                await piyo.sendMessage(from, {
                  text:
                    `⏰ *WAKTU HABIS!*\n\n` +
                    `Jawabannya adalah: *${randomSoal.jawaban}*\n` +
                    `Kalau mau coba lagi, ketik *.kuis*.`,
                });
                delete activeGames[from]; // Bersihkan memori
              }
            }, 60000),
          };
        } catch (error) {
          console.error("Error DB Kuis:", error);
          await piyo.sendMessage(
            from,
            { text: "❌ Gagal narik soal! Cek koneksi MySQL lu di terminal." },
            { quoted: msg },
          );
        }
        break;

      // --- FITUR SMART CHAT AI (GEMINI) ---
      case "ai":
      case "ask":
      case "gemini":
        if (!q)
          return await piyo.sendMessage(
            from,
            {
              text: `Mau nanya apa bro? Contoh: *${prefix}ai tolong buatin fungsi array di PHP*`,
            },
            { quoted: msg },
          );

        // Kasih respon indikator loading
        await piyo.sendMessage(
          from,
          { text: "⏳ *Bentar bro, AI lagi mikir...*" },
          { quoted: msg },
        );

        try {
          const response = await generateAnswer(q);

          // WhatsApp menolak pesan teks yang terlalu panjang; kirim bertahap.
          const chunks = response.match(/[\s\S]{1,4000}/g) || [];
          for (const [index, chunk] of chunks.entries()) {
            const sendOptions = index === 0 ? { quoted: msg } : {};
            await piyo.sendMessage(from, { text: chunk }, sendOptions);
          }
        } catch (err) {
          console.error("Error Gemini AI:", err);
          await piyo.sendMessage(
            from,
            {
              text: "❌ Waduh, otak AI-nya lagi nge-hang bro. Coba lagi nanti.",
            },
            { quoted: msg },
          );
        }
        break;

      // --- FITUR AFK ---
      case "afk": {
        const reason = q.trim();
        afkUsers.set(senderJid, {
          reason,
          since: Date.now(),
        });
        await piyo.sendMessage(
          from,
          {
            text:
              `⌁ Status AFK aktif${reason ? `: ${reason}` : "."}\n` +
              `Kirim pesan lagi untuk kembali online.`,
          },
          { quoted: msg },
        );
        break;
      }

      // --- FITUR INFO GRUP ---
      case "groupinfo":
      case "gcinfo": {
        if (!from.endsWith("@g.us")) {
          return await piyo.sendMessage(
            from,
            { text: "Fitur ini hanya bisa dipakai di dalam grup." },
            { quoted: msg },
          );
        }

        try {
          const metadata = await piyo.groupMetadata(from);
          const admins = metadata.participants.filter((participant) =>
            Boolean(participant.admin),
          ).length;
          await piyo.sendMessage(
            from,
            {
              text:
                `╭─〔 GROUP INFO 〕\n` +
                `├─ Nama    : ${metadata.subject}\n` +
                `├─ Member  : ${metadata.participants.length}\n` +
                `├─ Admin   : ${admins}\n` +
                `├─ ID      : ${metadata.id}\n` +
                `╰─ Dibuat  : ${metadata.creation ? new Date(metadata.creation * 1000).toLocaleString("id-ID") : "Tidak tersedia"}`,
            },
            { quoted: msg },
          );
        } catch (error) {
          console.error("Error Group Info:", error);
          await piyo.sendMessage(
            from,
            { text: "Gagal mengambil informasi grup." },
            { quoted: msg },
          );
        }
        break;
      }

      // --- FITUR MENTION ADMIN ---
      case "tagadmin":
      case "tagadmins": {
        if (!from.endsWith("@g.us")) {
          return await piyo.sendMessage(
            from,
            { text: "Fitur ini hanya bisa dipakai di dalam grup." },
            { quoted: msg },
          );
        }

        try {
          const metadata = await piyo.groupMetadata(from);
          const adminJids = metadata.participants
            .filter((participant) => Boolean(participant.admin))
            .map((participant) => participant.id);
          if (adminJids.length === 0) {
            return await piyo.sendMessage(
              from,
              { text: "Tidak ada data admin yang tersedia." },
              { quoted: msg },
            );
          }

          await piyo.sendMessage(
            from,
            {
              text: `${q || "⌁ Admin grup, mohon bantu cek pesan ini."}\n\n${adminJids.map((jid) => `@${jid.split("@")[0]}`).join(" ")}`,
              mentions: adminJids,
            },
            { quoted: msg },
          );
        } catch (error) {
          console.error("Error Tag Admin:", error);
          await piyo.sendMessage(
            from,
            { text: "Gagal mengambil daftar admin grup." },
            { quoted: msg },
          );
        }
        break;
      }

      case "hidetag":
      case "pengumuman":
      case "tagall":
        // 1. Validasi: Pastikan command ini cuma dipakai di dalam Grup
        if (!from.endsWith("@g.us")) {
          return await piyo.sendMessage(
            from,
            { text: "⚠️ Woy, fitur ini cuma bisa dipakai di dalam Grup bro!" },
            { quoted: msg },
          );
        }

        // 2. Ambil data semua member di grup tersebut
        const groupMetadata = await piyo.groupMetadata(from);
        const participants = groupMetadata.participants;

        // 3. Ekstrak semua ID (nomor WA) member grup
        const memberJids = participants.map((p) => p.id);

        // 4. Siapkan teks pengumuman
        const teksPengumuman = q
          ? q
          : "📢 *PENGUMUMAN UNTUK SELURUH WARGA GRUP!*";

        // 5. Kirim pesan dengan fitur 'mentions' bawaan Baileys
        await piyo.sendMessage(from, {
          text: teksPengumuman,
          mentions: memberJids,
        });
        break;

      // --- PING PUBLIK ---
      case "ping": {
        const pingStartedAt = Date.now();
        await piyo.sendMessage(
          from,
          { text: "⌁ Mengukur koneksi..." },
          { quoted: msg },
        );
        const latency = Date.now() - pingStartedAt;
        await piyo.sendMessage(
          from,
          {
            text:
              `╭─〔 PING 〕\n` +
              `├─ Latency : ${latency} ms\n` +
              `├─ Status  : ONLINE\n` +
              `╰─ Engine  : ADZBOTZS`,
          },
          { quoted: msg },
        );
        break;
      }

      // --- MONITOR SERVER (OWNER ONLY) ---
      case "status":
      case "server":
        if (!isOwnerMessage(msg)) {
          return await piyo.sendMessage(
            from,
            { text: "⌁ Akses ditolak. Status server hanya untuk owner." },
            { quoted: msg },
          );
        }

        // Kalkulasi Uptime
        const uptime = process.uptime();
        const jam = Math.floor(uptime / 3600);
        const menit = Math.floor((uptime % 3600) / 60);
        const detik = Math.floor(uptime % 60);

        // Kalkulasi RAM (Konversi dari Byte ke Megabyte)
        const totalRAM = Math.round(os.totalmem() / 1024 / 1024);
        const freeRAM = Math.round(os.freemem() / 1024 / 1024);
        const usedRAM = totalRAM - freeRAM;

        const serverInfo =
          `╭─〔 SERVER STATUS // OWNER 〕\n` +
          `├─ OS      : ${os.type()} ${os.release()}\n` +
          `├─ RAM     : ${usedRAM} MB / ${totalRAM} MB\n` +
          `├─ Uptime  : ${jam}j ${menit}m ${detik}d\n` +
          `╰─ Engine  : Node.js ${process.version}`;

        await piyo.sendMessage(from, { text: serverInfo }, { quoted: msg });
        break;

      // --- FITUR YOUTUBE PLAY (AUDIO) ---
      case "play":
      case "lagu":
        if (!q)
          return await piyo.sendMessage(
            from,
            {
              text: `Judul lagunya apa bro? Contoh: *${prefix}play Nadin Amizah Sorai*`,
            },
            { quoted: msg },
          );

        await piyo.sendMessage(
          from,
          { text: "⏳ *Lagi mencari dan mengunduh lagunya, bentar bro...*" },
          { quoted: msg },
        );

        try {
          // 1. Cari video di YouTube berdasarkan judul
          const search = await yts(q);
          const video = search.videos[0]; // Ambil hasil pencarian teratas

          if (!video)
            return await piyo.sendMessage(
              from,
              { text: "❌ Lagunya nggak ketemu bro." },
              { quoted: msg },
            );

          // 2. Kirim info lagu & Thumbnail
          const infoLagu =
            `🎵 *YOUTUBE MUSIC*\n\n` +
            `*📌 Judul:* ${video.title}\n` +
            `*⏱️ Durasi:* ${video.timestamp}\n` +
            `*👁️ Views:* ${video.views}\n\n` +
            `_Sedang mengirim audio, tunggu sebentar..._`;

          await piyo.sendMessage(
            from,
            { image: { url: video.thumbnail }, caption: infoLagu },
            { quoted: msg },
          );

          await piyo.sendMessage(
            from,
            { text: "⬇️ *Audio sedang diproses dan dikompres, tunggu sebentar...*" },
            { quoted: msg },
          );
          const audioBuffer = await downloadAudio(video.url);
          await piyo.sendMessage(
            from,
            {
              audio: audioBuffer,
              mimetype: "audio/mpeg",
              fileName: `${video.title}.mp3`,
            },
            { quoted: msg },
          );
        } catch (err) {
          console.error("Error YT Play:", err);
          await piyo.sendMessage(
            from,
            {
              text: `❌ Gagal mengunduh lagu.\n\n${err.message}\n\nCoba judul atau link YouTube lain.`,
            },
            { quoted: msg },
          );
        }
        break;

      // --- FITUR LEVELING & PROFILE ---
      case "rank":
      case "profile":
      case "level":
        try {
          const target = msg.key.participant || msg.key.remoteJid;
          const targetNum = target.split("@")[0];

          // Tarik data profil dari database
          const [profileRows] = await db.query(
            "SELECT xp, level FROM users WHERE nomor_wa = ?",
            [targetNum],
          );

          if (profileRows.length > 0) {
            const pLevel = profileRows[0].level;
            const pXp = profileRows[0].xp;
            const pNext = pLevel * 100;

            const teksRank =
              `📊 *GLOBAL RANK & PROFILE*\n\n` +
              `👤 *User:* @${targetNum}\n` +
              `🎖️ *Level:* ${pLevel}\n` +
              `✨ *XP:* ${pXp} / ${pNext}\n\n` +
              `_Terus berinteraksi biar cepet naik level!_`;

            await piyo.sendMessage(
              from,
              { text: teksRank, mentions: [target] },
              { quoted: msg },
            );
          } else {
            await piyo.sendMessage(
              from,
              { text: "Belum ada data, coba kirim beberapa pesan dulu." },
              { quoted: msg },
            );
          }
        } catch (err) {
          console.error("Error Cek Rank:", err);
          await piyo.sendMessage(
            from,
            { text: "❌ Gagal narik data profil dari database." },
            { quoted: msg },
          );
        }
        break;

      // --- FITUR MENFESS (PESAN ANONIM) ---
      case "balas":
      case "replymenfess":
        if (!q) {
          return await piyo.sendMessage(
            from,
            {
              text: `Tulis balasannya. Contoh: *${prefix}balas Halo juga, apa kabar?*`,
            },
            { quoted: msg },
          );
        }

        try {
          const sent = await sendSenderReply(piyo, from, q);
          await piyo.sendMessage(
            from,
            {
              text: sent
                ? "✅ Balasan anonim berhasil dikirim ke target."
                : "⚠️ Tidak ada sesi menfess aktif. Kirim menfess baru terlebih dahulu.",
            },
            { quoted: msg },
          );
        } catch (err) {
          console.error("Error Balas Menfess:", err);
          await piyo.sendMessage(
            from,
            { text: "❌ Gagal mengirim balasan menfess." },
            { quoted: msg },
          );
        }
        break;

      case "menfess":
      case "confess":
        // q berisi: "6285xxx Halo apa kabar"
        if (!q || !q.includes(" ")) {
          return await piyo.sendMessage(
            from,
            {
              text: `Format salah bro!\nContoh: *${prefix}menfess 628123456789 Halo, ini pesan rahasia buat lu*`,
            },
            { quoted: msg },
          );
        }

        // Pisahkan nomor tujuan dan isi pesan
        const firstSpace = q.indexOf(" ");
        let targetMenfess = q.substring(0, firstSpace).trim();
        const pesanMenfess = q.substring(firstSpace + 1).trim();

        targetMenfess = targetMenfess.replace(/[^\d]/g, "");
        if (targetMenfess.startsWith("0")) {
          targetMenfess = "62" + targetMenfess.slice(1);
        }
        if (!/^62\d{8,13}$/.test(targetMenfess) || !pesanMenfess) {
          return await piyo.sendMessage(
            from,
            {
              text: "Nomor atau pesan menfess tidak valid. Gunakan format 628xxxxxxxxxx lalu isi pesannya.",
            },
            { quoted: msg },
          );
        }
        const jidTarget = targetMenfess + "@s.whatsapp.net";

        try {
          const recipients = await piyo.onWhatsApp(jidTarget);
          if (!recipients?.some((recipient) => recipient.exists)) {
            return await piyo.sendMessage(
              from,
              { text: "❌ Nomor tujuan tidak terdaftar di WhatsApp." },
              { quoted: msg },
            );
          }

          // Teks yang akan diterima oleh target
          const teksKirim = `💌 *MENFESS MASUK!*\n\nAda pesan rahasia dari seseorang buat lu nih:\n\n💬 _"${pesanMenfess}"_\n\n_Pesan ini dikirim secara anonim melalui sistem ADZBOTZS._`;

          // Bot ngirim pesan ke nomor target
          await piyo.sendMessage(jidTarget, { text: teksKirim });
          registerConversation(from, jidTarget);

          // Bot ngasih laporan sukses ke pengirim asli
          await piyo.sendMessage(
            from,
            {
              text: "✅ Pesan menfess lu udah berhasil dikirim ke target secara rahasia!",
            },
            { quoted: msg },
          );
        } catch (err) {
          console.error("Error Menfess:", err);
          await piyo.sendMessage(
            from,
            {
              text: "❌ Gagal ngirim menfess. Pastikan nomor tujuan bener dan terdaftar di WA.",
            },
            { quoted: msg },
          );
        }
        break;

      // --- FITUR TERMINAL EKSEKUTOR (KHUSUS OWNER) ---
      case "exec":
      case "cmd":
      case "terminal":
        // 1. Validasi Keamanan: Pastikan yang ngirim adalah Owner
        if (!isOwnerMessage(msg)) {
          return await piyo.sendMessage(
            from,
            {
              text: "⌁ Akses ditolak. Terminal hanya untuk owner.",
            },
            { quoted: msg },
          );
        }

        if (!q)
          return await piyo.sendMessage(
            from,
            {
              text: `Command Linux-nya mana bos?\nContoh: *${prefix}exec neofetch* atau *${prefix}exec ls -la*`,
            },
            { quoted: msg },
          );

        // 2. Eksekusi perintah langsung di background sistem Lubuntu
        exec(q, async (err, stdout, stderr) => {
          if (err) {
            // Kalau command error (misal typo atau command nggak ada)
            return await piyo.sendMessage(
              from,
              { text: `❌ *ERROR TERMINAL:*\n\n${stderr || err.message}` },
              { quoted: msg },
            );
          }

          // Kalau command sukses jalan, kirim outputnya ke WA
          if (stdout) {
            await piyo.sendMessage(
              from,
              { text: `💻 *OUTPUT SERVER LUBUNTU:*\n\n${stdout}` },
              { quoted: msg },
            );
          } else {
            await piyo.sendMessage(
              from,
              {
                text: `✅ Command '${q}' berhasil dieksekusi, tapi nggak ada output teks.`,
              },
              { quoted: msg },
            );
          }
        });
        break;

      // --- FITUR OCR (IMAGE TO TEXT) ---
      case "salin":
      case "ocr":
        const isImg =
          type === "imageMessage" ||
          (type === "extendedTextMessage" &&
            msg.message.extendedTextMessage.contextInfo?.quotedMessage
              ?.imageMessage);

        if (!isImg)
          return await piyo.sendMessage(
            from,
            {
              text: `Kirim foto catatan lu dengan caption *${prefix}salin* atau reply fotonya!`,
            },
            { quoted: msg },
          );

        await piyo.sendMessage(
          from,
          { text: "⏳ *Bentar, AI lagi ngebaca tulisan di fotonya...*" },
          { quoted: msg },
        );

        try {
          const targetMedia =
            type === "extendedTextMessage"
              ? msg.message.extendedTextMessage.contextInfo.quotedMessage
              : msg.message;

          // Tarik gambar dari server WA
          const streamMedia = await downloadContentFromMessage(
            targetMedia.imageMessage,
            "image",
          );
          let bufferMedia = Buffer.from([]);
          for await (const chunk of streamMedia) {
            bufferMedia = Buffer.concat([bufferMedia, chunk]);
          }

          // Proses gambar pakai Tesseract (Mendukung bahasa Indonesia & Inggris)
          const {
            data: { text },
          } = await Tesseract.recognize(bufferMedia, "eng+ind");

          if (text.trim().length > 0) {
            await piyo.sendMessage(
              from,
              { text: `📝 *HASIL SCAN TULISAN:*\n\n${text}` },
              { quoted: msg },
            );
          } else {
            await piyo.sendMessage(
              from,
              {
                text: "❌ Nggak ada teks yang kebaca bro, fotonya buram kali.",
              },
              { quoted: msg },
            );
          }
        } catch (err) {
          console.error("Error OCR:", err);
          await piyo.sendMessage(
            from,
            { text: "❌ Mesin scannernya lagi error." },
            { quoted: msg },
          );
        }
        break;
    }
  } catch (err) {
    console.error("Ada error di HandleMsg:", err);
  }
};
