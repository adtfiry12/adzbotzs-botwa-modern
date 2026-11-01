const { getGroupSettings } = require("./groupSettings");

async function enforceAntiLink(piyo, msg, from, body) {
  if (
    !from.endsWith("@g.us") ||
    !body.includes("chat.whatsapp.com/") ||
    !(await getGroupSettings(from)).antilink
  ) {
    return false;
  }

  const groupMetadata = await piyo.groupMetadata(from);
  const participants = groupMetadata.participants;
  const sender = msg.key.participant || msg.key.remoteJid;
  const senderParticipant = participants.find((participant) => participant.id === sender);
  const botId = `${piyo.user.id.split(":")[0]}@s.whatsapp.net`;
  const botParticipant = participants.find((participant) => participant.id === botId);
  const isAdmin = Boolean(senderParticipant?.admin);
  const isBotAdmin = Boolean(botParticipant?.admin);

  if (isAdmin) return false;

  await piyo.sendMessage(
    from,
    {
      text: "╭─〔 ANTI-LINK 〕\n├─ Link grup lain terdeteksi.\n╰─ Pesan akan dihapus dan pengirim dikeluarkan.",
    },
    { quoted: msg },
  );

  if (isBotAdmin) {
    await piyo.sendMessage(from, { delete: msg.key });
    await piyo.groupParticipantsUpdate(from, [sender], "remove");
  } else {
    await piyo.sendMessage(from, {
      text: "Bot belum menjadi admin, jadi pesan tidak dapat dihapus atau pengirim tidak dapat dikeluarkan.",
    });
  }

  return true;
}

module.exports = { enforceAntiLink };
