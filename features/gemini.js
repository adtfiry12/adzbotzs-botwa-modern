const { GoogleGenAI } = require("@google/genai");
const axios = require("axios");
const config = require("../config");
const REQUEST_TIMEOUT_MS = 45_000;
const preferredFlashModels = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
  "gemini-3.7-flash",
  "gemini-3.8-flash",
];

async function findAvailableModels() {
  const configuredModel = config.geminiModel || "gemini-flash-latest";
  const response = await axios.get(
    "https://generativelanguage.googleapis.com/v1beta/models",
    {
      params: { key: config.geminiApiKey, pageSize: 100 },
      timeout: 15_000,
    },
  );
  const listedModels = response.data?.models || [];
  const supportedModels = listedModels.filter((item) =>
    item.supportedGenerationMethods?.includes("generateContent"),
  );
  const normalize = (name) => name?.replace(/^models\//, "");
  const sortedModels = [...supportedModels].sort((a, b) => {
    const aName = normalize(a.name);
    const bName = normalize(b.name);
    const aConcreteFlash = /^gemini-\d+\.\d+-flash$/.test(aName);
    const bConcreteFlash = /^gemini-\d+\.\d+-flash$/.test(bName);
    const configuredIsConcrete = /^gemini-\d+\.\d+-flash$/.test(
      configuredModel,
    );
    if (configuredIsConcrete && aName === configuredModel) return -1;
    if (configuredIsConcrete && bName === configuredModel) return 1;
    const aPreferred = preferredFlashModels.indexOf(aName);
    const bPreferred = preferredFlashModels.indexOf(bName);
    if (aPreferred !== -1 || bPreferred !== -1) {
      if (aPreferred === -1) return 1;
      if (bPreferred === -1) return -1;
      return aPreferred - bPreferred;
    }
    if (aConcreteFlash && !bConcreteFlash) return -1;
    if (!aConcreteFlash && bConcreteFlash) return 1;
    if (aConcreteFlash && bConcreteFlash) {
      const aVersion = Number(aName.match(/\d+\.\d+/)?.[0] || 0);
      const bVersion = Number(bName.match(/\d+\.\d+/)?.[0] || 0);
      return bVersion - aVersion;
    }
    if (/flash/i.test(aName) && !/flash/i.test(bName)) return -1;
    if (!/flash/i.test(aName) && /flash/i.test(bName)) return 1;
    return 0;
  });
  const models = sortedModels
    .map((item) => normalize(item.name))
    .filter(
      (name) =>
        !/preview|tts|image|lite/i.test(name) ||
        /^gemini-\d+\.\d+-flash$/.test(name),
    );

  if (!models.length) {
    throw new Error(
      "Tidak ada model Gemini yang mendukung generateContent untuk API key ini",
    );
  }

  return models;
}

async function generateWithGemini(contents) {
  if (!config.geminiApiKey) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi");
  }

  const ai = new GoogleGenAI({
    apiKey: config.geminiApiKey,
    apiVersion: "v1beta",
  });
  const models = await findAvailableModels();
  let lastError;

  for (const model of models.slice(0, 5)) {
    const abortController = new AbortController();
    const timeout = setTimeout(
      () => abortController.abort(),
      REQUEST_TIMEOUT_MS,
    );

    try {
      const result = await ai.models.generateContent({
        model,
        contents,
        config: { abortSignal: abortController.signal },
      });

      if (result.text) return result.text;
      lastError = new Error(`Model ${model} mengembalikan respons kosong`);
    } catch (error) {
      lastError = abortController.signal.aborted
        ? new Error(`Request Gemini timeout pada model ${model}`)
        : error;
      const retryable =
        error?.status === 404 ||
        error?.status === 429 ||
        error?.status === 500 ||
        error?.status === 503 ||
        /overload|high demand|temporarily unavailable|rate limit/i.test(
          error?.message || "",
        );

      if (!retryable) throw lastError;
      console.warn(`Gemini model ${model} sedang sibuk, mencoba fallback.`);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}

async function generateAnswer(prompt) {
  return generateWithGemini(prompt);
}

async function generateVisionAnswer(imageBuffer, mimeType, prompt) {
  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    throw new Error("Gambar untuk AI Vision kosong");
  }

  return generateWithGemini([
    {
      role: "user",
      parts: [
        {
          inlineData: {
            mimeType,
            data: imageBuffer.toString("base64"),
          },
        },
        {
          text:
            prompt ||
            "Jelaskan isi gambar ini secara detail dalam Bahasa Indonesia. " +
              "Jika ada teks, salin dan jelaskan bagian pentingnya.",
        },
      ],
    },
  ]);
}

module.exports = { generateAnswer, generateVisionAnswer };
