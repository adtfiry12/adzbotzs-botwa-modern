# ADZBOTZS

Bot WhatsApp multi-device berbasis Node.js dan Baileys. Bot ini memakai
MySQL untuk leveling dan kuis, Google Gemini untuk AI, serta beberapa layanan
eksternal untuk TTS dan downloader.

## Fitur dan Command

Prefix dapat berupa simbol yang didukung bot, misalnya `.`, `!`, atau `#`.
Gunakan `.<command>` di bawah ini jika memakai titik.

| Command | Alias | Fungsi |
| --- | --- | --- |
| `menu` | `help` | Menampilkan daftar command |
| `owner` | `creator` | Mengirim kontak owner |
| `jokes` | - | Mengambil jokes acak |
| `sticker` | `s`, `stiker` | Mengubah gambar menjadi stiker WebP; bisa memakai gambar dengan caption atau reply gambar |
| `say <teks>` | - | Mengubah teks menjadi voice note Bahasa Indonesia |
| `ai <pertanyaan>` | `ask`, `gemini` | Menjawab pertanyaan menggunakan Gemini |
| `salin` | `ocr` | Membaca teks dari gambar menggunakan OCR; bisa memakai gambar dengan caption atau reply gambar |
| `tt <link>` | `tiktok` | Mengunduh video TikTok tanpa watermark melalui API eksternal |
| `play <judul>` | `lagu` | Mencari YouTube lalu mengunduh dan mengirim audio MP3 dengan `yt-dlp` dan FFmpeg |
| `kuis` | `tebak` | Memulai kuis dari tabel `soal_kuis` selama 60 detik |
| `rank` | `profile`, `level` | Melihat XP dan level pengguna |
| `menfess <nomor> <pesan>` | `confess` | Mengirim pesan anonim ke nomor tujuan |
| `hidetag <teks>` | `pengumuman`, `tagall` | Mention seluruh anggota grup |
| `status` | `server`, `ping` | Melihat RAM, uptime, OS, dan versi Node.js |
| `exec <command>` | `cmd`, `terminal` | Menjalankan command server; hanya owner |

Selain command, tersedia middleware anti-link grup. Pesan berisi link grup
WhatsApp dari anggota non-admin akan dihapus dan pengirim dikeluarkan jika
bot memiliki hak admin.

## Struktur Project

```text
.
├── index.js                    # Startup Baileys dan event message
├── HandleMsg.js                # Adapter tipis ke command handler
├── features/
│   ├── commandHandler.js       # Dispatch command dan fitur bot
│   ├── gemini.js               # Integrasi Google Gen AI
│   ├── groupModeration.js      # Middleware anti-link
│   └── message.js              # Ekstraksi tipe dan teks pesan
├── config.js                   # Membaca konfigurasi dari .env
├── db.js                       # Membuat pool MySQL dari .env
└── session-baileys/            # Session login lokal, jangan di-commit
```

## Persyaratan

- Node.js 20 atau lebih baru
- MySQL atau MariaDB
- FFmpeg yang tersedia di `PATH`
- `yt-dlp` yang tersedia di `PATH`
- API key Google AI Studio untuk command AI
- WhatsApp untuk melakukan scan QR pertama kali

Untuk Ubuntu/Debian, contoh instalasi FFmpeg dan MySQL:

```bash
sudo apt update
sudo apt install ffmpeg mysql-server
sudo apt install yt-dlp
```

## Instalasi

```bash
git clone https://github.com/adtfiry12/adzbotzs-reborn.git
cd adzbotzs-reborn
npm install
```

Buat database dan tabel yang digunakan bot:

```sql
CREATE DATABASE adzbotzs;
USE adzbotzs;

CREATE TABLE users (
  nomor_wa VARCHAR(32) PRIMARY KEY,
  xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1
);

CREATE TABLE soal_kuis (
  id INT AUTO_INCREMENT PRIMARY KEY,
  soal TEXT NOT NULL,
  jawaban VARCHAR(255) NOT NULL
);
```

## Konfigurasi `.env`

Semua konfigurasi runtime berada di file `.env` pada root project. File ini
diabaikan Git dan tidak boleh dibagikan atau di-commit.

```env
OWNER_NAME=adtfiry
OWNER_NUMBER=628xxxxxxxxxx
BOT_NAME=ADZBOTZS

GEMINI_API_KEY=tempel_token_baru_di_sini
GEMINI_MODEL=gemini-flash-latest

DB_HOST=localhost
DB_USER=adtz
DB_PASSWORD=password_mysql
DB_NAME=adzbotzs
```

Bot menggunakan package resmi `@google/genai` dan alias
`gemini-flash-latest`, sehingga tidak bergantung pada nama model Flash lama
yang dapat dipensiunkan. Jangan menaruh API key langsung di `config.js`.

## Menjalankan Bot

```bash
npm start
```

Scan QR yang muncul di terminal melalui WhatsApp → Perangkat Tertaut.
Setelah session tersimpan, bot dapat melakukan reconnect tanpa scan ulang.

## Catatan Operasional

- `.say` mengunduh audio TTS sebagai buffer MP3 sebelum dikirim agar voice note
  tidak kosong.
- Request Gemini memiliki timeout 45 detik.
- Respons Gemini panjang dikirim dalam beberapa pesan agar sesuai batas teks
  WhatsApp.
- Folder `session-baileys` harus disimpan di persistent disk saat deployment.
- MySQL harus dapat diakses dari mesin yang menjalankan bot.
- Downloader TikTok bergantung pada API eksternal. Downloader YouTube memakai
  `yt-dlp` lokal; YouTube dapat membatasi format tertentu atau mengembalikan
  403, sehingga versi `yt-dlp` harus tetap diperbarui.

## Deployment 24/7

Bot tidak akan tetap hidup jika laptop dimatikan. Jalankan di VPS atau worker
cloud yang prosesnya persistent. VPS dengan systemd atau PM2 biasanya paling
stabil. Platform free tier dapat sleep, membatasi resource, menghapus
filesystem, atau mengubah kebijakan, jadi tidak ada jaminan gratis selamanya.

Saat deployment:

1. Masukkan seluruh variable `.env` ke environment/secret manager server.
2. Simpan `session-baileys` pada volume persistent.
3. Pastikan MySQL tersedia dari server.
4. Jalankan bot memakai PM2 atau systemd agar otomatis restart.

Contoh PM2:

```bash
npm install --global pm2
pm2 start index.js --name adzbotzs
pm2 save
pm2 startup
```

Jangan commit `.env`, API key, password database, atau folder
`session-baileys` ke repository publik.

## Pengembang

Aditya Mukti Firmansyah (`adtfiry`)

SMK Wikrama 1 Jepara — Pengembangan Perangkat Lunak dan Gim (PPLG)
