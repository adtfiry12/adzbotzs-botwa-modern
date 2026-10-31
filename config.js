require("dotenv").config();

module.exports = {
  ownerName: process.env.OWNER_NAME || "adtfiry",
  ownerNumber: process.env.OWNER_NUMBER || "628xxxxxxxxxx",
  botName: process.env.BOT_NAME || "ADZBOTZS",
  botNumber: process.env.BOT_NUMBER || "",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-flash-latest",
  menuLogoPath: process.env.MENU_LOGO_PATH || "assets/menu-logo.png",
};
