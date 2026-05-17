'use strict';

const db = require('../database/db');
const logger = require('./logger');

const MAX_WARNS = 3;
const SPAM_LIMIT = 5;
const SPAM_WINDOW_MS = 8000;
const COOLDOWN_MS = 15000;

const spamBuckets = new Map();
const lastActionAt = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const displayNumber = (jid = '') => String(jid).split('@')[0].split(':')[0];

function bucketKey(from, sender, cleanBot) {
  return `${cleanBot}:${from}:${sender}`;
}

function rememberMessage(key, now) {
  const timestamps = (spamBuckets.get(key) || []).filter((time) => now - time <= SPAM_WINDOW_MS);
  timestamps.push(now);
  spamBuckets.set(key, timestamps);
  return timestamps.length;
}

async function deleteMessage(sock, from, msg, sender) {
  await sleep(250);
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
    text: `┏━━〔 *Anti-Spam Alert* 〕━━┓

@${displayNumber(sender)} paaji, thora brake lao.
Messagean di train express speed te chal pai ae.

*Warning Meter:* ${warns}/${MAX_WARNS}
┗━━━━━━━━━━━━━━┛`,
    mentions: [sender],
  });

  if (warns >= MAX_WARNS) {
    await sock.groupParticipantsUpdate(from, [sender], 'remove');
    await sock.sendMessage(from, {
      text: `┏━━〔 *Member Removed* 〕━━┓

@${displayNumber(sender)} spam di race ch group ton bahar ho gaye.
*Warnings:* ${MAX_WARNS}/${MAX_WARNS}

┗━━━━━━━━━━━━━━┛`,
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
    await sock.sendMessage(from, {
      text: `┏━━〔 *Member Removed* 〕━━┓

@${displayNumber(sender)} spam machine ban gaye si, is karke bahar kar ditta.

┗━━━━━━━━━━━━━━┛`,
      mentions: [sender],
    });
    return;
  }

  await deleteMessage(sock, from, msg, sender);
}

async function checkAntiSpam(sock, msg, from, sender, botNum, isProtected) {
  if (!from?.endsWith('@g.us')) return false;
  if (msg.key?.fromMe || isProtected) return false;

  const cleanBot = String(botNum || '').replace(/[^0-9]/g, '');
  if (!db.isAntiSpam(from, cleanBot)) return false;

  const key = bucketKey(from, sender, cleanBot);
  const now = Date.now();
  const count = rememberMessage(key, now);
  if (count < SPAM_LIMIT) return false;

  const lastAt = lastActionAt.get(key) || 0;
  if (now - lastAt < COOLDOWN_MS) return true;
  lastActionAt.set(key, now);
  spamBuckets.set(key, []);

  const action = db.getAntiSpamAction(from, cleanBot);
  setTimeout(async () => {
    try {
      await applyAction(sock, msg, from, msg.key.participant || sender, cleanBot, action);
    } catch (err) {
      logger.error('Anti-spam action error:', err?.message || err);
    }
  }, 100);

  return true;
}

module.exports = { checkAntiSpam };
