const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { exec } = require("child_process");
const googleTTS = require("google-tts-api");

function convertToOpusOgg(inputBuffer) {
  const id = crypto.randomUUID();
  const inputFile = path.join(os.tmpdir(), `adzbotzs-tts-${id}.mp3`);
  const outputFile = path.join(os.tmpdir(), `adzbotzs-tts-${id}.ogg`);

  return new Promise((resolve, reject) => {
    fs.writeFileSync(inputFile, inputBuffer);

    exec(
      `ffmpeg -y -i "${inputFile}" -vn -c:a libopus -ar 48000 -ac 1 -b:a 64k -f ogg "${outputFile}"`,
      (error) => {
        try {
          if (error) {
            reject(error);
          } else {
            const voiceNote = fs.readFileSync(outputFile);
            resolve(voiceNote);
          }
        } catch (err) {
          reject(err);
        } finally {
          for (const file of [inputFile, outputFile]) {
            if (fs.existsSync(file)) {
              try {
                fs.unlinkSync(file);
              } catch (_) {}
            }
          }
        }
      },
    );
  });
}

async function createVoiceNote(text) {
  if (!text || !text.trim()) {
    throw new Error("Teks tidak boleh kosong");
  }

  const cleanText = text.trim().slice(0, 500);

  // Ambil audio base64 dari Google TTS dengan automatic chunking jika > 200 karakter
  const parts = await googleTTS.getAllAudioBase64(cleanText, {
    lang: "id",
    slow: false,
    host: "https://translate.google.com",
    timeout: 20000,
  });

  if (!parts || parts.length === 0) {
    throw new Error("Google TTS tidak mengembalikan data audio");
  }

  const mp3Buffer = Buffer.concat(
    parts.map((p) => Buffer.from(p.base64, "base64")),
  );

  if (!mp3Buffer.length) {
    throw new Error("Audio buffer TTS kosong");
  }

  // Konversi ke format voice note WhatsApp (Opus OGG) jika FFmpeg tersedia
  try {
    const oggBuffer = await convertToOpusOgg(mp3Buffer);
    return {
      audio: oggBuffer,
      mimetype: "audio/ogg; codecs=opus",
      ptt: true,
    };
  } catch (err) {
    // Fallback jika FFmpeg tidak terpasang di sistem hosting (misal container Back4app)
    return {
      audio: mp3Buffer,
      mimetype: "audio/mp4",
      ptt: true,
    };
  }
}

module.exports = { createVoiceNote };
