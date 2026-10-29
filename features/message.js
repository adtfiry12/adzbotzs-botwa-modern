function extractMessage(msg) {
  if (!msg?.message) return { type: "", body: "" };

  const type = Object.keys(msg.message)[0] || "";
  const body =
    type === "conversation"
      ? msg.message.conversation
      : type === "extendedTextMessage"
        ? msg.message.extendedTextMessage.text
        : type === "imageMessage" && msg.message.imageMessage.caption
          ? msg.message.imageMessage.caption
          : type === "videoMessage" && msg.message.videoMessage.caption
            ? msg.message.videoMessage.caption
            : "";

  return { type, body: body || "" };
}

module.exports = { extractMessage };
