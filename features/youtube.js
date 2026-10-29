const axios = require("axios");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const ffmpeg = require("fluent-ffmpeg");

const API_URL = "https://api.samplecut.app/v1/downloads";
const DOWNLOAD_TIMEOUT_MS = 90_000;
const MAX_SOURCE_BYTES = 50 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 12 * 1024 * 1024;

function compressAudio(inputFile, outputFile) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputFile)
      .noVideo()
      .audioCodec("libmp3lame")
      .audioBitrate("64k")
      .audioChannels(1)
      .audioFrequency(44100)
      .format("mp3")
      .on("end", resolve)
      .on("error", reject)
      .save(outputFile);
  });
}

async function downloadAudio(url) {
  let response;

  try {
    response = await axios.post(
      API_URL,
      { url, format: "mp3", response: "url" },
      {
        headers: { "X-Client-Name": "adzbotzs-reborn" },
        timeout: DOWNLOAD_TIMEOUT_MS,
      },
    );
  } catch (error) {
    const apiError = error.response?.data?.error;
    throw new Error(
      apiError?.message ||
        `API audio tidak bisa memproses video (${error.code || error.message})`,
    );
  }

  const downloadUrl = response.data?.download_url;
  if (!downloadUrl) {
    throw new Error("API audio tidak mengembalikan link download MP3");
  }

  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "adzbotzs-play-"),
  );
  const sourceFile = path.join(directory, `${crypto.randomUUID()}.source`);
  const outputFile = path.join(directory, `${crypto.randomUUID()}.mp3`);

  try {
    const audioResponse = await axios.get(downloadUrl, {
      responseType: "arraybuffer",
      timeout: DOWNLOAD_TIMEOUT_MS,
      maxContentLength: MAX_SOURCE_BYTES,
      maxBodyLength: MAX_SOURCE_BYTES,
    });
    const source = Buffer.from(audioResponse.data);

    if (!source.length) {
      throw new Error("file audio dari server kosong");
    }

    fs.writeFileSync(sourceFile, source);
    await compressAudio(sourceFile, outputFile);
    const audio = fs.readFileSync(outputFile);

    if (!audio.length || audio.length > MAX_OUTPUT_BYTES) {
      throw new Error("ukuran audio hasil kompresi tidak valid");
    }

    return audio;
  } catch (error) {
    if (error.code === "ECONNABORTED") {
      throw new Error("download audio timeout, server sumber terlalu lambat");
    }
    throw new Error(`gagal menyiapkan audio: ${error.message}`);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

module.exports = { downloadAudio };
