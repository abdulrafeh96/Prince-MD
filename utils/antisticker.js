'use strict';

const db = require('../database/db');
const logger = require('./logger');

const MAX_WARNS = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const displayNumber = (jid = '') => String(jid).split('@')[0].split(':')[0];

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
    text: `┏━━〔 *Anti-Sticker Alert* 〕━━┓

@${displayNumber(sender)} paaji, stickeran di baraat ethe allowed nahi.
Thora keyboard vi use kar lya karo.

*Warning Meter:* ${warns}/${MAX_WARNS}
┗━━━━━━━━━━━━━━━━┛`,
    mentions: [sender],
  });

  if (warns >= MAX_WARNS) {
    await sock.groupParticipantsUpdate(from, [sender], 'remove');
    await sock.sendMessage(from, {
      text: `┏━━〔 *Member Removed* 〕━━┓

@${displayNumber(sender)} stickeran de nach ch group ton bahar ho gaye.
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
    return;
  }

  await deleteMessage(sock, from, msg, sender);
}

async function checkAntiSticker(sock, msg, from, sender, botNum, isOwner, isAdmin = false) {
  if (!from?.endsWith('@g.us')) return false;
  if (!msg?.message?.stickerMessage) return false;
  if (msg.key?.fromMe || isOwner) return false;

  const cleanBot = String(botNum || '').replace(/[^0-9]/g, '');
  if (!db.isAntiSticker(from, cleanBot)) return false;

  const action = isAdmin ? 'delete' : db.getAntiStickerAction(from, cleanBot);
  const target = msg.key.participant || sender || msg.key.remoteJid;

  setTimeout(async () => {
    try {
      await applyAction(sock, msg, from, target, cleanBot, action);
    } catch (err) {
      logger.error('Anti-sticker action error:', err?.message || err);
    }
  }, 100);

  return true;
}

module.exports = { checkAntiSticker };
