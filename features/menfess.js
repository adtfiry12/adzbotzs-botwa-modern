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

function endConversation(jid) {
  const conversation =
    conversationsBySender.get(jid) || conversationsByTarget.get(jid);
  if (!conversation) return false;

  conversationsBySender.delete(conversation.senderJid);
  conversationsByTarget.delete(conversation.targetJid);
  return true;
}

function getConversation(jid) {
  return getActiveConversation(
    conversationsBySender.get(jid) || conversationsByTarget.get(jid),
  );
}

function getActiveConversation(conversation) {
  if (!conversation || conversation.expiresAt <= Date.now()) {
    return null;
  }

  conversation.expiresAt = Date.now() + CONVERSATION_TTL_MS;
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
      `┏━━━ ⟡ *BALASAN MENFESS*\n` +
      `┃ ▸ Penerima membalas:\n` +
      `┃ ▸ _“${body.trim()}”_\n` +
      `┃ ▸ Balas dengan *.balas <pesan>*\n` +
      `┗━━━━━━━━━━━━━━━━━━━━━━━━━━`,
  });

  return true;
}

async function sendSenderReply(piyo, senderJid, text) {
  if (!text?.trim()) return false;

  const conversation = getActiveConversation(
    conversationsBySender.get(senderJid),
  );

  if (!conversation) {
    return false;
  }

  await piyo.sendMessage(conversation.targetJid, {
    text:
      `┏━━━ ⟡ *BALASAN MENFESS*\n` +
      `┃ ▸ Ada balasan anonim:\n` +
      `┃ ▸ _“${text.trim()}”_\n` +
      `┗━━━━━━━━━━━━━━━━━━━━━━━━━━`,
  });

  return true;
}

module.exports = {
  registerConversation,
  endConversation,
  getConversation,
  relayTargetReply,
  sendSenderReply,
};
