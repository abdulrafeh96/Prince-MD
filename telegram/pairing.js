// ============================================
//     Prince Md — TELEGRAM/PAIRING.JS
//     /reqpair Command — WhatsApp Pairing
// ============================================

'use strict';

const { startWhatsApp } = require('../core/whatsapp');
const pairManager       = require('../pair/pairManager');
const { toSmallCaps }   = require('../utils/fonts');
const logger            = require('../utils/logger');

/**
 * Handle /reqpair <number> command
 * @param {Object} bot
 * @param {number} chatId
 * @param {number} userId
 * @param {string} number
 */
const handleReqPair = async (bot, chatId, userId, number) => {

  // ─── Validate number ──────────────────────
  if (!number) {
    return bot.sendMessage(chatId,
      `❌ *Please provide a number!*\n\n*Usage:* /reqpair \`923001234567\`\n_(Country code required, no + or spaces)_`,
      { parse_mode: 'Markdown' }
    );
  }

  const clean = number.replace(/[^0-9]/g, '');

  if (clean.length < 10 || clean.length > 15) {
    return bot.sendMessage(chatId,
      `❌ *Invalid number format!*\n\n*Example:* /reqpair \`923001234567\`\n_(Include country code, no + or spaces)_`,
      { parse_mode: 'Markdown' }
    );
  }

  // ─── Already connected — disconnect karo aur fresh reconnect ──
  if (pairManager.isConnected(clean)) {
    pairManager.disconnectExisting(clean);
    // 1 second wait karo phir continue karo
    await new Promise(r => setTimeout(r, 1000));
  }

  // ─── Check if already pending ─────────────
  if (pairManager.isValid(clean)) {
    const remaining = pairManager.getRemainingTime(clean);
    return bot.sendMessage(chatId,
      `⏳ *Pairing already in progress!*\n\n📱 Number: \`+${clean}\`\n⏰ Code expires in: *${remaining}s*\n\nPlease wait or try again after expiry.`,
      { parse_mode: 'Markdown' }
    );
  }

  // ─── Send "Generating..." message ─────────
  const generatingMsg = await bot.sendMessage(chatId,
    `⏳ *Generating Pairing Code...*\n\n📱 *Number:* \`+${clean}\`\n🔄 *Status:* Processing...\n\n_Please wait a moment_`,
    { parse_mode: 'Markdown' }
  );

  const generatingMsgId = generatingMsg.message_id;

  logger.info(`Pairing code requested for: +${clean} by Telegram user ${userId}`);

  // ─── Start WhatsApp connection ─────────────
  try {
    await startWhatsApp(clean, bot, chatId, generatingMsgId);
  } catch (err) {
    logger.error(`Pairing failed for ${clean}:`, err.message);

    try {
      await bot.editMessageText(
        `❌ *Pairing Failed!*\n\n📱 Number: \`+${clean}\`\nReason: ${err.message}\n\nPlease try again.`,
        {
          chat_id:    chatId,
          message_id: generatingMsgId,
          parse_mode: 'Markdown',
        }
      );
    } catch {}
  }
};

/**
 * Handle /reqqr <number> command (QR login)
 */
const handleReqQr = async (bot, chatId, userId, number) => {
  if (!number) {
    return bot.sendMessage(chatId,
      `❌ *Please provide a number!*\n\n*Usage:* /reqqr \`923001234567\`\n_(Country code required, no + or spaces)_`,
      { parse_mode: 'Markdown' }
    );
  }

  const clean = number.replace(/[^0-9]/g, '');
  if (clean.length < 10 || clean.length > 15) {
    return bot.sendMessage(chatId,
      `❌ *Invalid number format!*\n\n*Example:* /reqqr \`923001234567\`\n_(Include country code, no + or spaces)_`,
      { parse_mode: 'Markdown' }
    );
  }

  if (pairManager.isConnected(clean)) {
    pairManager.disconnectExisting(clean);
    await new Promise(r => setTimeout(r, 1000));
  }

  const generatingMsg = await bot.sendMessage(chatId,
    `⏳ *Generating QR...*\n\n📱 *Number:* \`+${clean}\`\n\n_Please wait a moment_`,
    { parse_mode: 'Markdown' }
  );

  const generatingMsgId = generatingMsg.message_id;
  logger.info(`QR login requested for: +${clean} by Telegram user ${userId}`);

  try {
    await startWhatsApp(clean, bot, chatId, generatingMsgId, false, { loginMethod: 'qr' });
  } catch (err) {
    logger.error(`QR pairing failed for ${clean}:`, err.message);
    try {
      await bot.editMessageText(
        `❌ *QR Login Failed!*\n\n📱 Number: \`+${clean}\`\nReason: ${err.message}\n\nPlease try again.`,
        { chat_id: chatId, message_id: generatingMsgId, parse_mode: 'Markdown' }
      );
    } catch {}
  }
};

module.exports = { handleReqPair, handleReqQr };