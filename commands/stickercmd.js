// ============================================
//      Prince Md — COMMANDS/STICKERCMD.JS
//      Sticker Command Management
// ============================================

'use strict';

const { authMiddleware } = require('../middleware/auth');
const db = require('../database/db');
const { getMentions } = require('../utils/helpers');

// ─── Sticker Command Functions ─────────────────────────────

const setStickerCommand = async (sock, m, args) => {
  const from = m.key?.remoteJid || m.from;
  const sender = m.key?.participant || m.sender || from;
  const isGroup = from?.endsWith('@g.us') || m.isGroup;
  
  if (!isGroup) {
    return await sock.sendMessage(from, { 
      text: '❌ Ye command sirf groups mein kaam karti hai!' 
    });
  }

  // Check if message has sticker
  if (!m.message?.stickerMessage) {
    return await sock.sendMessage(from, { 
      text: '❌ Is command ke saath sticker bhejo!\n\n*Usage:* .setcmd kick (sticker ke saath)' 
    });
  }

  if (!args.length) {
    return await sock.sendMessage(from, { 
      text: '❌ Command specify karo!\n\n*Examples:*\n• .setcmd kick\n• .setcmd promote\n• .setcmd demote\n• .setcmd mute' 
    });
  }

  const command = args.join(' ').toLowerCase();
  const stickerId = m.message.stickerMessage.fileSha256?.toString('hex');

  if (!stickerId) {
    return await sock.sendMessage(from, { 
      text: '❌ Sticker ID nahi mil saka! Dobara try karo.' 
    });
  }

  // Store sticker command
  db.setStickerCmd(stickerId, command, sock.user.id.replace(/[^0-9]/g, ''));

  await sock.sendMessage(from, { 
    text: `✅ Sticker command set kar diya gya!\n\n📌 *Sticker ID:* ${stickerId.substring(0, 12)}...\n⚡ *Command:* ${command}\n\nAb is sticker ko bhejne se "${command}" command execute hogi.` 
  });
};

const getStickerCommand = async (sock, m, args) => {
  const from = m.key?.remoteJid || m.from;
  const sender = m.key?.participant || m.sender || from;
  const isGroup = from?.endsWith('@g.us') || m.isGroup;
  
  if (!isGroup) {
    return await sock.sendMessage(from, { 
      text: '❌ Ye command sirf groups mein kaam karti hai!' 
    });
  }

  const stickerCmds = db.getAllStickerCmds(sock.user.id.replace(/[^0-9]/g, ''));
  
  if (!Object.keys(stickerCmds).length) {
    return await sock.sendMessage(from, { 
      text: '❌ Koi sticker commands set nahi hain!' 
    });
  }

  let text = '📋 *Sticker Commands List:*\n\n';
  let count = 1;
  
  for (const [stickerId, command] of Object.entries(stickerCmds)) {
    text += `${count}. 🎯 ${command}\n   ID: ${stickerId.substring(0, 12)}...\n\n`;
    count++;
  }

  text += `📊 *Total Commands:* ${Object.keys(stickerCmds).length}`;

  await sock.sendMessage(from, { text });
};

const deleteStickerCommand = async (sock, m, args) => {
  const from = m.key?.remoteJid || m.from;
  const sender = m.key?.participant || m.sender || from;
  const isGroup = from?.endsWith('@g.us') || m.isGroup;
  
  if (!isGroup) {
    return await sock.sendMessage(from, { 
      text: '❌ Ye command sirf groups mein kaam karti hai!' 
    });
  }

  // Check if message has sticker
  if (!m.message?.stickerMessage) {
    return await sock.sendMessage(from, { 
      text: '❌ Is command ke saath sticker bhejo jiska command delete karna hai!\n\n*Usage:* .delcmd (sticker ke saath)' 
    });
  }

  const stickerId = m.message.stickerMessage.fileSha256?.toString('hex');

  if (!stickerId) {
    return await sock.sendMessage(from, { 
      text: '❌ Sticker ID nahi mil saka! Dobara try karo.' 
    });
  }

  const existingCmd = db.getStickerCmd(stickerId, sock.user.id.replace(/[^0-9]/g, ''));
  
  if (!existingCmd) {
    return await sock.sendMessage(from, { 
      text: '❌ Is sticker ka koi command set nahi hai!' 
    });
  }

  // Delete sticker command
  const deleted = db.delStickerCmd(stickerId, sock.user.id.replace(/[^0-9]/g, ''));

  if (deleted) {
    await sock.sendMessage(from, { 
      text: `✅ Sticker command delete kar diya gya!\n\n🗑️ *Deleted Command:* ${existingCmd}` 
    });
  } else {
    await sock.sendMessage(from, { 
      text: '❌ Command delete karne mein masla aaya!' 
    });
  }
};

// ─── Execute Sticker Command ─────────────────────────────

const executeStickerCommand = async (sock, m) => {
  const from = m.key?.remoteJid || m.from;
  const sender = m.key?.participant || m.sender || from;
  const isGroup = from?.endsWith('@g.us') || m.isGroup;
  const message = m.message;
  
  if (!isGroup || !message?.stickerMessage) return;

  const stickerId = message.stickerMessage.fileSha256?.toString('hex');
  if (!stickerId) return;

  const command = db.getStickerCmd(stickerId, sock.user.id.replace(/[^0-9]/g, ''));
  if (!command) return;

  // Get group metadata for admin checks
  const groupMeta = await sock.groupMetadata(from);
  const senderIsAdmin = groupMeta.participants.find(p => p.id === sender)?.admin;
  const botIsAdmin = groupMeta.participants.find(p => p.id === sock.user.id)?.admin;

  // Execute different commands based on stored command
  try {
    switch (command) {
      case 'kick':
        if (!senderIsAdmin || !botIsAdmin) {
          return await sock.sendMessage(from, { 
            text: '❌ Kick karne ke liye admin hona zaroori hai!' 
          });
        }
        // Get mentioned users or reply to message
        const mentionedUsers = getMentions(m);
        if (mentionedUsers.length === 0 && m.message?.extendedTextMessage?.contextInfo?.participant) {
          mentionedUsers.push(m.message.extendedTextMessage.contextInfo.participant);
        }
        
        if (mentionedUsers.length === 0) {
          return await sock.sendMessage(from, { 
            text: '❌ Kick karne ke liye user mention karo ya uske message ko reply karo!' 
          });
        }

        for (const user of mentionedUsers) {
          if (user === sock.user.id) continue;
          await sock.groupParticipantsUpdate(from, [user], 'remove');
        }
        
        await sock.sendMessage(from, { 
          text: `✅ ${mentionedUsers.length} users kick kar diye gaye!` 
        });
        break;

      case 'promote':
        if (!senderIsAdmin || !botIsAdmin) {
          return await sock.sendMessage(from, { 
            text: '❌ Promote karne ke liye admin hona zaroori hai!' 
          });
        }
        const promoteUsers = getMentions(m);
        if (promoteUsers.length === 0 && m.message?.extendedTextMessage?.contextInfo?.participant) {
          promoteUsers.push(m.message.extendedTextMessage.contextInfo.participant);
        }
        
        if (promoteUsers.length === 0) {
          return await sock.sendMessage(from, { 
            text: '❌ Promote karne ke liye user mention karo ya uske message ko reply karo!' 
          });
        }

        for (const user of promoteUsers) {
          await sock.groupParticipantsUpdate(from, [user], 'promote');
        }
        
        await sock.sendMessage(from, { 
          text: `✅ ${promoteUsers.length} users promote kar diye gaye!` 
        });
        break;

      case 'demote':
        if (!senderIsAdmin || !botIsAdmin) {
          return await sock.sendMessage(from, { 
            text: '❌ Demote karne ke liye admin hona zaroori hai!' 
          });
        }
        const demoteUsers = getMentions(m);
        if (demoteUsers.length === 0 && m.message?.extendedTextMessage?.contextInfo?.participant) {
          demoteUsers.push(m.message.extendedTextMessage.contextInfo.participant);
        }
        
        if (demoteUsers.length === 0) {
          return await sock.sendMessage(from, { 
            text: '❌ Demote karne ke liye user mention karo ya uske message ko reply karo!' 
          });
        }

        for (const user of demoteUsers) {
          await sock.groupParticipantsUpdate(from, [user], 'demote');
        }
        
        await sock.sendMessage(from, { 
          text: `✅ ${demoteUsers.length} users demote kar diye gaye!` 
        });
        break;

      case 'mute':
        if (!senderIsAdmin || !botIsAdmin) {
          return await sock.sendMessage(from, { 
            text: '❌ Mute karne ke liye admin hona zaroori hai!' 
          });
        }
        
        db.setMute(from, true, sock.user.id.replace(/[^0-9]/g, ''));
        await sock.sendMessage(from, { 
          text: '✅ Group mute kar diya gya!' 
        });
        break;

      case 'unmute':
        if (!senderIsAdmin || !botIsAdmin) {
          return await sock.sendMessage(from, { 
            text: '❌ Unmute karne ke liye admin hona zaroori hai!' 
          });
        }
        
        db.setMute(from, false, sock.user.id.replace(/[^0-9]/g, ''));
        await sock.sendMessage(from, { 
          text: '✅ Group unmute kar diya gya!' 
        });
        break;

      default:
        await sock.sendMessage(from, { 
          text: `⚠️ Unknown command: ${command}` 
        });
    }
  } catch (error) {
    console.error('Error executing sticker command:', error);
    await sock.sendMessage(from, { 
      text: '❌ Command execute karne mein masla aaya!' 
    });
  }
};

module.exports = {
  setStickerCommand,
  getStickerCommand,
  deleteStickerCommand,
  executeStickerCommand
};
