'use strict';

const db = require('../database/db');
const logger = require('./logger');

const MAX_WARNS = 3;

const CHANNEL_LINK_PATTERNS = [
  /(?:https?:\/\/)?(?:www\.)?whatsapp\.com\/channel\/[a-zA-Z0-9_-]+/i,
  /(?:https?:\/\/)?wa\.me\/channel\/[a-zA-Z0-9_-]+/i,
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const displayNumber = (jid = '') => String(jid).split('@')[0].split(':')[0];

function stringifySafe(value) {
  try {
    return JSON.stringify(value || {});
  } catch {
    return '';
  }
}

function hasChannelLink(text) {
  const value = String(text || '');
  return CHANNEL_LINK_PATTERNS.some((pattern) => pattern.test(value));
}

function hasNewsletterMeta(msg) {
  const key = msg?.key || {};
  if (String(key.remoteJid || '').endsWith('@newsletter')) return true;
  if (String(key.participant || '').endsWith('@newsletter')) return true;

  const raw = stringifySafe(msg?.message);
  return raw.includes('@newsletter') ||
    raw.includes('newsletterJid') ||
    raw.includes('forwardedNewsletterMessageInfo');
}

function isChannelMessage(msg, body = '') {
  return hasNewsletterMeta(msg) || hasChannelLink(body) || hasChannelLink(stringifySafe(msg?.message));
}

async function deleteMessage(sock, from, msg, sender) {
  await sleep(300);
  await sock.sendMessage(from, {
    delete: {
      remoteJid: from,
      fromMe: false,
      id: msg.key.id,
      participant: msg.key.participant || sender,
    },
  });
}

async function warnUser(sock, from, sender, cleanBot) {
  const warnKey = `${from}:${sender}`;
  const warns = db.addWarn(warnKey, cleanBot);

  await sock.sendMessage(from, {
    text: `┏━━〔 *Anti-Channel Alert* 〕━━┓

@${displayNumber(sender)} paaji, channel forward ethe na pao.
Eh group ae, TV da cable network nahi.

*Warning Meter:* ${warns}/${MAX_WARNS}
┗━━━━━━━━━━━━━━━━┛`,
    mentions: [sender],
  });

  if (warns >= MAX_WARNS) {
    await sock.groupParticipantsUpdate(from, [sender], 'remove');
    await sock.sendMessage(from, {
      text: `┏━━〔 *Member Removed* 〕━━┓

@${displayNumber(sender)} channel badalde badalde group ton hi bahar ho gaye.
*Warnings:* ${MAX_WARNS}/${MAX_WARNS}

┗━━━━━━━━━━━━━━┛`,
      mentions: [sender],
    });
  }
  return;

  await sock.sendMessage(from, {
    text: `📺 *Channel Remote Confiscated!*\n\n@${displayNumber(sender)}, WhatsApp channel links/forwards yahan allowed nahi hain.\nGroup chat hai, TV broadcast room nahi.\n\n⚠️ *Warnings:* ${warns}/${MAX_WARNS}`,
    mentions: [sender],
  });

  if (warns >= MAX_WARNS) {
    await sock.groupParticipantsUpdate(from, [sender], 'remove');
    await sock.sendMessage(from, {
      text: `🚫 @${displayNumber(sender)} channel switching zyada ho gayi. ${MAX_WARNS}/${MAX_WARNS} warnings complete, ab break time.`,
      mentions: [sender],
    });
  }
}

async function applyAction(sock, msg, from, sender, cleanBot, action) {
  if (action === 'warn') {
    await warnUser(sock, from, sender, cleanBot);
    return;
  }

  if (action === 'warndelete') {
    await deleteMessage(sock, from, msg, sender);
    await warnUser(sock, from, sender, cleanBot);
    return;
  }

  if (action === 'kick') {
    await deleteMessage(sock, from, msg, sender);
    await sock.groupParticipantsUpdate(from, [sender], 'remove');
    return;
  }

  await deleteMessage(sock, from, msg, sender);
}

async function checkAntiChannel(sock, msg, from, sender, body, botNum, isOwner) {
  if (!from?.endsWith('@g.us')) return false;
  if (msg.key?.fromMe || isOwner) return false;

  const cleanBot = String(botNum || '').replace(/[^0-9]/g, '');
  if (!db.isAntiChannel(from, cleanBot)) return false;
  if (!isChannelMessage(msg, body)) return false;

  const action = db.getAntiChannelAction(from, cleanBot);
  const target = msg.key.participant || sender || msg.key.remoteJid;

  setTimeout(async () => {
    try {
      await applyAction(sock, msg, from, target, cleanBot, action);
    } catch (err) {
      logger.error('Anti-channel action error:', err?.message || err);
    }
  }, 100);

  return true;
}

module.exports = { hasChannelLink, isChannelMessage, checkAntiChannel };
