# ==============================================================================
# ADZBOTZS // DOCKER CONTAINER IMAGE (BACK4APP & CLOUD DEPLOYMENT)
# ==============================================================================

FROM node:20-bookworm-slim

# Pasang dependensi sistem yang dibutuhkan:
# - ffmpeg (wajib untuk TTS voice note, kompresi audio, sticker webp)
# - python3 & curl (untuk helper runtime dan unduh yt-dlp)
# - yt-dlp (opsional / fallback downloader YouTube audio)
# - ca-certificates (untuk koneksi HTTPS & SSL database aman)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    curl \
    ca-certificates \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Direktori kerja dalam container
WORKDIR /app

# Salin package manifest terlebih dahulu untuk memanfaatkan Docker cache layer
COPY package*.json ./

# Install dependensi Node.js
RUN npm install

# Salin seluruh file project ke dalam container
COPY . .

# Environment default untuk container hosting
ENV NODE_ENV=production
ENV PORT=8080

# Port yang dibuka untuk keep-alive web server Back4app
EXPOSE 8080

# Jalankan bot
CMD ["node", "index.js"]

