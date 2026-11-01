# ADZBOTZS

Bot WhatsApp berbasis Node.js, Baileys, MySQL-compatible database, Gemini, dan
FFmpeg. Bisa dijalankan dari terminal atau hosting yang mendukung proses Node.js
yang berjalan terus.

## Fitur

- Menu, owner, ping, status, AFK, jokes, dan level/XP.
- Stiker, konversi stiker, TTS, OCR, dan konversi media.
- Gemini text dan vision.
- Pencarian audio YouTube serta downloader TikTok.
- Menfess dengan balasan, kuis, anti-link, welcome, hidetag, tag admin, dan delete.

## Kebutuhan

- Node.js 20 atau lebih baru.
- FFmpeg untuk stiker, TTS, dan konversi media.
- Database yang kompatibel dengan MySQL.
- API key Gemini jika fitur AI dipakai.

## Menjalankan

```bash
git clone https://github.com/adtfiry12/adzbotzs-reborn.git
cd adzbotzs-reborn
npm install
cp .env.example .env
npm start
```

Jika `BOT_NUMBER` kosong, QR tampil di terminal. Jika diisi dengan nomor
internasional tanpa tanda `+`, kode pairing tampil di log.

## Hosting dengan Docker

Repository ini memakai `Dockerfile` sebagai satu-satunya jalur build. Saat image
dibuat, Docker otomatis memasang FFmpeg, yt-dlp, sertifikat HTTPS, dan semua
package Node dari `package-lock.json`.

1. Hubungkan repository ke layanan hosting yang mendukung Dockerfile.
2. Set environment variable dari dashboard hosting. Jangan commit `.env`.
3. Isi `BOT_NUMBER` agar kode pairing bisa diambil dari log deployment.
4. Gunakan database eksternal yang bisa diakses dari internet. `DB_HOST=mysql`
   hanya berlaku jika aplikasi dan MySQL berada di network Docker yang sama.
5. Simpan folder `session-baileys` pada persistent storage jika platform
   menghapus filesystem saat restart.
6. Arahkan health check ke `/health`. Port memakai `PORT` dari hosting.

Build dan jalankan sendiri:

```bash
docker build -t adzbotzs .
docker run --env-file .env -p 8080:8080 \
  -v adzbotzs-session:/app/session-baileys adzbotzs
```

Pada Back4app, cukup hubungkan repository dan pastikan build mode membaca
`Dockerfile` di root. Tidak perlu menjalankan `npm install` manual karena proses
build sudah menjalankan `npm ci`.

Contoh variabel database lokal:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=adzbotzs
DB_SSL=false
```

Untuk database cloud, ganti host, port, user, password, dan nama database sesuai
provider. Gunakan `DB_SSL=true` jika provider mewajibkan TLS. Variabel
`DB_USERNAME` dan `DB_DATABASE` juga masih diterima untuk kompatibilitas konfigurasi
lama.

## Environment variable

| Variabel | Keterangan |
| --- | --- |
| `BOT_NAME` | Nama bot. |
| `OWNER_NAME` | Nama owner. |
| `OWNER_NUMBER` | Nomor owner dengan kode negara. |
| `BOT_NUMBER` | Nomor untuk pairing; kosongkan untuk QR. |
| `PORT` | Port web server. |
| `GEMINI_API_KEY` | API key Gemini. |
| `GEMINI_MODEL` | Model Gemini, default `gemini-2.5-flash`. |
| `DB_HOST` | Host database. |
| `DB_PORT` | Port database. |
| `DB_USER` | User database. |
| `DB_PASSWORD` | Password database. |
| `DB_NAME` | Nama database. |
| `DB_SSL` | `true` atau `false`. |
| `MENU_LOGO_PATH` | Path gambar menu opsional. |

Tabel `users`, `group_settings`, dan `soal_kuis` dibuat otomatis saat koneksi
database berhasil.

## Command

Prefix umum yang didukung: `.`, `!`, dan `#`.

| Kelompok | Command |
| --- | --- |
| Umum | `menu`, `owner`, `ping`, `jokes`, `afk` |
| Media | `sticker`, `toimg`, `tomp3`, `say`, `salin` |
| AI | `ai`, `vision` |
| Download | `tt`, `play` |
| Sosial | `kuis`, `rank`, `menfess`, `balas` |
| Grup | `groupinfo`, `tagadmin`, `hidetag`, `delete`, `antilink`, `welcome` |
| Owner | `status`, `exec` |

Gunakan `.menu` untuk melihat alias dan format lengkap command.

## Troubleshooting

- `getaddrinfo EAI_AGAIN mysql`: host `mysql` tidak bisa ditemukan. Gunakan
  host database sebenarnya, atau jalankan aplikasi dan MySQL pada network Docker
  yang sama.
- Pairing tidak muncul: pastikan `BOT_NUMBER` hanya berisi angka dan lihat log
  proses utama.
- Login hilang setelah restart: gunakan persistent storage untuk
  `session-baileys`.
- Fitur audio gagal: rebuild image agar instalasi FFmpeg dan yt-dlp dijalankan
  kembali.

## Lisensi

Project ini menggunakan [AGPL-3.0-only](./LICENSE).
