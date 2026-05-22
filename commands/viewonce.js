// ============================================
//      Prince Md — COMMANDS/VIEWONCE.JS
//      ViewOnce Media Bypass
// ============================================

'use strict';

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { toSmallCaps } = require('../utils/fonts');
const db = require('../database/db');
const { getOwnerJid } = require('../utils/ownerTarget');

const vv = async (ctx) => {
  const { sock, msg, sender, from, botNum } = ctx;

  try {
    const message = msg.message || {};
    const quoted = message.extendedTextMessage?.contextInfo?.quotedMessage || 
                   message.imageMessage?.contextInfo?.quotedMessage || 
                   message.videoMessage?.contextInfo?.quotedMessage;

    if (!quoted) {
      return ctx.reply(`❌ *${toSmallCaps('reply to a view-once image/video/audio and type .vv')}*`);
    }

    // ViewOnce message unwrap
    const voContent = quoted.viewOnceMessageV2?.message ||
                      quoted.viewOnceMessage?.message ||
                      quoted.ephemeralMessage?.message ||
                      quoted;

    const imgMsg = voContent.imageMessage;
    const vidMsg = voContent.videoMessage;
    const audMsg = voContent.audioMessage;

    if (!imgMsg && !vidMsg && !audMsg) {
      return ctx.reply(`❌ *${toSmallCaps('no view-once media found')}!*`);
    }

    const mediaType = imgMsg ? 'image' : (vidMsg ? 'video' : 'audio');
    const mediaMsg  = imgMsg || vidMsg || audMsg;

    const stream = await downloadContentFromMessage(mediaMsg, mediaType);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    if (!buffer || buffer.length < 500) {
      return ctx.reply(`❌ *${toSmallCaps('media expired or unavailable')}!*`);
    }

    const targetJid = getOwnerJid(botNum);
    if (!targetJid) return ctx.reply(`❌ *${toSmallCaps('owner dm not configured')}*`);

    await new Promise(resolve => setTimeout(resolve, 2000));

    if (mediaType === 'image') {
      await sock.sendMessage(targetJid, { image: buffer, caption: `👁️ *${toSmallCaps('view once bypassed')}*` });
    } else if (mediaType === 'video') {
      await sock.sendMessage(targetJid, { video: buffer, caption: `👁️ *${toSmallCaps('view once bypassed')}*`, mimetype: 'video/mp4' });
    } else if (mediaType === 'audio') {
      await sock.sendMessage(targetJid, { audio: buffer, mimetype: 'audio/mp4', ptt: true });
    }

  } catch (err) {
    console.log('[VV ERROR]', err.message);
    await ctx.reply(`❌ *${toSmallCaps('failed')}!*\n_${toSmallCaps('reply to a view-once message')}_`);
  }
};

// 🎯 ViewOnce auto-reply - sends message and reaction to owner DM
const handleViewOnceAutoReply = async (ctx) => {
  const { sock, msg, from, sender, isGroup, botNum } = ctx;

  try {
    const message = msg.message || {};
    const voContent = message.viewOnceMessageV2?.message ||
                      message.viewOnceMessage?.message ||
                      message.ephemeralMessage?.message;

    if (!voContent) return; // Not a viewonce message

    const imgMsg = voContent.imageMessage;
    const vidMsg = voContent.videoMessage;
    const audMsg = voContent.audioMessage;

    if (!imgMsg && !vidMsg && !audMsg) return; // No media found

    // 🎭 Nice reactions array
    const reactions = ['😍', '🤩', '😊', '😘', '💕', '🥰', '✨', '🎉', '🌟', '💖'];
    const niceWords = ['nice', 'wow', 'mashaallah', 'super cute', 'amazing', 'beautiful', 'stunning', 'gorgeous', 'perfect', 'lovely'];
    
    // Random selection
    const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
    const randomNiceWord = niceWords[Math.floor(Math.random() * niceWords.length)];
    
    // 🚀 Download and forward ViewOnce message to user's DM
    const mediaType = imgMsg ? 'image' : (vidMsg ? 'video' : 'audio');
    const mediaMsg = imgMsg || vidMsg || audMsg;

    const stream = await downloadContentFromMessage(mediaMsg, mediaType);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    if (buffer && buffer.length > 500) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const targetJid = getOwnerJid(botNum);
      if (!targetJid) return;

      if (mediaType === 'image') {
        await sock.sendMessage(targetJid, { 
          image: buffer, 
          caption: `👁️ *${toSmallCaps('view once message captured')}*\n📩 *Forwarded from:* ${isGroup ? 'Group Chat' : 'Private Chat'}` 
        });
      } else if (mediaType === 'video') {
        await sock.sendMessage(targetJid, { 
          video: buffer, 
          caption: `👁️ *${toSmallCaps('view once message captured')}*\n📩 *Forwarded from:* ${isGroup ? 'Group Chat' : 'Private Chat'}`, 
          mimetype: 'video/mp4' 
        });
      } else if (mediaType === 'audio') {
        await sock.sendMessage(targetJid, { 
          audio: buffer, 
          mimetype: 'audio/mp4', 
          ptt: true 
        });
      }
    }
    
    // 🎯 Send nice reaction to user's DM after message
    await new Promise(resolve => setTimeout(resolve, 500));
    await sock.sendMessage(getOwnerJid(botNum), { 
      text: `${randomReaction} ${randomNiceWord}! 🎨` 
    });

    console.log('[VIEWONCE AUTO-REPLY] Sent message and reaction to user DM:', sender);

  } catch (err) {
    console.log('[VIEWONCE AUTO-REPLY ERROR]', err.message);
  }
};

// 🎯 Handle prefix-less commands in viewonce replies
const handleViewOnceReplyCommand = async (ctx) => {
  const { sock, msg, sender, from, text } = ctx;

  try {
    // Check if this is a reply to a viewonce message
    const message = msg.message || {};
    const quotedMsg = message.extendedTextMessage?.contextInfo?.quotedMessage;
    
    if (!quotedMsg) return; // Not a reply

    const voContent = quotedMsg.viewOnceMessageV2?.message ||
                      quotedMsg.viewOnceMessage?.message ||
                      quotedMsg.ephemeralMessage?.message;

    if (!voContent) return; // Not a viewonce reply

    // 🎯 Check for commands without prefix
    const commandList = ['menu', 'ping', 'alive', 'info', 'uptime', 'speed', 'owner', 'help'];
    const lowerText = text.toLowerCase().trim();
    
    for (const cmd of commandList) {
      if (lowerText === cmd) {
        // Execute command without prefix
        const { handleMessage } = require('../handlers/messageHandler');
        const newCtx = { ...ctx, text: `${config.prefix}${cmd}` };
        await handleMessage(newCtx);
        break;
      }
    }

  } catch (err) {
    console.log('[VIEWONCE COMMAND ERROR]', err.message);
  }
};

module.exports = { 
  vv, 
  handleViewOnceAutoReply
};
