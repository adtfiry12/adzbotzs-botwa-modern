function extractMessage(msg) {
  if (!msg?.message) return { type: "", body: "" };

  let message = msg.message;
  // Unwrap nested messages (disappearing messages, view-once, dsb)
  if (message.ephemeralMessage) {
    message = message.ephemeralMessage.message;
  }
  if (message.viewOnceMessage) {
    message = message.viewOnceMessage.message;
  }
  if (message.viewOnceMessageV2) {
    message = message.viewOnceMessageV2.message;
  }
  if (message.documentWithCaptionMessage) {
    message = message.documentWithCaptionMessage.message;
  }

  const type = Object.keys(message || {})[0] || "";
  const body =
    type === "conversation"
      ? message.conversation
      : type === "extendedTextMessage"
        ? message.extendedTextMessage.text
        : type === "imageMessage" && message.imageMessage?.caption
          ? message.imageMessage.caption
          : type === "videoMessage" && message.videoMessage?.caption
            ? message.videoMessage.caption
            : "";

  return { type, body: body || "" };
}

module.exports = { extractMessage };
