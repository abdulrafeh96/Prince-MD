'use strict';

const { toSmallCaps } = require('../utils/fonts');

const wife = async (ctx) => {
  const { sock, from, msg, react, reply } = ctx;

  // Professional Group Check with Quoted Reply
  if (!ctx.isGroup) {
    return reply(`❌ *${toSmallCaps('this command is strictly for groups only!')}*`);
  }

  await react('💍');
  try {
    const meta = await sock.groupMetadata(from);
    const members = meta.participants;
    const random = members[Math.floor(Math.random() * members.length)].id;
    
    await sock.sendMessage(from, {
      text: `💍 *ᴡɪꜰᴇ ꜰᴏᴜɴᴅ!* 💍\n\n@${random.split('@')[0]} *${toSmallCaps('is your wife!')}*\n\n💖 *${toSmallCaps('take care of your wife!')}*`,
      mentions: [random]
    }, { quoted: msg });
  } catch (err) {
    await react('❌');
    console.error('Wife Error:', err);
  }
};

module.exports = { wife };