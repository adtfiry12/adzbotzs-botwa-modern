const { GoogleGenAI } = require("@google/genai");
const config = require("../config");

const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const FALLBACK_MODEL = "gemini-2.5-flash";
const TEXT_TIMEOUT_MS = 60000;
const VISION_TIMEOUT_MS = 90000;

function getClient() {
  if (!config.geminiApiKey) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi di file .env");
  }
  return new GoogleGenAI({ apiKey: config.geminiApiKey });
}

function withTimeout(promise, timeoutMs, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function getModels() {
  return [...new Set([config.geminiModel || DEFAULT_MODEL, FALLBACK_MODEL])];
}

function getResponseText(result) {
  const text = typeof result?.text === "function" ? result.text() : result?.text;
  return typeof text === "string" && text.trim() ? text.trim() : null;
}

async function generateAnswer(prompt) {
  if (!prompt || !prompt.trim()) {
    throw new Error("Pertanyaan tidak boleh kosong");
  }

  const ai = getClient();
  let lastError;

  for (const model of getModels()) {
    try {
      const result = await withTimeout(
        ai.models.generateContent({
          model,
          contents: prompt.trim(),
          config: {
            systemInstruction:
              "Jawab dalam Bahasa Indonesia. Berikan jawaban langsung, jelas, dan tidak bertele-tele.",
          },
        }),
        TEXT_TIMEOUT_MS,
        "Permintaan AI terlalu lama",
      );
      const text = getResponseText(result);
      if (text) return text;
      lastError = new Error(`Model ${model} mengembalikan respons kosong`);
    } catch (error) {
      lastError = error;
      console.warn(`AI model ${model} gagal: ${error.message}`);
    }
  }

  throw lastError || new Error("Gagal mendapatkan respons dari Google Gemini");
}

async function generateVisionAnswer(imageBuffer, mimeType, prompt) {
  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    throw new Error("Gambar untuk AI Vision kosong");
  }

  const ai = getClient();
  const userPrompt =
    prompt?.trim() ||
    "Jelaskan isi gambar ini dalam Bahasa Indonesia. Jika ada teks, salin teks pentingnya.";
  const imageData = imageBuffer.toString("base64");
  let lastError;

  for (const model of getModels()) {
    try {
      const result = await withTimeout(
        ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType || "image/jpeg",
                    data: imageData,
                  },
                },
                { text: userPrompt },
              ],
            },
          ],
          config: {
            systemInstruction:
              "Jawab dalam Bahasa Indonesia. Fokus pada isi gambar dan hindari penjelasan yang tidak diminta.",
          },
        }),
        VISION_TIMEOUT_MS,
        "Analisis gambar terlalu lama",
      );
      const text = getResponseText(result);
      if (text) return text;
      lastError = new Error(`Model ${model} mengembalikan respons kosong`);
    } catch (error) {
      lastError = error;
      console.warn(`AI Vision model ${model} gagal: ${error.message}`);
    }
  }

  throw lastError || new Error("AI gagal menganalisis gambar");
}

module.exports = { generateAnswer, generateVisionAnswer };
