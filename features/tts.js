const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const ffmpeg = require("fluent-ffmpeg");
const googleTTS = require("google-tts-api");
const axios = require("axios");

function convertToVoiceNote(inputFile, outputFile) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputFile)
      .noVideo()
      .audioCodec("libopus")
      .audioChannels(1)
      .audioFrequency(48000)
      .format("ogg")
      .on("end", resolve)
      .on("error", reject)
      .save(outputFile);
  });
}

async function createVoiceNote(text) {
  const audioUrl = googleTTS.getAudioUrl(text, {
    lang: "id",
    slow: false,
    host: "https://translate.google.com",
  });
  const response = await axios.get(audioUrl, {
    responseType: "arraybuffer",
    timeout: 20_000,
  });
  const source = Buffer.from(response.data);

  if (!source.length) {
    throw new Error("Google TTS mengembalikan audio kosong");
  }

  const id = crypto.randomUUID();
  const inputFile = path.join(os.tmpdir(), `adzbotzs-tts-${id}.mp3`);
  const outputFile = path.join(os.tmpdir(), `adzbotzs-tts-${id}.ogg`);

  try {
    fs.writeFileSync(inputFile, source);
    await convertToVoiceNote(inputFile, outputFile);
    const voiceNote = fs.readFileSync(outputFile);

    if (!voiceNote.length) {
      throw new Error("FFmpeg menghasilkan voice note kosong");
    }

    return voiceNote;
  } finally {
    for (const file of [inputFile, outputFile]) {
      try {
        fs.unlinkSync(file);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
  }
}

module.exports = { createVoiceNote };
