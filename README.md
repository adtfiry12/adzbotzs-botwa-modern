# 🤖 ADZBOTZS - WhatsApp Multi-Device Bot

ADZBOTZS adalah bot WhatsApp cerdas yang dibangun menggunakan arsitektur _API-driven_ dan _Clean Code_. Berjalan di atas Node.js dan Baileys (`@whiskeysockets/baileys`), bot ini dirancang untuk memiliki performa tinggi, minim penggunaan _storage_, dan terintegrasi langsung dengan database MySQL.

Proyek ini dikembangkan sebagai portofolio _Back-End Engineering_.

## ✨ Fitur Utama

- **🛠️ Utility & Tools**
  - `!sticker` - Konversi gambar menjadi stiker WebP (Powered by FFmpeg).
  - `!say` - Text-to-Speech (Voice Note) otomatis (Google TTS API).
  - `!salin` - Ekstrak teks dari gambar/catatan (Tesseract.js OCR).
  - `!ai` - Smart Chat AI terintegrasi dengan model Google Gemini 1.5 Flash.
- **⬇️ Downloader (API-Driven)**
  - `!tiktok` - Unduh video TikTok tanpa _watermark_.
  - `!play` - Pencarian dan unduhan audio MP3 dari YouTube.
- **🎮 Games & Interaksi (MySQL Database)**
  - `!kuis` - Mini-game tebak-tebakan dinamis dari database MySQL.
  - `!rank` - Sistem leveling dan XP _real-time_ berbasis aktivitas grup.
  - `!menfess` - Sistem _routing_ pesan anonim rahasia.
- **🛡️ Group Moderation & System**
  - **Auto Anti-Link** - _Middleware_ otomatis penghapus pesan & _kick_ pengirim _link_ grup eksternal.
  - `!hidetag` - Pengumuman grup (_invisible tag-all_).
  - `!status` - Monitoring _uptime_ dan RAM server secara _real-time_.
  - `!exec` - Eksekutor terminal Linux jarak jauh (Akses khusus Owner).

## 🚀 Prasyarat Sistem

Sebelum menginstal bot ini, pastikan sistem Anda sudah terpasang:

- [Node.js](https://nodejs.org/) (Minimal v18 atau terbaru)
- [FFmpeg](https://ffmpeg.org/) (Untuk _rendering_ fitur stiker)
- [MySQL / MariaDB](https://www.mysql.com/) (Untuk fitur Kuis dan Leveling)

## 🛠️ Instalasi & Konfigurasi

1. **Clone repositori ini**
   ```bash
   git clone [https://github.com/USERNAME_GITHUB_LU/adzbotzs-reborn.git](https://github.com/USERNAME_GITHUB_LU/adzbotzs-reborn.git)
   cd adzbotzs-reborn
   Install semua dependensi (Library)
   ```

Bash
npm install
Konfigurasi Database MySQL

Buat database baru bernama adzbotzs.

Import atau jalankan query tabel users (untuk leveling) dan soal_kuis (untuk game) ke dalam database tersebut.

Pastikan username dan password MySQL di dalam file db.js sudah sesuai dengan server lokal Anda.

Konfigurasi Bot (config.js)
Buat atau edit file config.js dan sesuaikan dengan data Anda:

JavaScript
module.exports = {
ownerName: 'adtfiry',
ownerNumber: '6285191194059',
botName: 'ADZBOTZS',
geminiApiKey: 'MASUKKAN_API_KEY_GOOGLE_ANDA_DISINI'
}
Jalankan Bot

Bash
npm start
Scan QR Code
Pada saat pertama kali dijalankan, bot akan memunculkan QR Code di terminal. Scan QR Code tersebut menggunakan perangkat WhatsApp Anda yang tertaut (Linked Devices).

👨‍💻 Pengembang
Aditya Mukti Firmansyah (adtfiry)

Siswa Kelas 12 PPLG, SMK Wikrama 1 Jepara

Fokus: Back-End Software Engineering

Dibuat dengan ❤️ di atas sistem operasi Lubuntu Linux.

<FollowUp> Lu tinggal ganti URL repositori di langkah nomor 1 dengan _link_ GitHub lu nanti. Gimana, tampilan _README_-nya udah cukup _killer_ buat dipajang di GitHub lu sekarang? </FollowUp>
