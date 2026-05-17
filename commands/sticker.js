'use strict';

const fs     = require('fs');
const path   = require('path');
const axios  = require('axios');
const { toSmallCaps } = require('../utils/fonts');
const logger = require('../utils/logger');
const db     = require('../database/db');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { hasChannelLink } = require('../utils/antichannel');
const sharp = require('sharp');

// ─── Helper: get media buffer from msg ────────
const getMediaBuffer = async (msg) => {
  const message  = msg.message || {};
  const type     = Object.keys(message)[0];
  const mediaTypes = ['imageMessage','videoMessage','documentMessage','audioMessage','stickerMessage'];

  if (mediaTypes.includes(type)) {
    try { return await downloadMediaMessage(msg, 'buffer', {}); } catch { return null; }
  }

  const ctxInfo = message?.extendedTextMessage?.contextInfo
               || message?.[type]?.contextInfo
               || {};
  const quoted  = ctxInfo?.quotedMessage;
  if (quoted) {
    const qType = Object.keys(quoted)[0];
    if (mediaTypes.includes(qType)) {
      try {
        const fakeMsg = {
          key:     { ...msg.key, id: ctxInfo.stanzaId || msg.key.id },
          message: quoted,
        };
        return await downloadMediaMessage(fakeMsg, 'buffer', {});
      } catch { return null; }
    }
  }
  return null;
};

// ─── .sticker ─────────────────────────────────
const sticker = async (ctx) => {
  const { sock, from, msg, react } = ctx;
  await react('⏳');

  try {
    const buffer = await getMediaBuffer(msg);
    if (!buffer) {
      await react('❌');
      return ctx.reply('❌ *Send or quote an image/video to convert to sticker!*');
    }

    // Sticker Creation (Using sharp for consistency)
    let stickerBuf = buffer;
    try {
        stickerBuf = await sharp(buffer)
          .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .webp({ quality: 90 })
          .toBuffer();
    } catch { stickerBuf = buffer; }

    await sock.sendMessage(from, {
      sticker:  stickerBuf,
      mimetype: 'image/webp',
      packName: '🇦 🇩 🇪 🇪 🇱  🇩 🇪 🇻™', // Yeh sticker par dikhega
      author:   '🇦 🇩 🇪 🇪 🇱  🇩 🇪 🇻™'  // Yeh sticker par dikhega
    }, { quoted: msg });

    await react('✅');
  } catch (err) {
    logger.error('Sticker error:', err.message);
    await react('❌');
    await ctx.reply('❌ *Failed to create sticker!*');
  }
};

// ─── .toimg ───────────────────────────────────
const toimg = async (ctx) => {
  const { sock, from, msg, react } = ctx;
  await react('⏳');

  try {
    const buffer = await getMediaBuffer(msg);
    if (!buffer) {
      await react('❌');
      return ctx.reply('❌ *Send or quote a sticker!*');
    }

    await sock.sendMessage(from, {
      image:   buffer,
      caption: `🖼️ *${toSmallCaps('sticker to image')}*\n_${toSmallCaps('by Prince Md')}_`,
    }, { quoted: msg });

    await react('✅');
  } catch (err) {
    logger.error('toimg error:', err.message);
    await react('❌');
    await ctx.reply('❌ *Failed!*');
  }
};

// ─── .stickerinfo ─────────────────────────────
const stickerinfo = async (ctx) => {
  const { msg, react, sock, from } = ctx;
  await react('ℹ️');
  try {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const direct = msg.message;
    const stk = quoted?.stickerMessage || direct?.stickerMessage;
    
    if (!stk) return ctx.reply('❌ *Send or quote a sticker first!*');
    
    const text =
`🎨 *${toSmallCaps('sticker info')}*

📦 *Pack:* ${stk.stickerPackName || 'N/A'}
✍️ *Author:* ${stk.stickerPackPublisher || 'N/A'}
🆔 *ID:* ${stk.fileSha256 ? Buffer.from(stk.fileSha256).toString('hex').slice(0,16) : 'N/A'}
📐 *Size:* ${stk.fileLength || 'N/A'} bytes`;
    await sock.sendMessage(from, { text }, { quoted: msg });
  } catch { await ctx.reply('❌ *Failed!*'); }
};

// ─── .antisticker ──────────────────────────────
const antisticker = async (ctx) => {
  const { sock, from, msg, react, isAdmin, isGroup } = ctx;
  await react('⏳');
  
  try {
    if (!isAdmin) {
      await react('❌');
      return ctx.reply('❌ *Only admins can use this command!*');
    }
    
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const direct = msg.message;
    const stickerMsg = quoted?.stickerMessage || direct?.stickerMessage;
    
    if (!stickerMsg) {
      await react('❌');
      return ctx.reply('❌ *Reply to a sticker to delete it!*');
    }
    
    // Get the actual message ID - either from quoted or direct sticker
    let messageId, participant;
    
    if (quoted) {
      // When replying to a sticker
      messageId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
      participant = msg.message?.extendedTextMessage?.contextInfo?.participant;
    } else {
      // When the message itself is a sticker (direct)
      messageId = msg.key.id;
      participant = msg.key.participant || msg.key.remoteJid;
    }
    
    if (!messageId) {
      await react('❌');
      return ctx.reply('❌ *Cannot find the sticker message ID!*');
    }
    
    // Use setTimeout to ensure message is fully stored before deletion
    setTimeout(async () => {
      try {
        await sock.sendMessage(from, { 
          delete: {
            remoteJid: from,
            fromMe: false,
            id: messageId,
            participant: participant
          }
        });
      } catch (err) {
        logger.error('Sticker delete execution error:', err.message);
      }
    }, 500);
    
    await react('✅');
    await ctx.reply('🗑️ *Sticker deleted!*');
    
  } catch (err) {
    logger.error('Anti-sticker error:', err.message);
    await react('❌');
    await ctx.reply('❌ *Failed to delete sticker!*');
  }
};

// ─── Auto Sticker Delete (Message Handler) ─────
const autoStickerDelete = async (ctx) => {
  const { sock, from, msg, isGroup, botNum } = ctx;
  const cleanBot = botNum.replace(/[^0-9]/g, '');

  if (!isGroup || !msg.message?.stickerMessage) return;
  if (!db.isAntiSticker(from, cleanBot)) return;
  if (msg.key.fromMe) return;

  const action = db.getAntiStickerAction(from, cleanBot);
  const sender = msg.key.participant || msg.key.remoteJid;
  const warnKey = `${from}:${sender}`;

  const deleteMessage = async () => {
    await sock.sendMessage(from, {
      delete: {
        remoteJid: from,
        fromMe: false,
        id: msg.key.id,
        participant: sender
      }
    });
  };

  const warnUser = async () => {
    const warns = db.addWarn(warnKey, cleanBot);
    const maxWarns = 3;
    await sock.sendMessage(from, {
      text: `⚠️ *Anti-sticker warning*\n\n@${sender.split('@')[0]} stickers are not allowed in this group.\n\nWarnings: ${warns}/${maxWarns}`,
      mentions: [sender]
    });

    if (warns >= maxWarns) {
      try {
        await sock.groupParticipantsUpdate(from, [sender], 'remove');
        await sock.sendMessage(from, {
          text: `🚫 @${sender.split('@')[0]} has been removed after reaching ${maxWarns} warnings.`,
          mentions: [sender]
        });
      } catch (err) {
        logger.error('Anti-sticker kick error:', err.message);
      }
    }
  };

  try {
    setTimeout(async () => {
      try {
        if (action === 'warn') {
          await warnUser();
        } else if (action === 'warndelete') {
          await deleteMessage();
          await warnUser();
        } else if (action === 'kick') {
          await deleteMessage();
          await sock.groupParticipantsUpdate(from, [sender], 'remove');
        } else {
          await deleteMessage();
        }
      } catch (err) {
        logger.error('Auto sticker delete error:', err.message);
      }
    }, 1000);
  } catch (err) {
    logger.error('Auto sticker delete setup error:', err.message);
  }
};

// ─── Auto Channel Delete (Message Handler) ─────
const autoChannelDelete = async (ctx) => {
  const { sock, from, msg, isGroup, botNum, body } = ctx;
  const cleanBot = botNum.replace(/[^0-9]/g, '');

  if (!isGroup) return;
  if (!db.isAntiChannel(from, cleanBot)) return;
  if (msg.key.fromMe) return;

  const sender = msg.key.participant || msg.key.remoteJid;
  const containsChannel = msg.key?.participant?.endsWith('@newsletter') || hasChannelLink(body || '');
  if (!containsChannel) return;

  const action = db.getAntiChannelAction(from, cleanBot);
  const warnKey = `${from}:${sender}`;

  const deleteMessage = async () => {
    await sock.sendMessage(from, {
      delete: {
        remoteJid: from,
        fromMe: false,
        id: msg.key.id,
        participant: sender
      }
    });
  };

  const warnUser = async () => {
    const warns = db.addWarn(warnKey, cleanBot);
    const maxWarns = 3;
    await sock.sendMessage(from, {
      text: `⚠️ *Anti-channel warning*\n\n@${sender.split('@')[0]} channel messages are not allowed in this group.\n\nWarnings: ${warns}/${maxWarns}`,
      mentions: [sender]
    });

    if (warns >= maxWarns) {
      try {
        await sock.groupParticipantsUpdate(from, [sender], 'remove');
        await sock.sendMessage(from, {
          text: `🚫 @${sender.split('@')[0]} has been removed after reaching ${maxWarns} warnings.`,
          mentions: [sender]
        });
      } catch (err) {
        logger.error('Auto channel kick error:', err.message);
      }
    }
  };

  try {
    setTimeout(async () => {
      try {
        if (action === 'warn') {
          await warnUser();
        } else if (action === 'warndelete') {
          await deleteMessage();
          await warnUser();
        } else if (action === 'kick') {
          await deleteMessage();
          await sock.groupParticipantsUpdate(from, [sender], 'remove');
        } else {
          await deleteMessage();
        }
      } catch (err) {
        logger.error('Auto channel delete error:', err.message);
      }
    }, 1000);
  } catch (err) {
    logger.error('Auto channel delete setup error:', err.message);
  }
};

// ─── .antichannel ───────────────────────────────
const antichannel = async (ctx) => {
  const { sock, from, msg, react, isAdmin, isGroup } = ctx;
  await react('⏳');
  
  try {
    if (!isAdmin) {
      await react('❌');
      return ctx.reply('❌ *Only admins can use this command!*');
    }
    
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const direct = msg.message;
    
    // Check if quoted message is from a channel
    const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const isChannelMessage = quotedParticipant?.endsWith('@newsletter');
    
    if (!isChannelMessage) {
      await react('❌');
      return ctx.reply('❌ *Reply to a channel message to delete it!*');
    }
    
    const quotedKey = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
    if (!quotedKey) {
      await react('❌');
      return ctx.reply('❌ *Cannot find the channel message to delete!*');
    }
    
    await sock.sendMessage(from, { 
      delete: {
        remoteJid: from,
        fromMe: false,
        id: quotedKey,
        participant: quotedParticipant
      }
    });
    
    await react('✅');
    await ctx.reply('🗑️ *Channel message deleted successfully!*');
    
  } catch (err) {
    logger.error('Anti-channel error:', err.message);
    await react('❌');
    await ctx.reply('❌ *Failed to delete channel message!*');
  }
};

// ─── .emojimix ────────────────────────────────
const emojimix = async (ctx) => {
  const { sock, from, msg, args, react } = ctx;
  await react('⏳');
  try {
    const text = args.join(' ');
    const ems = text.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu);
    
    if (!ems || ems.length < 2) return ctx.reply('❌ *Provide 2 emojis!*\n_Usage: `.emojimix 😂 😭`_');
    
    const url = `https://www.gstatic.com/android/keyboard/emojikitchen/20201001/${encodeURIComponent(ems[0])}/${encodeURIComponent(ems[0])}_${encodeURIComponent(ems[1])}.png`;
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    
    let stickerBuf = Buffer.from(res.data);
    try {
        stickerBuf = await sharp(stickerBuf)
          .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .webp({ quality: 90 }).toBuffer();
    } catch {}
    
    await sock.sendMessage(from, { 
        sticker: stickerBuf, 
        mimetype: 'image/webp',
        packName: '🇦 🇩 🇪 🇪 🇱  🇩 🇪 🇻™',
        author: '🇦 🇩 🇪 🇪 🇱  🇩 🇪 🇻™' 
    }, { quoted: msg });
    
    await react('✅');
  } catch (err) {
    await react('❌');
    await ctx.reply('❌ *Failed! Try different emojis.*');
  }
};

module.exports = { sticker, toimg, stickerinfo, emojimix, antisticker, autoStickerDelete, antichannel, autoChannelDelete };