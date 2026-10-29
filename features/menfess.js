const conversationsByTarget = new Map();
const conversationsBySender = new Map();
const CONVERSATION_TTL_MS = 24 * 60 * 60 * 1000;

function registerConversation(senderJid, targetJid) {
  const conversation = {
    senderJid,
    targetJid,
    expiresAt: Date.now() + CONVERSATION_TTL_MS,
  };

  conversationsByTarget.set(targetJid, conversation);
  conversationsBySender.set(senderJid, conversation);
}

function getActiveConversation(conversation) {
  if (!conversation || conversation.expiresAt <= Date.now()) {
    return null;
  }

  return conversation;
}

async function relayTargetReply(piyo, msg, body) {
  const targetJid = msg.key.remoteJid;
  const conversation = getActiveConversation(
    conversationsByTarget.get(targetJid),
  );

  if (!conversation || !body.trim()) return false;

  await piyo.sendMessage(conversation.senderJid, {
    text:
      `💬 *BALASAN MENFESS*\n\n` +
      `Target membalas:\n\n_“${body.trim()}”_\n\n` +
      `Balas dengan *.balas <pesan>* untuk mengirim jawaban anonim.`,
  });

  return true;
}

async function sendSenderReply(piyo, senderJid, text) {
  const conversation = getActiveConversation(
    conversationsBySender.get(senderJid),
  );

  if (!conversation) {
    return false;
  }

  await piyo.sendMessage(conversation.targetJid, {
    text:
      `💌 *BALASAN MENFESS*\n\n` +
      `Ada balasan anonim untuk lu:\n\n_“${text.trim()}”_`,
  });

  return true;
}

module.exports = {
  registerConversation,
  relayTargetReply,
  sendSenderReply,
};
