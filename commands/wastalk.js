// ============================================
//      Prince Md — COMMANDS/WASTALK.JS
//      WhatsApp Stalking Commands
// ============================================

'use strict';

const { authMiddleware } = require('../middleware/auth');
const { toSmallCaps } = require('../utils/fonts');
const { getMentions } = require('../utils/helpers');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// ─── .wastalk ────────────────────────────────────────────
const wastalk = async (ctx) => {
  const { sock, msg, from, sender, args, react, botNum, isOwner } = ctx;
  const auth = authMiddleware(ctx);
  
  if (!await auth.requireGroup()) return;
  if (!await auth.requireAdmin()) return;

  // Get target user
  const mentions = getMentions(msg.message);
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant || '';
  const target = mentions[0] || quotedParticipant || (args[0] ? (args[0].includes('@') ? args[0] : `${args[0].replace(/[^0-9]/g,'')}@s.whatsapp.net`) : null);

  if (!target) {
    return ctx.reply(`❌ *${toSmallCaps('tag reply or provide a number to stalk')}!*\n\n*Examples:*\n• .wastalk @user\n• .wastalk 923001234567\n• .wastalk (reply to message)`);
  }

  await ctx.reply(`👤 *${toSmallCaps('stalking whatsapp user')}*...`);

  try {
    // Get user info from WhatsApp
    const userInfo = await sock.fetchStatus(target).catch(() => null);
    const profilePic = await sock.profilePictureUrl(target, 'image').catch(() => null);
    
    // Get user from group participants if in group
    let userInGroup = null;
    if (ctx.isGroup) {
      const groupMeta = await sock.groupMetadata(from).catch(() => null);
      if (groupMeta) {
        userInGroup = groupMeta.participants.find(p => p.id === target);
      }
    }

    // Build stalking report
    let stalkText = `👤 *${toSmallCaps('whatsapp stalking report')}*\n\n`;
    stalkText += `📱 *${toSmallCaps('target')}:* ${target.split('@')[0]}\n`;
    stalkText += `👤 *${toSmallCaps('name')}:* ${msg.pushName || 'Unknown'}\n`;
    
    if (userInGroup) {
      stalkText += `🏷️ *${toSmallCaps('in group')}:* Yes\n`;
      stalkText += `👑 *${toSmallCaps('admin')}:* ${userInGroup.admin ? 'Yes' : 'No'}\n`;
      stalkText += `⏰ *${toSmallCaps('joined')}:* ${userInGroup.joinTime ? new Date(userInGroup.joinTime * 1000).toLocaleString() : 'Unknown'}\n`;
    }
    
    if (userInfo) {
      stalkText += `📝 *${toSmallCaps('status')}:* ${userInfo.status || 'No status'}\n`;
      stalkText += `⏰ *${toSmallCaps('last seen')}:* ${userInfo.setAt ? new Date(userInfo.setAt * 1000).toLocaleString() : 'Unknown'}\n`;
      stalkText += `🔒 *${toSmallCaps('privacy')}:* ${userInfo.presence ? 'Online' : 'Offline/Hidden'}\n`;
    } else {
      stalkText += `📝 *${toSmallCaps('status')}:* Privacy enabled\n`;
      stalkText += `⏰ *${toSmallCaps('last seen')}:* Privacy enabled (Hidden)\n`;
      stalkText += `🔒 *${toSmallCaps('privacy')}:* Last seen hidden\n`;
    }
    
    stalkText += `📸 *${toSmallCaps('profile pic')}:* ${profilePic ? 'Available' : 'Not available'}\n`;
    stalkText += `🔗 *${toSmallCaps('contact')}:* ${target}\n\n`;
    
    stalkText += `> ${toSmallCaps('use .getpp to download profile picture')}`;
    stalkText += `\n> ${toSmallCaps('use .wastatus to view status if available')}`;

    await ctx.reply(stalkText);

    // Send profile picture if available
    if (profilePic) {
      try {
        await sock.sendMessage(from, {
          image: { url: profilePic },
          caption: `📸 *${toSmallCaps('profile picture')}*\n\n👤 *${toSmallCaps('user')}:* ${target.split('@')[0]}\n📱 *${toSmallCaps('whatsapp')}:* ${target}`
        }, { quoted: msg });
      } catch (err) {
        console.log('Profile pic error:', err.message);
      }
    }

  } catch (error) {
    console.log('[WASTALK ERROR]', error.message);
    await ctx.reply(`❌ *${toSmallCaps('stalking failed')}*\n\n${toSmallCaps('user may have privacy settings enabled')}`);
  }
};

// ─── .getpp ────────────────────────────────────────────
const getpp = async (ctx) => {
  const { sock, msg, from, sender, args, react, botNum, isOwner } = ctx;
  const auth = authMiddleware(ctx);
  
  if (!await auth.requireGroup()) return;
  if (!await auth.requireAdmin()) return;

  // Get target user
  const mentions = getMentions(msg.message);
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant || '';
  const target = mentions[0] || quotedParticipant || (args[0] ? (args[0].includes('@') ? args[0] : `${args[0].replace(/[^0-9]/g,'')}@s.whatsapp.net`) : null);

  if (!target) {
    return ctx.reply(`❌ *${toSmallCaps('tag reply or provide a number to get profile picture')}!*\n\n*Examples:*\n• .getpp @user\n• .getpp 923001234567\n• .getpp (reply to message)`);
  }

  await ctx.reply(`📸 *${toSmallCaps('downloading profile picture')}*...`);

  try {
    const profilePic = await sock.profilePictureUrl(target, 'image').catch(() => null);
    
    if (!profilePic) {
      return ctx.reply(`❌ *${toSmallCaps('profile picture not found')}*\n\n${toSmallCaps('user may have privacy settings enabled')}`);
    }

    await sock.sendMessage(from, {
      image: { url: profilePic },
      caption: `📸 *${toSmallCaps('profile picture')}*\n\n👤 *${toSmallCaps('user')}:* ${target.split('@')[0]}\n📱 *${toSmallCaps('whatsapp')}:* ${target}\n⏰ *${toSmallCaps('downloaded')}:* ${new Date().toLocaleString()}\n\n> ${toSmallCaps('downloaded by Prince Md')}`
    }, { quoted: msg });

  } catch (error) {
    console.log('[GETPP ERROR]', error.message);
    await ctx.reply(`❌ *${toSmallCaps('failed to download profile picture')}*\n\n${toSmallCaps('user may have privacy settings enabled')}`);
  }
};

// ─── .wastatus ────────────────────────────────────────────
const wastatus = async (ctx) => {
  const { sock, msg, from, sender, args, react, botNum, isOwner } = ctx;
  const auth = authMiddleware(ctx);
  
  if (!await auth.requireGroup()) return;
  if (!await auth.requireAdmin()) return;

  // Get target user
  const mentions = getMentions(msg.message);
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant || '';
  const target = mentions[0] || quotedParticipant || (args[0] ? (args[0].includes('@') ? args[0] : `${args[0].replace(/[^0-9]/g,'')}@s.whatsapp.net`) : null);

  if (!target) {
    return ctx.reply(`❌ *${toSmallCaps('tag reply or provide a number to view status')}!*\n\n*Examples:*\n• .wastatus @user\n• .wastatus 923001234567\n• .wastatus (reply to message)`);
  }

  await ctx.reply(`📱 *${toSmallCaps('checking whatsapp status')}*...`);

  try {
    // Get user status
    const userInfo = await sock.fetchStatus(target).catch(() => null);
    
    if (!userInfo) {
      return ctx.reply(`❌ *${toSmallCaps('status not found')}*\n\n${toSmallCaps('user may have privacy settings enabled or no status set')}`);
    }

    let statusText = `📱 *${toSmallCaps('whatsapp status')}*\n\n`;
    statusText += `👤 *${toSmallCaps('user')}:* ${target.split('@')[0]}\n`;
    statusText += `📝 *${toSmallCaps('status')}:* ${userInfo.status || 'No status'}\n`;
    statusText += `⏰ *${toSmallCaps('set at')}:* ${userInfo.setAt ? new Date(userInfo.setAt * 1000).toLocaleString() : 'Unknown'}\n`;
    statusText += `📱 *${toSmallCaps('whatsapp')}:* ${target}\n\n`;
    statusText += `> ${toSmallCaps('status retrieved successfully')}`;

    await ctx.reply(statusText);

  } catch (error) {
    console.log('[WASTATUS ERROR]', error.message);
    await ctx.reply(`❌ *${toSmallCaps('failed to get status')}*\n\n${toSmallCaps('user may have privacy settings enabled')}`);
  }
};

module.exports = {
  wastalk,
  getpp,
  wastatus
};
