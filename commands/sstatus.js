'use strict';
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { toSmallCaps } = require('../utils/fonts');
const { getOwnerJid } = require('../utils/ownerTarget');

// Helper function for Bold Small Caps
const boldSmallCaps = (text) => `*${toSmallCaps(text)}*`;

const sstatus = async (ctx) => {
  const { sock, msg, isOwner, botNum, from } = ctx;

  // 1. OWNER ONLY CHECK (With Quoted Reply)
  if (!isOwner) {
    return sock.sendMessage(from, { text: `❌ ${boldSmallCaps('owner only command')}` }, { quoted: msg });
  }

  // 2. Status message verify
  const isStatus = msg.key.remoteJid === 'status@broadcast';
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  
  if (!isStatus && !quoted?.imageMessage && !quoted?.videoMessage) {
    return sock.sendMessage(from, { text: `❌ ${boldSmallCaps('this is not a status.')}` }, { quoted: msg });
  }

  try {
    // Media message structure
    const targetMsg = isStatus ? msg : {
      key: { 
        remoteJid: 'status@broadcast', 
        participant: msg.message.extendedTextMessage.contextInfo.participant, 
        id: msg.message.extendedTextMessage.contextInfo.stanzaId 
      },
      message: quoted
    };

    // Media download
    const buffer = await downloadMediaMessage(targetMsg, 'buffer');
    const ownerJid = getOwnerJid(botNum);
    
    // Original caption
    const originalCaption = targetMsg.message?.imageMessage?.caption || 
                           targetMsg.message?.videoMessage?.caption || '';

    // Caption: Original + Bold Small Caps Signature
    const caption = `${originalCaption ? originalCaption + '\n\n' : ''}> ${boldSmallCaps('saved by Prince Md')}`;
    
    // Media bhejo (Owner ke DM mein)
    const isVideo = targetMsg.message?.videoMessage || targetMsg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage;
    
    if (isVideo) {
      await sock.sendMessage(ownerJid, { video: buffer, caption: caption });
    } else {
      await sock.sendMessage(ownerJid, { image: buffer, caption: caption });
    }

  } catch (err) {
    console.error('Sstatus Error:', err);
    sock.sendMessage(from, { text: `❌ ${boldSmallCaps('error saving status.')}` }, { quoted: msg });
  }
};

module.exports = { sstatus };
