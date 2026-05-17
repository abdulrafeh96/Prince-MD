'use strict';

const { toSmallCaps } = require('../utils/fonts');
const { authMiddleware } = require('../middleware/auth');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

const setppgc = async (ctx) => {
  const { sock, from, msg, react, reply } = ctx;
  const auth = authMiddleware(ctx);
  
  if (!await auth.requireGroup()) return;
  if (!await auth.requireAdmin()) return;
  if (!await auth.requireBotAdmin()) return;

  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const mime = (msg.message?.imageMessage || quoted?.imageMessage)?.mimetype;

  if (!mime) {
    await react('❌');
    return reply(`❌ *${toSmallCaps('quote an image to set as group picture')}*`);
  }

  await react('⏳');
  try {
    // Media download logic
    const media = await downloadMediaMessage(
      { key: { remoteJid: from, id: msg.message.extendedTextMessage.contextInfo.stanzaId }, message: quoted || msg.message },
      'buffer',
      {},
      { logger: console }
    );

    await sock.updateProfilePicture(from, media);
    await reply(`✅ *${toSmallCaps('group picture updated successfully')}*`);
    await react('✅');
  } catch (err) {
    console.error('SetPPGC Error:', err);
    await react('❌');
    await reply(`❌ *${toSmallCaps('failed to update group picture')}:* ${err.message}`);
  }
};

module.exports = { setppgc };

