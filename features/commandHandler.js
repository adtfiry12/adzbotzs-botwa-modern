const axios = require("axios");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const googleTTS = require("google-tts-api");
const activeGames = {};
const config = require("../config");
const db = require("../db");
const { generateAnswer } = require("./gemini");
const { extractMessage } = require("./message");
const { enforceAntiLink } = require("./groupModeration");
const os = require("os");
const { exec } = require("child_process");
const Tesseract = require("tesseract.js");
const yts = require("yt-search");

module.exports = async (piyo, msg) => {
  try {
    const from = msg.key.remoteJid;

    // Ekstrak tipe pesan dan teksnya
    if (!msg?.message || !from) return;

    const { type, body } = extractMessage(msg);

    // --- LOGIKA PENGECEKAN GAME ---
    if (activeGames[from]) {
      const game = activeGames[from];
      // Cek apakah pesan user sama dengan jawaban di memori
      if (body.toLowerCase().trim() === game.jawaban.toLowerCase()) {
        await piyo.sendMessage(
          from,
          {
            text: `🎉 *BENAR SEKALI!*\n\nJawaban: *${game.jawaban}*\nSelamat bro, lu emang sepuh! 🥳`,
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
    const sender = msg.key.participant || msg.key.remoteJid;
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
        const menuUtama =
          `🤖 *ADZBOTZS - WA BOT* 🤖\n` +
          `_Proyek Gabut Anak PPLG_\n\n` +
          `👑 *Owner:* ${config.ownerName}\n` +
          `💻 *Engine:* Node.js / Baileys\n` +
          `─────────────────\n\n` +
          `🛠️ *UTILITY & TOOLS*\n` +
          `» *${prefix}sticker / s* (Kirim/Reply Gambar)\n` +
          `» *${prefix}say [teks]* (Bikin Voice Note)\n` +
          `» *${prefix}salin* (Extract Teks dari Foto)\n` +
          `» *${prefix}ai [tanya]* (Smart Chat AI)\n\n` +
          `⬇️ *DOWNLOADER*\n` +
          `» *${prefix}tt [link]* (Tiktok No WM)\n` +
          `» *${prefix}play [judul]* (Download MP3)\n\n` +
          `🎮 *GAMES & SOCIAL*\n` +
          `» *${prefix}kuis* (Mini Game IT)\n` +
          `» *${prefix}rank* (Cek Global Level & XP)\n` +
          `» *${prefix}menfess [nomor] [pesan]*\n` +
          `» *${prefix}jokes* (Candaan Random)\n\n` +
          `🛡️ *GRUP & ADMIN*\n` +
          `» *${prefix}hidetag [teks]* (Pengumuman)\n` +
          `» _Anti-Link Group (Auto Kick & Delete)_\n\n` +
          `⚙️ *SYSTEM (OWNER)*\n` +
          `» *${prefix}status* (Cek RAM & Uptime)\n` +
          `» *${prefix}owner* (Kontak Developer)\n` +
          `» *${prefix}exec [cmd]* (Terminal Linux)\n\n` +
          `_Gunakan bot ini dengan bijak bro!_`;

        await piyo.sendMessage(from, { text: menuUtama }, { quoted: msg });
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
      case "tts":
        if (!q)
          return await piyo.sendMessage(
            from,
            {
              text: `Teksnya mana bro? Contoh: *${prefix}say Bot ini buatan anak back-end*`,
            },
            { quoted: msg },
          );

        try {
          // 1. Generate URL audio dari server Google (Bahasa Indonesia)
          const audioUrl = googleTTS.getAudioUrl(q, {
            lang: "id",
            slow: false,
            host: "https://translate.google.com",
          });

          // 2. Kirim ke WA sebagai Voice Note
          // Parameter ptt: true bikin audionya tampil sebagai rekaman suara asli, bukan file lagu MP3
          await piyo.sendMessage(
            from,
            {
              audio: { url: audioUrl },
              mimetype: "audio/mp4",
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
        // Cek dulu, jangan sampai orang spam game kalau game sebelumnya belum kelar
        if (activeGames[from]) {
          return await piyo.sendMessage(
            from,
            { text: "⚠️ Masih ada soal yang belum dijawab di chat ini bro!" },
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
            `🎮 *KUIS ANAK IT*\n\n` +
            `❓ *Soal:* ${randomSoal.soal}\n` +
            `⏳ *Waktu:* 60 Detik\n\n` +
            `_Langsung ketik jawabannya di chat ini!_`;

          await piyo.sendMessage(from, { text: teksKuis }, { quoted: msg });

          // Simpan state game ke memori dengan timer 60 detik
          activeGames[from] = {
            jawaban: randomSoal.jawaban,
            timeout: setTimeout(async () => {
              // Kalau dalam 60 detik memori masih ada (belum dijawab benar), kirim pesan ini
              if (activeGames[from]) {
                await piyo.sendMessage(from, {
                  text: `⏰ *WAKTU HABIS!*\n\nSayang sekali, jawabannya adalah: *${randomSoal.jawaban}*`,
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

          // Kirim hasil pemikiran AI ke WA
          await piyo.sendMessage(from, { text: response }, { quoted: msg });
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

      // --- FITUR SERVER MONITOR ---
      case "status":
      case "server":
      case "ping":
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
          `💻 *STATUS SERVER ADZBOTZS*\n\n` +
          `*🖥️ OS:* ${os.type()} ${os.release()}\n` +
          `*🧠 RAM Terpakai:* ${usedRAM} MB / ${totalRAM} MB\n` +
          `*⏳ Uptime Bot:* ${jam} Jam, ${menit} Menit, ${detik} Detik\n` +
          `*⚡ Engine:* Node.js ${process.version}`;

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
          { text: "⏳ *Lagi nyari lagunya, bentar bro...*" },
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

          // 3. Eksekusi API Downloader (Contoh pakai API gratisan, karena kita arsitektur API-driven)
          // URL API ini nge-return JSON berisi link download MP3
          const apiUrl = `https://aemt.me/download/ytdl?url=${video.url}`;
          const res = await axios.get(apiUrl);

          if (res.data.status && res.data.result) {
            const audioUrl = res.data.result.mp3; // Ambil link MP3 dari respon JSON

            // 4. Kirim audio sebagai dokumen atau voice note
            await piyo.sendMessage(
              from,
              {
                audio: { url: audioUrl },
                mimetype: "audio/mpeg",
              },
              { quoted: msg },
            );
          } else {
            await piyo.sendMessage(
              from,
              { text: "❌ Server API lagi down, gagal ngunduh audio." },
              { quoted: msg },
            );
          }
        } catch (err) {
          console.error("Error YT Play:", err);
          await piyo.sendMessage(
            from,
            { text: "❌ Terjadi kesalahan saat memproses lagu." },
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

        // Format nomor ke JID WhatsApp (ganti 08 jadi 628 biar Baileys bisa baca)
        if (targetMenfess.startsWith("0")) {
          targetMenfess = "62" + targetMenfess.slice(1);
        }
        const jidTarget = targetMenfess + "@s.whatsapp.net";

        try {
          // Teks yang akan diterima oleh target
          const teksKirim = `💌 *MENFESS MASUK!*\n\nAda pesan rahasia dari seseorang buat lu nih:\n\n💬 _"${pesanMenfess}"_\n\n_Pesan ini dikirim secara anonim melalui sistem ADZBOTZS._`;

          // Bot ngirim pesan ke nomor target
          await piyo.sendMessage(jidTarget, { text: teksKirim });

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
        const isOwner = senderNum === config.ownerNumber;
        if (!isOwner) {
          return await piyo.sendMessage(
            from,
            {
              text: "⚠️ Akses Ditolak! Lu bukan adtfiry, jangan macam-macam sama server gw!",
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
