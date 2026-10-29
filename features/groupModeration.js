async function enforceAntiLink(piyo, msg, from, body) {
  if (!from.endsWith("@g.us") || !body.includes("chat.whatsapp.com/")) {
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
      text: "⚠️ *SISTEM ANTI-LINK AKTIF!*\n\nMaaf bro, lu ngirim link grup lain. Sesuai aturan bot, lu bakal dikeluarin!",
    },
    { quoted: msg },
  );

  if (isBotAdmin) {
    await piyo.sendMessage(from, { delete: msg.key });
    await piyo.groupParticipantsUpdate(from, [sender], "remove");
  } else {
    await piyo.sendMessage(from, {
      text: "Bot bukan admin, jadi nggak bisa ngehapus pesan atau nge-kick pelakunya.",
    });
  }

  return true;
}

module.exports = { enforceAntiLink };
