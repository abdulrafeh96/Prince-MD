'use strict';

const db = require('../database/db');
const logger = require('../utils/logger');

const LINK_PATTERNS = [
  /https?:\/\/[^\s]+/gi,
  /www\.[^\s]+/gi,
  /[a-zA-Z0-9-]+\.(com|net|org|edu|gov|mil|int|biz|info|io|co|me|xyz|site|online|store|tech|tv|blog)/gi,
  /chat\.whatsapp\.com\/[^\s]+/gi,
  /whatsapp\.com\/channel\/[^\s]+/gi,
  /tiktok\.com\/[^\s]+/gi,
  /facebook\.com\/[^\s]+/gi,
  /fb\.watch\/[^\s]+/gi,
  /instagram\.com\/[^\s]+/gi,
  /wa\.me\/[^\s]+/gi,
  /t\.me\/[^\s]+/gi,
  /discord\.gg\/[^\s]+/gi,
  /bit\.ly\/[^\s]+/gi,
  /tinyurl\.com\/[^\s]+/gi,
];

const WA_GROUP_PATTERN = /chat\.whatsapp\.com\/[a-zA-Z0-9]+/gi;
const MAX_WARNS = 3;
const REOPEN_DELAY_MS = 2 * 60 * 1000;
const reopenTimers = new Map();

const displayNumber = (jid = '') => String(jid).split('@')[0].split(':')[0];

const hasLink = (text) => {
  if (!text) return false;
  const str = typeof text === 'string' ? text : JSON.stringify(text);
  return LINK_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(str);
  });
};

const hasWAGroupLink = (text) => {
  if (!text) return false;
  WA_GROUP_PATTERN.lastIndex = 0;
  return WA_GROUP_PATTERN.test(text);
};

async function sendText(sock, from, text, extra = {}) {
  const cleanText = String(text || '').trim();
  if (!cleanText) return;
  await sock.sendMessage(from, { text: cleanText, ...extra });
}

function scheduleReopen(sock, from, cleanBot) {
  const existing = reopenTimers.get(from);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(async () => {
    reopenTimers.delete(from);
    try {
      await sock.groupSettingUpdate(from, 'not_announcement');
      db.setMute(from, false, cleanBot);
      await sendText(sock, from, 'Group opened again after the anti-link lock.');
    } catch (err) {
      logger.error('Anti-link group reopen error:', err?.message || err);
    }
  }, REOPEN_DELAY_MS);

  if (typeof timer.unref === 'function') timer.unref();
  reopenTimers.set(from, timer);
}

async function closeGroup(sock, from, cleanBot) {
  try {
    const alreadyLocked = reopenTimers.has(from);
    if (!alreadyLocked) {
      await sock.groupSettingUpdate(from, 'announcement');
      db.setMute(from, true, cleanBot);
    }
    scheduleReopen(sock, from, cleanBot);
  } catch (err) {
    logger.error('Anti-link group close error:', err?.message || err);
  }
}

async function deleteMessage(sock, msg, from, sender) {
  try {
    await sock.sendMessage(from, {
      delete: {
        remoteJid: from,
        fromMe: false,
        id: msg.key.id,
        participant: msg.key.participant || sender,
      },
    });
  } catch (err) {
    logger.error('Anti-link delete error:', err?.message || err);
  }
}

async function warnUser(sock, from, sender, cleanBot) {
  const warnKey = `${from}:${sender}`;
  const warns = db.addWarn(warnKey, cleanBot);

  await sendText(sock, from, `Anti-Link Alert

@${displayNumber(sender)}, links are not allowed in this group.
The group has been closed for 2 minutes and your message has been removed.

Warnings: ${warns}/${MAX_WARNS}`, { mentions: [sender] });

  if (warns >= MAX_WARNS) {
    await sock.groupParticipantsUpdate(from, [sender], 'remove');
    await sendText(sock, from, `Member Removed

@${displayNumber(sender)} has been removed for repeatedly sending links.
Warnings: ${MAX_WARNS}/${MAX_WARNS}`, { mentions: [sender] });
  }
}

const checkAntiLink = async (sock, msg, from, sender, body, botNum, isProtected) => {
  if (!from?.endsWith('@g.us')) return false;

  const cleanBot = String(botNum || '').replace(/[^0-9]/g, '');
  if (!db.isAntiLink(from, cleanBot)) return false;
  if (isProtected) return false;
  if (!hasLink(body)) return false;

  const target = msg.key.participant || sender;
  const action = db.getAntiLinkAction(from, cleanBot);
  logger.warn(`Anti-link triggered in ${from} by ${target}`);

  try {
    await closeGroup(sock, from, cleanBot);
    await deleteMessage(sock, msg, from, target);

    if (action === 'warn' || action === 'warndelete') {
      await warnUser(sock, from, target, cleanBot);
    } else if (action === 'kick') {
      await sock.groupParticipantsUpdate(from, [target], 'remove');
      await sendText(sock, from, `Member Removed

@${displayNumber(target)} has been removed for sending a link.`, { mentions: [target] });
    } else {
      await sendText(sock, from, 'Anti-Link Alert\n\nGroup has been closed for 2 minutes and the link message has been removed.');
    }

    return true;
  } catch (err) {
    logger.error('Anti-link action error:', err?.message || err);
    return false;
  }
};

module.exports = { hasLink, hasWAGroupLink, checkAntiLink };
