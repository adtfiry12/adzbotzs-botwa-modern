const { GoogleGenAI } = require("@google/genai");
const config = require("../config");

const DEFAULT_MODEL = "gemini-2.5-flash";

function getClient() {
  if (!config.geminiApiKey) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi di file .env");
  }
  return new GoogleGenAI({
    apiKey: config.geminiApiKey,
  });
}

/**
 * Generate teks menggunakan Interactions API (Google Gemini 3.8 Flash)
 * dengan fallback ke generateContent pada model stabil lainnya.
 */
async function generateAnswer(prompt) {
  if (!prompt || !prompt.trim()) {
    throw new Error("Pertanyaan tidak boleh kosong");
  }

  const ai = getClient();
  const targetModel = config.geminiModel || DEFAULT_MODEL;

  // 1. Coba metode utama: Google Interactions API (Gemini 3.8)
  try {
    const interaction = await ai.interactions.create({
      model: targetModel,
      input: prompt.trim(),
    });

    if (interaction?.output_text) {
      return interaction.output_text;
    }
  } catch (err) {
    console.warn(
      `Interactions API gagal pada model ${targetModel} (${err.message}). Mencoba fallback...`,
    );
  }

  // 2. Fallback: models.generateContent pada model stabil
  const fallbackModels = [
    ...new Set([targetModel, DEFAULT_MODEL, "gemini-2.0-flash"]),
  ];
  let lastError;

  for (const model of fallbackModels) {
    try {
      const result = await ai.models.generateContent({
        model,
        contents: prompt.trim(),
      });

      if (result?.text) {
        return result.text;
      }
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error("Gagal mendapatkan respons dari Google Gemini AI");
}

/**
 * Multimodal / Analisis gambar menggunakan Gemini Vision
 */
async function generateVisionAnswer(imageBuffer, mimeType, prompt) {
  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    throw new Error("Gambar untuk AI Vision kosong");
  }

  const ai = getClient();
  const targetModel = config.geminiModel || DEFAULT_MODEL;

  const userPrompt =
    prompt ||
    "Jelaskan isi gambar ini secara detail dalam Bahasa Indonesia. Jika ada teks, salin dan jelaskan bagian pentingnya.";

  // 1. Coba metode utama: Google Interactions API (Multimodal)
  try {
    const interaction = await ai.interactions.create({
      model: targetModel,
      input: [
        {
          type: "image",
          data: imageBuffer.toString("base64"),
          mime_type: mimeType || "image/jpeg",
        },
        {
          type: "text",
          text: userPrompt,
        },
      ],
    });

    if (interaction?.output_text) {
      return interaction.output_text;
    }
  } catch (err) {
    console.warn(
      `Interactions API Vision gagal pada ${targetModel} (${err.message}). Mencoba fallback...`,
    );
  }

  // 2. Fallback: models.generateContent
  const fallbackModels = [
    ...new Set([targetModel, DEFAULT_MODEL, "gemini-2.0-flash"]),
  ];
  let lastError;

  for (const model of fallbackModels) {
    try {
      const result = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || "image/jpeg",
                  data: imageBuffer.toString("base64"),
                },
              },
              {
                text: userPrompt,
              },
            ],
          },
        ],
      });

      if (result?.text) {
        return result.text;
      }
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error("AI gagal menganalisis gambar");
}

module.exports = { generateAnswer, generateVisionAnswer };
