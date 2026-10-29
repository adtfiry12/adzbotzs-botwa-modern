require("dotenv").config();

module.exports = {
  ownerName: process.env.OWNER_NAME,
  ownerNumber: process.env.OWNER_NUMBER,
  botName: process.env.BOT_NAME,
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL,
};
