// ============================================
//      Prince Md — COMMANDS/LOCKCHAT.JS
//      Lock Chat Command - User Chat Lock
// ============================================

'use strict';

const { authMiddleware } = require('../middleware/auth');
const { toSmallCaps } = require('../utils/fonts');
const { getMentions } = require('../utils/helpers');
const db = require('../database/db');

const lockNoticeCooldown = new Map();
const LOCK_NOTICE_COOLDOWN_MS = 30000;

const getDisplayId = (jid = '') => String(jid).split('@')[0].split(':')[0];

const getParticipantAliases = async (sock, groupJid, jid) => {
  const aliases = new Set([jid].filter(Boolean));
  const base = getDisplayId(jid);

  try {
    const meta = await sock.groupMetadata(groupJid);
    const match = meta.participants.find((p) => {
      const ids = [p.id, p.lid].filter(Boolean);
      return ids.some((candidate) => candidate === jid || getDisplayId(candidate) === base);
    });

    if (match?.id) aliases.add(match.id);
    if (match?.lid) aliases.add(match.lid);
  } catch {}

  return [...aliases];
};

const checkLockedChat = async (sock, msg, from, sender, botNum, isOwner = false) => {
  if (!from?.endsWith('@g.us')) return false;
  if (!sender || msg.key?.fromMe || isOwner) return false;

  const cleanBotNum = botNum.replace(/[^0-9]/g, '');
  const senderAliases = await getParticipantAliases(sock, from, sender);
  const locked = senderAliases.some((jid) => db.isChatLocked(from, jid, cleanBotNum));
  if (!locked) return false;

  try {
    await sock.sendMessage(from, {
      delete: {
        remoteJid: from,
        fromMe: false,
        id: msg.key.id,
        participant: msg.key.participant || sender,
      },
    });

  } catch (error) {
    console.log('[LOCKCHAT ENFORCE ERROR]', error?.message || error);
  }

  return true;
};

// ─── .lockchat ────────────────────────────────────────────
const lockchat = async (ctx) => {
  const { sock, msg, from, sender, args, react, botNum, isOwner } = ctx;
  const auth = authMiddleware(ctx);
  
  if (!await auth.requireGroup()) return;
  if (!await auth.requireAdmin()) return;
  if (!await auth.requireBotAdmin()) return;

  // Get target user
  const mentions = getMentions(msg.message);
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant || '';
  const target = mentions[0] || quotedParticipant || (args[0] ? (args[0].includes('@') ? args[0] : `${args[0].replace(/[^0-9]/g,'')}@s.whatsapp.net`) : null);

  if (!target) {
    return ctx.reply(`❌ *${toSmallCaps('tag reply or provide a number to lock chat')}!*\n\n*Example:* .lockchat @user\n*Example:* .lockchat 923001234567`);
  }

  // Don't lock bot or owner
  const botDigits = botNum.replace(/[^0-9]/g, '').split(':')[0];
  const targetDigits = target.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
  
  if (targetDigits === botDigits) {
    return ctx.reply(`❌ *${toSmallCaps("i can't lock myself")}* 😄`);
  }

  const cleanBotNum = botNum.replace(/[^0-9]/g, '');
  const mainOwner = (db.getMainOwner(cleanBotNum) || '').replace(/[^0-9]/g, '');
  const secondOwners = (db.getSecondOwners(cleanBotNum) || []).map(o => o.replace(/[^0-9]/g, ''));

  if (targetDigits === mainOwner || secondOwners.includes(targetDigits)) {
    return ctx.reply(`❌ *${toSmallCaps("i can't lock my owner")}* 😄`);
  }

  try {
    // Store lock in database
    db.setChatLock(from, target, true, cleanBotNum);
    
    await ctx.reply(`🔒 *${toSmallCaps('chat locked successfully')}*\n\n👤 *${toSmallCaps('user')}:* ${target.split('@')[0]}\n🔐 *${toSmallCaps('status')}:* ${toSmallCaps('locked')}\n\n⚠️ *${toSmallCaps('user can no longer send messages')}*`);
    
  } catch (error) {
    console.log('[LOCKCHAT ERROR]', error);
    await ctx.reply(`❌ *${toSmallCaps('failed to lock chat')}*\n\n${toSmallCaps('try again later')}`);
  }
};

// ─── .unlockchat ────────────────────────────────────────────
const unlockchat = async (ctx) => {
  const { sock, msg, from, sender, args, react, botNum, isOwner } = ctx;
  const auth = authMiddleware(ctx);
  
  if (!await auth.requireGroup()) return;
  if (!await auth.requireAdmin()) return;
  if (!await auth.requireBotAdmin()) return;

  // Get target user
  const mentions = getMentions(msg.message);
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant || '';
  const target = mentions[0] || quotedParticipant || (args[0] ? (args[0].includes('@') ? args[0] : `${args[0].replace(/[^0-9]/g,'')}@s.whatsapp.net`) : null);

  if (!target) {
    return ctx.reply(`❌ *${toSmallCaps('tag reply or provide a number to unlock chat')}!*\n\n*Example:* .unlockchat @user\n*Example:* .unlockchat 923001234567`);
  }

  try {
    const cleanBotNum = botNum.replace(/[^0-9]/g, '');
    const targetAliases = await getParticipantAliases(sock, from, target);
    // Remove lock from database
    const unlocked = targetAliases.some((jid) => db.removeChatLock(from, jid, cleanBotNum));
    
    if (unlocked) {
      await ctx.reply(`🔓 *${toSmallCaps('chat unlocked successfully')}*\n\n👤 *${toSmallCaps('user')}:* ${target.split('@')[0]}\n🔐 *${toSmallCaps('status')}:* ${toSmallCaps('unlocked')}\n\n✅ *${toSmallCaps('user can now send messages')}*`);
    } else {
      await ctx.reply(`❌ *${toSmallCaps('no lock found for this user')}*`);
    }
    
  } catch (error) {
    console.log('[UNLOCKCHAT ERROR]', error);
    await ctx.reply(`❌ *${toSmallCaps('failed to unlock chat')}*\n\n${toSmallCaps('try again later')}`);
  }
};

// ─── .lockedusers ────────────────────────────────────────────
const lockedusers = async (ctx) => {
  const { sock, msg, from, react, botNum, isOwner } = ctx;
  const auth = authMiddleware(ctx);
  
  if (!await auth.requireGroup()) return;
  if (!await auth.requireAdmin()) return;

  try {
    const lockedUsers = db.getLockedUsers(from, botNum.replace(/[^0-9]/g, ''));
    
    if (!lockedUsers || lockedUsers.length === 0) {
      return ctx.reply(`📋 *${toSmallCaps('no locked users in this group')}*`);
    }

    let text = `🔒 *${toSmallCaps('locked users list')}*\n\n`;
    lockedUsers.forEach((user, index) => {
      text += `${index + 1}. 👤 ${user}\n`;
    });
    
    text += `\n📊 *${toSmallCaps('total locked')}:* ${lockedUsers.length}`;
    
    await ctx.reply(text);
    
  } catch (error) {
    console.log('[LOCKEDUSERS ERROR]', error);
    await ctx.reply(`❌ *${toSmallCaps('failed to get locked users')}*`);
  }
};

module.exports = {
  lockchat,
  unlockchat,
  lockedusers,
  checkLockedChat
};
