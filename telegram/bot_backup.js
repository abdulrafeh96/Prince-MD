// ============================================
//       Prince Md — TELEGRAM/BOT.JS
//       Telegram Bot Initializer & Router
// ============================================

'use strict';

const config    = require('../config/config');
const logger    = require('../utils/logger');
const { handleStart, handleVerify, handleHelp, handleStatus } = require('./handlers');
const { handleReqPair, handleReqQr } = require('./pairing');

// ─── Verified users store (in-memory) ────────
// Map: telegramUserId → true
const verifiedUsers = new Map();

/**
 * Initialize Telegram bot with all handlers
 * @param {Object} bot - TelegramBot instance
 */
const initTelegram = (bot) => {

  // ─── /start command ───────────────────────
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const firstName = msg.from.first_name || 'User';

    try {
      await handleStart(bot, chatId, userId, firstName, verifiedUsers);
    } catch (err) {
      logger.error('Telegram /start error:', err.message);
    }
  });

  // ─── /reqpair command ─────────────────────
  bot.onText(/\/reqpair(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const number = match[1]?.trim();

    // Must be verified first
    if (!verifiedUsers.get(userId)) {
      return bot.sendMessage(chatId,
        '❌ *Please verify first!*\n\nSend /start to begin.',
        { parse_mode: 'Markdown' }
      );
    }

    try {
      await handleReqPair(bot, chatId, userId, number);
    } catch (err) {
      logger.error('Telegram /reqpair error:', err.message);
    }
  });

  // ─── /reqqr command (QR Login) ─────────────
  bot.onText(/\/reqqr(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const number = match[1]?.trim();

    if (!verifiedUsers.get(userId)) {
      return bot.sendMessage(chatId,
        '❌ *Please verify first!*\n\nSend /start to begin.',
        { parse_mode: 'Markdown' }
      );
    }

    try {
      await handleReqQr(bot, chatId, userId, number);
    } catch (err) {
      logger.error('Telegram /reqqr error:', err.message);
    }
  });

  // ─── /help command ────────────────────────
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!verifiedUsers.get(userId)) {
      return bot.sendMessage(chatId,
        '❌ *Please verify first!*\n\nSend /start to begin.',
        { parse_mode: 'Markdown' }
      );
    }

    try {
      await handleHelp(bot, chatId);
    } catch (err) {
      logger.error('Telegram /help error:', err.message);
    }
  });

  // ─── /status command ──────────────────────
  bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!verifiedUsers.get(userId)) {
      return bot.sendMessage(chatId,
        '❌ *Please verify first!*\n\nSend /start to begin.',
        { parse_mode: 'Markdown' }
      );
    }

    try {
      await handleStatus(bot, chatId);
    } catch (err) {
      logger.error('Telegram /status error:', err.message);
    }
  });

  // ─── Callback Query (inline buttons) ─────
  bot.on('callback_query', async (query) => {
    const chatId  = query.message.chat.id;
    const msgId   = query.message.message_id;
    const userId  = query.from.id;
    const data    = query.data;
    const firstName = query.from.first_name || 'User';

    try {
      // ── Verify Button ──
      if (data === 'verify') {
        // Already verified
        if (verifiedUsers.get(userId)) {
          return bot.answerCallbackQuery(query.id, {
            text: '✅ Already verified!',
            show_alert: false,
          });
        }

        // Mark as verified
        verifiedUsers.set(userId, true);

        // Answer callback
        await bot.answerCallbackQuery(query.id, {
          text: '✅ Verified successfully!',
          show_alert: false,
        });

        // Delete verification message
        try {
          await bot.deleteMessage(chatId, msgId);
        } catch {}

        // Send commands message
        await handleVerify(bot, chatId, firstName);
      }

      // ── Channel Button ──
      if (data === 'channel_1') {
        await bot.answerCallbackQuery(query.id);
      }
      if (data === 'channel_2') {
        await bot.answerCallbackQuery(query.id);
      }

    } catch (err) {
      logger.error('Callback query error:', err.message);
    }
  });

  // ─── Polling Error Handler ─────────────────
  bot.on('polling_error', async (err) => {
    const message = err?.message || '';
    const code = err?.code || err?.name || '';

    // Network glitches are common in long-polling; keep bot alive and log softly.
    if (
      /ETIMEDOUT|ECONNRESET|EAI_AGAIN|EFATAL|429/i.test(message) ||
      /ETIMEDOUT|ECONNRESET|EAI_AGAIN|EFATAL|429/i.test(code)
    ) {
      // Only log every 5th timeout to reduce spam
      if (!bot._timeoutCount) bot._timeoutCount = 0;
      bot._timeoutCount++;
      
      if (bot._timeoutCount % 5 === 0) {
        logger.warn('Telegram polling temporary issue (' + bot._timeoutCount + ' occurrences): ' + message);
      }
      return;
    }

    logger.error('Telegram polling error:', message);
  });

  logger.success('Telegram bot fully initialized.');
};

module.exports = { initTelegram, verifiedUsers };
