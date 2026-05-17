'use strict';

const { toSmallCaps } = require('../utils/fonts');

const daughter = async (ctx) => {
  const { sock, from, msg, react } = ctx;

  // Agar group nahi hai to wahi quoted reply mein error dega
  if (!ctx.isGroup) {
    return sock.sendMessage(from, { 
      text: `❌ *${toSmallCaps('this command is only for groups')}*` 
    }, { quoted: msg });
  }

  await react('👧');
  try {
    const meta = await sock.groupMetadata(from);
    const members = meta.participants;
    const random = members[Math.floor(Math.random() * members.length)].id;
    
    await sock.sendMessage(from, {
      text: `👧 *ᴅᴀᴜɢʜᴛᴇʀ ꜰᴏᴜɴᴅ!* 👧\n@${random.split('@')[0]} ɪꜱ ʏᴏᴜʀ ᴅᴀᴜɢʜᴛᴇʀ!\n🧒 *ᴛᴀᴋᴇ ᴄᴀʀᴇ ᴏꜰ ʏᴏᴜʀ ᴄʜɪʟᴅ!*`,
      mentions: [random]
    }, { quoted: msg });
  } catch (err) {
    await react('❌');
    console.error('Daughter Error:', err);
  }
};

module.exports = { daughter };