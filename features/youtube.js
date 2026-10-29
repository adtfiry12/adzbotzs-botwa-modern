const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

async function downloadAudio(url) {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "adzbotzs-youtube-"),
  );
  const outputTemplate = path.join(directory, "audio.%(ext)s");

  try {
    await execFileAsync(
      "yt-dlp",
      [
        "--no-playlist",
        "--no-warnings",
        "--no-progress",
        "--extract-audio",
        "--format",
        "bestaudio[ext=m4a]/bestaudio",
        "--audio-format",
        "mp3",
        "--audio-quality",
        "5",
        "--max-filesize",
        "25M",
        "--socket-timeout",
        "30",
        "--retries",
        "2",
        "--output",
        outputTemplate,
        url,
      ],
      {
        timeout: 90_000,
        maxBuffer: 2 * 1024 * 1024,
      },
    );

    const audioFile = path.join(directory, "audio.mp3");
    if (!fs.existsSync(audioFile)) {
      throw new Error("yt-dlp selesai tetapi file MP3 tidak ditemukan");
    }

    const audio = fs.readFileSync(audioFile);
    if (!audio.length) {
      throw new Error("yt-dlp menghasilkan file audio kosong");
    }

    return audio;
  } catch (error) {
    const detail = error.stderr?.trim() || error.message;
    throw new Error(`Downloader YouTube gagal: ${detail}`);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

module.exports = { downloadAudio };
