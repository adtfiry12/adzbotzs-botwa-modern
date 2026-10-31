const axios = require("axios");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { exec } = require("child_process");

const DOWNLOAD_TIMEOUT_MS = 60_000;
const MAX_SOURCE_BYTES = 50 * 1024 * 1024; // 50MB
const MAX_WHATSAPP_BYTES = 16 * 1024 * 1024; // 16MB

function compressAudio(inputFile, outputFile) {
  return new Promise((resolve, reject) => {
    exec(
      `ffmpeg -y -i "${inputFile}" -vn -c:a libmp3lame -b:a 64k -ac 1 -ar 44100 "${outputFile}"`,
      (error) => {
        if (error) reject(error);
        else resolve();
      },
    );
  });
}

async function downloadFromYtDlp(url) {
  const id = crypto.randomUUID();
  const dir = os.tmpdir();
  const outputFile = path.join(dir, `adz_ytdlp_${id}.mp3`);

  return new Promise((resolve, reject) => {
    exec(
      `yt-dlp -x --audio-format mp3 --audio-quality 5 --max-filesize 30M --no-playlist -o "${outputFile}" "${url}"`,
      { timeout: 60000 },
      (error) => {
        if (error) {
          if (fs.existsSync(outputFile)) {
            try {
              fs.unlinkSync(outputFile);
            } catch (_) {}
          }
          return reject(error);
        }
        if (!fs.existsSync(outputFile)) {
          return reject(new Error("File output yt-dlp tidak ditemukan"));
        }
        try {
          const buffer = fs.readFileSync(outputFile);
          fs.unlinkSync(outputFile);
          resolve(buffer);
        } catch (e) {
          reject(e);
        }
      },
    );
  });
}

async function fetchAudioFromUrl(downloadUrl) {
  const response = await axios.get(downloadUrl, {
    responseType: "arraybuffer",
    timeout: DOWNLOAD_TIMEOUT_MS,
    maxContentLength: MAX_SOURCE_BYTES,
    maxBodyLength: MAX_SOURCE_BYTES,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  return Buffer.from(response.data);
}

// Koleksi provider API YouTube Downloader publik dengan failover
const providers = [
  {
    name: "Widipe",
    fetch: async (url) => {
      const res = await axios.get("https://widipe.com/download/ytdl", {
        params: { url },
        timeout: 20000,
      });
      const dl = res.data?.result?.mp3 || res.data?.result?.download?.url;
      if (!dl) throw new Error("Link audio tidak ditemukan");
      return dl;
    },
  },
  {
    name: "Siputzx",
    fetch: async (url) => {
      const res = await axios.get("https://api.siputzx.my.id/api/d/ytmp3", {
        params: { url },
        timeout: 20000,
      });
      const dl = res.data?.data?.dl || res.data?.result?.url;
      if (!dl) throw new Error("Link audio tidak ditemukan");
      return dl;
    },
  },
  {
    name: "Vreden",
    fetch: async (url) => {
      const res = await axios.get("https://api.vreden.web.id/api/ytmp3", {
        params: { url },
        timeout: 20000,
      });
      const dl =
        res.data?.result?.download?.url ||
        res.data?.result?.url ||
        res.data?.data?.url;
      if (!dl) throw new Error("Link audio tidak ditemukan");
      return dl;
    },
  },
  {
    name: "Agatz",
    fetch: async (url) => {
      const res = await axios.get("https://api.agatz.xyz/api/ytmp3", {
        params: { url },
        timeout: 20000,
      });
      const dl =
        res.data?.data?.downloadUrl ||
        res.data?.data?.url ||
        res.data?.result?.url;
      if (!dl) throw new Error("Link audio tidak ditemukan");
      return dl;
    },
  },
];

async function downloadAudio(url) {
  let audioBuffer = null;
  let lastError = null;

  // 1. Coba unduh melalui daftar API provider
  for (const provider of providers) {
    try {
      const downloadUrl = await provider.fetch(url);
      audioBuffer = await fetchAudioFromUrl(downloadUrl);
      if (audioBuffer && audioBuffer.length > 0) {
        break;
      }
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  // 2. Jika semua API provider gagal, coba local yt-dlp jika terpasang di sistem
  if (!audioBuffer) {
    try {
      audioBuffer = await downloadFromYtDlp(url);
    } catch (ytDlpErr) {
      lastError = ytDlpErr;
    }
  }

  if (!audioBuffer || audioBuffer.length === 0) {
    throw new Error(
      `Semua endpoint downloader YouTube gagal (${lastError?.message || "Layanan sibuk"}). Silakan coba beberapa saat lagi.`,
    );
  }

  // 3. Kompresi otomatis jika audio > 16MB agar bisa dikirim di WhatsApp
  if (audioBuffer.length > MAX_WHATSAPP_BYTES) {
    const id = crypto.randomUUID();
    const tempIn = path.join(os.tmpdir(), `adz_ytsrc_${id}.mp3`);
    const tempOut = path.join(os.tmpdir(), `adz_ytout_${id}.mp3`);

    try {
      fs.writeFileSync(tempIn, audioBuffer);
      await compressAudio(tempIn, tempOut);
      const compressed = fs.readFileSync(tempOut);
      if (compressed.length > 0) {
        audioBuffer = compressed;
      }
    } catch (_) {
      // Jika kompresi ffmpeg gagal, tetap gunakan buffer awal
    } finally {
      for (const f of [tempIn, tempOut]) {
        if (fs.existsSync(f)) {
          try {
            fs.unlinkSync(f);
          } catch (_) {}
        }
      }
    }
  }

  return audioBuffer;
}

module.exports = { downloadAudio };
