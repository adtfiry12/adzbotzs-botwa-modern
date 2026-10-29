# 🤖 ADZBOTZS - WhatsApp Multi-Device Bot

ADZBOTZS adalah bot WhatsApp cerdas yang dibangun menggunakan arsitektur _API-driven_, _Clean Code_, dan terintegrasi penuh dengan sistem _database_ relasional. Berjalan di atas Node.js dan Baileys (`@whiskeysockets/baileys`), bot ini dirancang agar ringan (minim penggunaan _storage_ lokal) karena mendelegasikan proses berat ke _external API_ dan _database_ MySQL.

Proyek ini dikembangkan sebagai portofolio _Back-End Engineering_.

## ✨ Fitur Utama Bot

### 🛠️ Utility & Tools

- `!sticker` - Konversi gambar menjadi stiker WebP secara instan (Powered by FFmpeg).
- `!say [teks]` - Text-to-Speech (Voice Note) otomatis menggunakan Google TTS.
- `!salin` - Ekstrak teks dari foto/gambar papan tulis/catatan (Optical Character Recognition via Tesseract.js).
- `!ai [pertanyaan]` - Asisten pintar _Smart Chat AI_ bertenaga Google Gemini.

### ⬇️ Downloader (API-Driven)

- `!tiktok [link]` - Unduh video TikTok tanpa _watermark_ via Buffer Stream.
- `!play [judul]` - Pencarian otomatis dan unduhan audio MP3 dari YouTube (Bebas dari limitasi _library_ lokal).

### 🎮 Games & Interaksi (MySQL Database)

- `!kuis` - Mini-game tebak-tebakan IT secara _real-time_ (Soal ditarik dinamis dari tabel MySQL).
- `!rank` - Sistem Profil, Leveling, dan XP dinamis berbasis aktivitas _chatting_ grup.
- `!menfess [nomor] [pesan]` - Sistem _routing_ perpesanan anonim yang aman dan rahasia.

### 🛡️ Group Moderation & System

- **Auto Anti-Link (Middleware)** - Sistem satpam grup yang otomatis menghapus pesan dan me- _kick_ member yang mempromosikan tautan grup eksternal.
- `!hidetag [teks]` - Pengumuman grup / _invisible tag-all_ untuk seluruh member.
- `!status` - Pemantauan _real-time_ sisa RAM dan _Uptime_ server (_Hardware Monitoring_).
- `!exec [cmd]` - Eksekutor terminal jarak jauh (Akses eksklusif _Owner_).

---

## 🚀 Prasyarat Sistem & Link Download (Tutorial Windows)

Untuk menjalankan bot ini di sistem operasi **Windows**, Anda membutuhkan tiga _software_ utama di bawah ini:

1.  **Node.js (Mesin Utama)**
    - 🔗 **Download:** [Node.js LTS (Windows Installer)](https://nodejs.org/en/download/)
    - _Cara Install:_ Tinggal klik _Next_ sampai selesai. Pastikan _opsi_ "Add to PATH" tercentang.
2.  **XAMPP (Untuk Database MySQL)**
    - 🔗 **Download:** [XAMPP for Windows](https://www.apachefriends.org/download.html)
    - _Cara Install:_ Install seperti biasa. Buka _XAMPP Control Panel_, lalu klik **Start** pada modul **MySQL**.
3.  **FFmpeg (Mesin Pembuat Stiker)**
    - 🔗 **Download:** [FFmpeg Windows Builds](https://github.com/BtbN/FFmpeg-Builds/releases) (Pilih yang `ffmpeg-master-latest-win64-gpl.zip`)
    - _Cara Install:_ Ekstrak file ZIP, pindahkan folder ke `C:\ffmpeg`. Buka **Environment Variables** di Windows, cari _Path_, lalu tambahkan _directory_ baru: `C:\ffmpeg\bin`.

---

## 🛠️ Instalasi & Konfigurasi Aman

Sistem ini menggunakan environment variable agar _API Key_ dan akses database tidak disimpan di source code. Jika API key yang lama pernah dibagikan atau masuk Git, segera revoke dan buat key baru di Google AI Studio.

**1. Clone Repositori & Install Dependencies**
Buka Terminal/CMD/PowerShell, lalu jalankan:

```bash
git clone [https://github.com/USERNAME_GITHUB_LU/adzbotzs-reborn.git](https://github.com/USERNAME_GITHUB_LU/adzbotzs-reborn.git)
cd adzbotzs-reborn
npm install
2. Setup Environment
`config.js` dan `db.js` membaca environment variable. Set variable berikut sebelum `npm start`:

```bash
export OWNER_NAME="adtfiry"
export OWNER_NUMBER="628xxxxxxxxxx"
export GEMINI_API_KEY="isi-key-baru"
export GEMINI_MODEL="gemini-2.5-flash"
export DB_HOST="localhost"
export DB_USER="adtz"
export DB_PASSWORD="password-mysql"
export DB_NAME="adzbotzs"
npm start
```

`GEMINI_MODEL` dapat diganti jika Google menonaktifkan model tertentu. Bot mencoba model berikutnya jika model utama mengembalikan 404.

3. Setup Database MySQL (via XAMPP)

Pastikan MySQL di XAMPP sudah berjalan (Start).

Buka browser dan masuk ke http://localhost/phpmyadmin.

Buat database baru dengan nama adzbotzs.

Jalankan query SQL untuk membuat tabel (Tabel users untuk Leveling, dan soal_kuis untuk fitur tebak-tebakan).

Sesuaikan `DB_USER`, `DB_PASSWORD`, dan `DB_NAME` dengan database Anda.

4. Jalankan Bot
Setelah semua siap, jalankan perintah ini di terminal:

npm start
Saat terminal memunculkan QR Code, segera scan menggunakan aplikasi WhatsApp Anda melalui menu Perangkat Tertaut (Linked Devices).

## ☁️ Deployment 24/7

Bot hanya hidup selama proses Node.js dan database berjalan. Jadi laptop boleh dimatikan setelah bot dipindahkan ke VPS atau platform cloud. Tidak ada jaminan hosting gratis yang benar-benar tanpa batas atau selamanya; layanan gratis dapat tidur, membatasi CPU/RAM, menghapus filesystem, atau berubah kebijakannya. Untuk Baileys, gunakan VPS/worker yang persistent dan simpan folder `session-baileys` pada disk persisten agar tidak perlu scan QR setiap restart.

Pilihan praktis:

- VPS murah dengan systemd atau PM2 (paling stabil untuk bot WhatsApp).
- Railway, Render, atau Fly.io untuk eksperimen; cek batas free tier dan gunakan volume persisten.
- Hindari platform serverless yang mematikan proses lama atau tidak menyediakan filesystem persisten.

Jangan commit folder `session-baileys`, API key, atau password database ke repository publik.

👨‍💻 Profil Pengembang
Aditya Mukti Firmansyah (adtfiry)

Siswa Kelas 12, Jurusan Pengembangan Perangkat Lunak dan Gim (PPLG)

SMK Wikrama 1 Jepara, Jawa Tengah

Fokus Portofolio: Back-End Software Engineering & Database Management

Terima kasih telah menggunakan ADZBOTZS. Dibuat dengan 💻 dari Jepara untuk ekosistem Open Source.


<FollowUp> Lu tinggal *copy* teks di atas ke file `README.md` di VS Code lu, lalu *Save*. Sek
```
