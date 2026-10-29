const { GoogleGenerativeAI } = require("@google/generative-ai");
const config = require("../config");

const modelNames = [
  config.geminiModel,
  "gemini-2.5-flash",
  "gemini-2.0-flash",
].filter((model, index, models) => model && models.indexOf(model) === index);

async function generateAnswer(prompt) {
  if (!config.geminiApiKey) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi");
  }

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  let lastError;

  for (const modelName of modelNames) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      lastError = error;
      const isModelUnavailable =
        error?.status === 404 ||
        error?.statusText === "Not Found" ||
        /model .* is not found|not supported for generateContent/i.test(
          error?.message || "",
        );

      if (!isModelUnavailable) {
        throw error;
      }

      console.warn(`Gemini model ${modelName} tidak tersedia, mencoba model berikutnya.`);
    }
  }

  throw lastError;
}

module.exports = { generateAnswer };
