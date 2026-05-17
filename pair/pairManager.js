// ============================================
//       Prince Md - PAIR CODE MANAGER
// ============================================

const fs = require('fs');
const config = require('../config/config');
const logger = require('../utils/logger');
const sessionManager = require('../core/session');

// ─── In-memory pending pairs ─────────────────
// Map: number → { code, expiry, telegramChatId, telegramMsgId, timer }
const pendingPairs = new Map();

// ─── Active WhatsApp sockets ──────────────────
// Map: number → socket
const activeSockets = new Map();

const pairManager = {

  /**
   * Store a pending pair request
   * @param {string} number
   * @param {string} code
   * @param {number|null} telegramChatId
   * @param {number|null} telegramMsgId
   */
  setPending: (number, code, telegramChatId = null, telegramMsgId = null, telegramBot = null) => {
    const clean = number.replace(/[^0-9]/g, '');

    // Clear any existing timer for this number
    if (pendingPairs.has(clean)) {
      clearTimeout(pendingPairs.get(clean).timer);
    }

    const expiry = Date.now() + config.pairing.codeExpiry;

    // Set auto-expiry timer — telegramBot pass karo expired message ke liye
    const timer = setTimeout(() => {
      pairManager.expirePair(clean, telegramBot);
    }, config.pairing.codeExpiry);

    pendingPairs.set(clean, {
      code,
      expiry,
      telegramChatId,
      telegramMsgId,
      telegramBot,
      timer,
      createdAt: Date.now(),
    });

    logger.info(`Pair code stored for ${clean} — expires in 2 minutes`);
  },

  /**
   * Get pending pair info
   * @param {string} number
   * @returns {Object|null}
   */
  getPending: (number) => {
    const clean = number.replace(/[^0-9]/g, '');
    const data = pendingPairs.get(clean);
    if (!data) return null;
    if (Date.now() > data.expiry) {
      pairManager.expirePair(clean);
      return null;
    }
    return data;
  },

  /**
   * Check if pair code is still valid
   * @param {string} number
   * @returns {boolean}
   */
  isValid: (number) => {
    return !!pairManager.getPending(number);
  },

  /**
   * Expire a pair (called automatically after 2 min or manually)
   * @param {string} number
   */
  expirePair: async (number, telegramBot = null) => {
    const clean = number.replace(/[^0-9]/g, '');
    const data = pendingPairs.get(clean);
    if (data) {
      clearTimeout(data.timer);
      pendingPairs.delete(clean);
      logger.warn(`Pair code expired for: ${clean}`);

      // Connected nahi hua — session delete karo
      if (!activeSockets.has(clean)) {
        if (sessionManager.exists(clean)) {
          sessionManager.delete(clean);
          logger.warn(`Unconnected session cleaned: ${clean}`);
        }

        // Telegram message edit karo — expired
        if (telegramBot && data.telegramChatId && data.telegramMsgId) {
          try {
            await telegramBot.editMessageText(
              `❌ *Pairing Code Expired!*

📱 *Number:* \`+${clean}\`

_Send /reqpair ${clean} to generate a new code._`,
              {
                chat_id:    data.telegramChatId,
                message_id: data.telegramMsgId,
                parse_mode: 'Markdown',
              }
            );
          } catch {}
        }
      }
    }
  },

  /**
   * Clear pair after successful connection
   * @param {string} number
   */
  clearPair: (number) => {
    const clean = number.replace(/[^0-9]/g, '');
    const data = pendingPairs.get(clean);
    if (data) {
      clearTimeout(data.timer);
      pendingPairs.delete(clean);
      logger.success(`Pair cleared after successful connection: ${clean}`);
    }
  },

  /**
   * Register active socket
   * @param {string} number
   * @param {Object} socket
   */
  setSocket: (number, socket) => {
    const clean = number.replace(/[^0-9]/g, '');
    activeSockets.set(clean, socket);
    logger.connect(clean, 'connected');
  },

  /**
   * Remove socket on disconnect
   * @param {string} number
   */
  removeSocket: (number) => {
    const clean = number.replace(/[^0-9]/g, '');
    activeSockets.delete(clean);
    logger.connect(clean, 'disconnected');
  },

  /**
   * Get active socket for a number
   * @param {string} number
   * @returns {Object|null}
   */
  getSocket: (number) => {
    const clean = number.replace(/[^0-9]/g, '');
    return activeSockets.get(clean) || null;
  },

  /**
   * Get all active sockets map
   * @returns {Map}
   */
  getActiveSockets: () => activeSockets,

  /**
   * Check if number is currently connected
   * @param {string} number
   * @returns {boolean}
   */
  isConnected: (number) => {
    const clean = number.replace(/[^0-9]/g, '');
    return activeSockets.has(clean);
  },

  // Disconnect karo existing connection — reconnect ke liye
  disconnectExisting: (number) => {
    const clean = number.replace(/[^0-9]/g, '');
    const sock  = activeSockets.get(clean);
    if (sock) {
      try { sock.end(); } catch {}
      activeSockets.delete(clean);
    }
  },

  /**
   * Get all pending pairs count
   * @returns {number}
   */
  pendingCount: () => pendingPairs.size,

  /**
   * Get all active connections count
   * @returns {number}
   */
  activeCount: () => activeSockets.size,

  /**
   * Get remaining time for a pair code (in seconds)
   * @param {string} number
   * @returns {number}
   */
  getRemainingTime: (number) => {
    const data = pairManager.getPending(number);
    if (!data) return 0;
    return Math.max(0, Math.ceil((data.expiry - Date.now()) / 1000));
  },
};

module.exports = pairManager;