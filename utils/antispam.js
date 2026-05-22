'use strict';

const db = require('../database/db');
const logger = require('./logger');

const MAX_WARNS = 3;
const SPAM_LIMIT = 4;
const SPAM_WINDOW_MS = 7000;
const COOLDOWN_MS = 15000;
const REOPEN_DELAY_MS = 2 * 60 * 1000;

const spamBuckets = new Map();
const lastActionAt = new Map();
const reopenTimers = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const displayNumber = (jid = '') => String(jid).split('@')[0].split(':')[0];

async function sendText(sock, from, text, extra = {}) {
  const cleanText = String(text || '').trim();
  if (!cleanText) return;
  await sock.sendMessage(from, { text: cleanText, ...extra });
}

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
  await sleep(100);
  await sock.sendMessage(from, {
    delete: {
      remoteJid: from,
      fromMe: false,
      id: msg.key.id,
      participant: msg.key.participant || sender,
    },
  });
}

function scheduleReopen(sock, from, cleanBot) {
  const existing = reopenTimers.get(from);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(async () => {
    reopenTimers.delete(from);
    try {
      await sock.groupSettingUpdate(from, 'not_announcement');
      db.setMute(from, false, cleanBot);
      await sendText(sock, from, 'Group opened again after the anti-spam lock.');
    } catch (err) {
      logger.error('Anti-spam group reopen error:', err?.message || err);
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
    logger.error('Anti-spam group close error:', err?.message || err);
  }
}

async function warnUser(sock, from, sender, cleanBot) {
  const warnKey = `${from}:${sender}`;
  const warns = db.addWarn(warnKey, cleanBot);

  await sendText(sock, from, `Anti-Spam Alert

@${displayNumber(sender)}, you are sending messages too quickly.
The group has been closed for 2 minutes and your spam message has been removed.

Warnings: ${warns}/${MAX_WARNS}`, { mentions: [sender] });

  if (warns >= MAX_WARNS) {
    await sock.groupParticipantsUpdate(from, [sender], 'remove');
    await sendText(sock, from, `Member Removed

@${displayNumber(sender)} has been removed for repeated spam.
Warnings: ${MAX_WARNS}/${MAX_WARNS}`, { mentions: [sender] });
  }
}

async function applyAction(sock, msg, from, sender, cleanBot, action) {
  await closeGroup(sock, from, cleanBot);
  await deleteMessage(sock, from, msg, sender);

  if (action === 'warn' || action === 'warndelete') {
    await warnUser(sock, from, sender, cleanBot);
    return;
  }

  if (action === 'kick') {
    await sock.groupParticipantsUpdate(from, [sender], 'remove');
    await sendText(sock, from, `Member Removed

@${displayNumber(sender)} has been removed for spamming.`, { mentions: [sender] });
    return;
  }

  await sendText(sock, from, 'Anti-Spam Alert\n\nGroup has been closed for 2 minutes and the spam message has been removed.');
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
  try {
    await applyAction(sock, msg, from, msg.key.participant || sender, cleanBot, action);
  } catch (err) {
    logger.error('Anti-spam action error:', err?.message || err);
  }

  return true;
}

module.exports = { checkAntiSpam };
