# ADZBOTZS // CYBER UTILITY NODE

<p align="center">
  <img src="./assets/menu-logo.png" alt="ADZBOTZS cyberpunk logo" width="720">
</p>

<p align="center">
  <strong>Next-Generation Cyberpunk-Styled WhatsApp Automation Node with Dual-Mode Architecture.</strong><br>
  <code>NODE.JS</code> · <code>BAILEYS MULTI-DEVICE</code> · <code>MYSQL / TIDB CLOUD</code> · <code>GEMINI AI</code> · <code>FFMPEG</code>
</p>

---

## ⚡ Ikhtisar Proyek

**AdzBotZs** adalah bot WhatsApp otomatisasi berbasis Node.js dan Baileys Multi-Device yang dirancang dengan antarmuka bergaya **Cyberpunk Terminal**. Bot ini dilengkapi sistem **Dual-Mode**, sehingga dapat dijalankan langsung di terminal lokal (Lubuntu/Linux) maupun dideploy secara 24/7 di layanan cloud hosting seperti **Back4app** dengan pancingan server keep-alive Express serta database cloud **TiDB Cloud**.

### 🌟 Fitur Utama
- **Dual-Mode Connection**: Mode Terminal Lokal (Scan QR Code via `qrcode-terminal` atau Pairing Code) & Mode Cloud Deploy (Pairing Code otomatis via logs Back4app + Web Server Keep-Alive).
- **Tools & Intelligence**: Integrasi Google Gemini AI (`.ai`, `.vision`), Google TTS Voice Note dengan konversi FFmpeg Opus OGG (`.say`), OCR Tesseract multi-bahasa (`.salin`), Stiker Maker (`.s` / `.sticker`), Stiker ke Gambar (`.toimg`), dan Konverter Media ke MP3 (`.tomp3`).
- **Media & Downloader**: TikTok Downloader tanpa watermark (`.tt`) dan YouTube Music Downloader (`.play`) menggunakan multi-provider API failover serta kompresi otomatis.
- **Social & Gamification**: Sistem Leveling & XP otomatis setiap pesan, Mini Kuis IT dinamis berbasis database (`.kuis`), Menfess anonim dengan sesi balasan 24 jam (`.menfess`, `.balas`), dan AFK status otomatis (`.afk`).
- **Group Moderation**: Proteksi Anti-Link otomatis (delete & kick), Sambutan Member Baru (`.welcome`), Tag Admin (`.tagadmin`), Pengumuman (`.hidetag`), dan Hapus Pesan (`.delete`).
- **Owner Console**: Monitoring server real-time (`.status`), eksekutor terminal Linux (`.exec`), dan kontak vCard developer (`.owner`).

---

## 📜 Lisensi & Creator Notice

Project ini dirilis dengan lisensi [GNU AGPL-3.0-only](./LICENSE). Anda bebas menggunakan, memodifikasi, dan mendistribusikan ulang kode ini selama mencantumkan lisensi AGPL, copyright notice asli, dan disclaimer yang berlaku.

### Creator & Brand Notice
- **Pencipta / Pengembang:** Aditya Mukti Firmansyah (`adtfiry`)
- **Institusi:** SMK Wikrama 1 Jepara — Pengembangan Perangkat Lunak dan Gim (PPLG)
- Nama **ADZBOTZS**, logo, dan identitas visual cyberpunk adalah identitas brand pencipta. Modifikasi disarankan tetap menyertakan atribusi kepada pembuat asli.

```text
╔════════════════════════════════════════════════════════════════╗
║  ◈ ADZBOTZS // CYBERPUNK CONTROL NODE                          ║
║  ◇ MEDIA  ◇ AI  ◇ SOCIAL & GAME  ◇ GROUP OPS  ◇ OWNER CONSOLE  ║
╚════════════════════════════════════════════════════════════════╝
```

---

## 🕹️ Command Matrix

Prefix yang didukung bot mencakup simbol umum seperti `.`, `!`, atau `#` (contoh: `.menu`).

| Command | Alias | Kategori | Fungsi |
| :--- | :--- | :--- | :--- |
| `menu` | `help` | General | Menampilkan antarmuka dashboard bot & daftar command lengkap |
| `owner` | `creator` | General | Mengirim vCard kontak resmi developer / operator bot |
| `ping` | - | General | Mengukur latensi respon bot ke server WhatsApp (ms) |
| `sticker` | `s`, `stiker` | Tools | Mengonversi gambar/foto menjadi stiker WebP (caption / reply) |
| `toimg` | `toimage` | Tools | Mengonversi stiker WebP kembali menjadi gambar PNG |
| `tomp3` | `toaudio` | Tools | Mengonversi video atau rekaman audio menjadi audio format MP3 |
| `say <teks>` | - | Tools | Mengubah teks menjadi Voice Note (VN) Bahasa Indonesia (PTT Opus OGG) |
| `salin` | `ocr` | Tools | Membaca dan menyalin teks dari foto/gambar secara instan (OCR) |
| `ai <pertanyaan>` | `ask`, `gemini` | Intelligence | Asisten cerdas berbasis Google Gemini AI |
| `vision [tanya]` | `describe`, `lihat` | Intelligence | Analisis visual gambar menggunakan multimodal Gemini Vision |
| `tt <link>` | `tiktok` | Downloader | Mengunduh video TikTok kualitas HD tanpa watermark |
| `play <judul/link>`| `lagu` | Downloader | Mencari lagu di YouTube lalu mengunduh & mengirim audio MP3 |
| `kuis` | `tebak`, `kuislagi` | Social / Game | Kuis trivia IT & coding berbasis bank soal MySQL (durasi 60 detik) |
| `rank` | `profile`, `level` | Social / Game | Menampilkan kartu profil, jumlah XP, dan Level pengguna |
| `afk [alasan]` | - | Social / Game | Mengaktifkan mode away; nonaktif otomatis saat mengirim chat baru |
| `menfess <no> <pesan>` | `confess` | Social / Game | Mengirim surat rahasia anonim ke nomor tujuan via bot |
| `balas <pesan>` | `replymenfess` | Social / Game | Membalas pesan menfess dari sesi rahasia terakhir |
| `jokes` | - | Social / Game | Menampilkan lelucon/jokes santai acak dari REST API |
| `groupinfo` | `gcinfo` | Group Ops | Menampilkan statistik member, admin, dan rincian grup |
| `tagadmin [pesan]` | `tagadmins` | Group Ops | Melakukan mention/ping serentak ke seluruh admin grup |
| `hidetag <teks>` | `pengumuman` | Group Ops | Mention seluruh anggota grup untuk pengumuman penting |
| `delete` | `del` | Group Ops | Menghapus pesan anggota (khusus admin grup / owner bot) |
| `antilink on/off` | - | Group Ops | Mengaktifkan sistem auto-kick & auto-delete untuk link WhatsApp grup lain |
| `welcome on/off` | - | Group Ops | Mengaktifkan sambutan otomatis saat ada anggota baru bergabung |
| `status` | `server` | Owner Console | Monitoring OS, RAM usage, Uptime, dan Node.js (khusus Owner) |
| `exec <command>` | `cmd`, `terminal` | Owner Console | Terminal shell Linux eksekutor langsung dari chat (khusus Owner) |

---

## 🏗️ Struktur Arsitektur

```text
adzbotzs-reborn/
├── assets/
│   └── menu-logo.png           # Banner visual menu cyberpunk
├── features/
│   ├── commandHandler.js       # Core dispatcher command, middleware leveling, & logika bot
│   ├── gemini.js               # Klien Google Gen AI (text & vision fallback)
│   ├── groupModeration.js      # Middleware filter link grup WhatsApp (Anti-Link)
│   ├── groupSettings.js        # Konfigurasi grup (antilink & welcome) via MySQL
│   ├── menfess.js              # State manager sesi pesan anonim (TTL 24 jam)
│   ├── message.js              # Ekstraktor teks, caption, dan unwrap pesan view-once/ephemeral
│   ├── tts.js                  # Engine TTS (Google TTS + FFmpeg Opus OGG + fallback MP3)
│   └── youtube.js              # Engine YT Play (multi-provider failover API + kompresi audio)
├── config.js                   # Loader konfigurasi variabel runtime
├── db.js                       # Pool koneksi MySQL/TiDB Cloud & auto-create tables
├── HandleMsg.js                # Router perantara pesan Baileys
├── index.js                    # Core Baileys socket, Dual-Mode Auth, & Express Server
├── .env.example                # Panduan template variabel lingkungan
├── package.json                # Manifest dependensi & script project
└── README.md                   # Dokumentasi resmi AdzBotZs
```

---

## ⚙️ Panduan Dual-Mode: Menjalankan Bot

AdzBotZs mendukung dua skenario penggunaan:

### 1. Mode Terminal Lokal (Linux / Lubuntu / macOS / Windows)
Mode ini sangat cocok untuk pengembangan lokal atau pengujian fitur.
1. Pastikan **Node.js (v20+)** dan **FFmpeg** sudah terpasang di sistem:
   ```bash
   sudo apt update
   sudo apt install -y ffmpeg nodejs npm
   ```
2. Clone repository & install dependensi:
   ```bash
   git clone https://github.com/adtfiry12/adzbotzs-reborn.git
   cd adzbotzs-reborn
   npm install
   ```
3. Konfigurasikan `.env`:
   ```bash
   cp .env.example .env
   nano .env
   ```
   *Pada mode lokal, biarkan `BOT_NUMBER=` kosong.*
4. Jalankan bot:
   ```bash
   npm start
   ```
5. Bot akan mencetak **QR Code** langsung di terminal. Buka **WhatsApp → Perangkat Tertaut → Tautkan Perangkat**, lalu arahkan kamera ke layar terminal.
*(Catatan: Jika ingin menggunakan kode pairing di terminal lokal tanpa scan QR, cukup isi `BOT_NUMBER=628xxxxxx` di file `.env`).*

---

### 2. Mode Deploy Cloud 24/7 (Back4app Containers & TiDB Cloud)
Mode ini digunakan untuk deployment server tanpa perlu menyalakan laptop secara terus-menerus.
1. **Database Cloud (TiDB Cloud):**
   - Buat cluster Serverless gratis di [TiDB Cloud](https://tidbcloud.com/).
   - Dapatkan Host, Port (4000), Username, Password, dan Nama Database.
2. **Deploy di Back4app:**
   - Masuk ke dashboard [Back4app Containers](https://www.back4app.com/).
   - Buat New App dan sambungkan ke repository GitHub ini.
   - Atur **Environment Variables** di Back4app:
     - `BOT_NUMBER`: Nomor WhatsApp yang akan dijadikan bot (contoh: `6281234567890`).
     - `PORT`: `8080` (Back4app otomatis memetakan port ini).
     - `GEMINI_API_KEY`: API Key dari Google AI Studio.
     - `DB_HOST`: Host cluster TiDB Cloud.
     - `DB_PORT`: `4000`.
     - `DB_USER`: Username TiDB Cloud.
     - `DB_PASSWORD`: Password TiDB Cloud.
     - `DB_NAME`: Nama database.
     - `DB_SSL`: `true`.
   - Simpan directory `session-baileys` pada Persistent Storage Back4app agar login tidak hilang saat container restart.
3. **Mendapatkan Kode Pairing:**
   - Lihat tab **Logs** di Back4app saat container pertama kali start.
   - Bot akan memunculkan banner kode pairing 8 digit (contoh: `ABCD-1234`).
   - Buka WhatsApp di HP Anda → **Perangkat Tertaut → Tautkan dengan Nomor Telepon**, lalu masukkan 8 digit kode tersebut.
   - Bot akan tersambung, dan server Express keep-alive akan menjaga aplikasi tetap online 24 jam.

---

## 🔧 Variabel Lingkungan (`.env`)

| Variabel | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `BOT_NAME` | String | Nama bot yang tampil di banner terminal & menu (Default: `ADZBOTZS`) |
| `OWNER_NAME` | String | Nama pemilik / operator bot (Default: `adtfiry`) |
| `OWNER_NUMBER`| Number | Nomor WhatsApp owner dengan kode negara (contoh: `628xxxxxxxxxx`) |
| `BOT_NUMBER` | Number | Nomor WhatsApp bot untuk meminta Kode Pairing (kosongkan jika ingin scan QR) |
| `PORT` | Number | Port web server Express untuk health check cloud (Default: `8080`) |
| `GEMINI_API_KEY` | String | API Key resmi Google Gemini AI Studio (wajib untuk `.ai` dan `.vision`) |
| `GEMINI_MODEL` | String | Model Gemini yang digunakan (Default: `gemini-flash-latest`) |
| `DB_HOST` | String | Host MySQL server lokal (`localhost`) atau TiDB Cloud host |
| `DB_PORT` | Number | Port MySQL (Default: `3306` untuk lokal, `4000` untuk TiDB Cloud) |
| `DB_USER` | String | Username pengguna database |
| `DB_PASSWORD` | String | Password pengguna database |
| `DB_NAME` | String | Nama database (Default: `adzbotzs`) |
| `DB_SSL` | Boolean| Wajib diset `true` untuk koneksi TiDB Cloud, `false` untuk MySQL lokal |
| `MENU_LOGO_PATH`| Path | Path gambar banner untuk menu WhatsApp (Default: `assets/menu-logo.png`) |

---

## 🛠️ Catatan Pemeliharaan & Troubleshooting

1. **Fitur Suara (`.say` TTS):**
   - Menggunakan `google-tts-api` dengan sistem pemotongan kalimat otomatis (chunking) sehingga tidak error meski teks lebih dari 200 karakter.
   - Mengonversi audio secara native ke format voice note WhatsApp PTT (`audio/ogg; codecs=opus`) jika FFmpeg terdeteksi. Jika sistem deploy tidak memiliki FFmpeg, engine otomatis menggunakan fallback MP3 buffer tanpa menyebabkan bot crash.
2. **Fitur Musik (`.play` YouTube):**
   - Library lama seperti `ytdl-core` telah usang akibat pembaruan keamanan YouTube (PO Token & 410 error pada IP hosting).
   - AdzBotZs menggunakan mekanisme failover multi-provider API eksternal yang dipadukan dengan `yt-search` dan fallback `yt-dlp` lokal. Audio yang berukuran di atas 16MB akan dikompres secara otomatis agar dapat dikirim dengan lancar melalui WhatsApp.
3. **Database Otomatis:**
   - Tabel `users`, `group_settings`, dan `soal_kuis` dibuat secara otomatis (`CREATE TABLE IF NOT EXISTS`) saat bot start. Bank soal kuis juga otomatis diisi jika masih kosong.

---

<p align="center">
  Dibuat dengan dedikasi oleh <strong>Aditya Mukti Firmansyah (adtfiry)</strong><br>
  <em>SMK Wikrama 1 Jepara — PPLG Developer</em>
</p>
