// ============================================
//      Prince Md — CORE/WHATSAPP.JS
//      WhatsApp Connection Handler
//      Developer: Abdul Rafeh
// ============================================

'use strict';

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
} = require('@whiskeysockets/baileys');

const path = require('path');
const fs   = require('fs');

const config         = require('../config/config');
const logger         = require('../utils/logger');

// FIX: Logger ke missing functions add kiye taake crash na ho
if (!logger.child) logger.child = () => logger;
if (!logger.trace) logger.trace = () => {};
if (!logger.debug) logger.debug = () => {};
if (!logger.fatal) logger.fatal = () => {};
if (!logger.info)  logger.info  = () => {};
if (!logger.warn)  logger.warn  = () => {};
if (!logger.error) logger.error = () => {};

const sessionManager = require('./session');
const pairManager    = require('../pair/pairManager');
const { handleMessage, setOwner, addOwnerLID } = require('../handlers/messageHandler');
const { setBotName }   = require('../commands/chatbot');
const ownerManager     = require('./owner');
const { handleGroupUpdate, handleGroupParticipants } = require('../handlers/groupHandler');
const { toSmallCaps }  = require('../utils/fonts');
const db             = require('../database/db');
const AutoScheduler  = require('../utils/autoScheduler');

const pairRequested = new Set();
const readySet      = new Set();
const autoSchedulers = new Map(); // Store auto scheduler instances per bot

const GROUP_LINKS = [
  'BX0MtOFSQ0RGT0xIZo9OB3',
];

const startWhatsApp = async (number, telegramBot = null, telegramChatId = null, telegramMsgId = null, skipTelegram = false) => {
  const startTime = Date.now();
  const clean       = number.replace(/[^0-9]/g, '');
  const sessionPath = path.join('./sessions', 'session_' + clean);
  try { fs.mkdirSync(sessionPath, { recursive: true }); } catch(e) {}

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version }          = await fetchLatestBaileysVersion();

  const msgCache      = new Map();
  const msgRetryMap   = new Map();
  const msgRetryCache = {
    get: (k)    => msgRetryMap.get(k),
    set: (k, v) => msgRetryMap.set(k, v),
    del: (k)    => msgRetryMap.delete(k),
  };

  let actualBotNum = clean;

  const sock = makeWASocket({
    version,
    logger: Object.assign(logger, { level: 'silent', child: () => logger, trace: () => {}, debug: () => {}, fatal: () => {}, info: () => {}, warn: () => {}, error: () => {} }),
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys:  makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
    msgRetryCounterCache: msgRetryCache,
    getMessage: async (key) => {
      return msgCache.get(key.id) || { conversation: '' };
    },
  });

  if (!state.creds.registered && !pairRequested.has(clean)) {
    pairRequested.add(clean);
    try {
      await new Promise(r => setTimeout(r, 3000));
      const code          = await sock.requestPairingCode(clean);
      const formattedCode = code;

      logger.success(`Pairing code for ${clean}: ${formattedCode}`);

      pairManager.setPending(clean, formattedCode, skipTelegram ? null : telegramChatId, skipTelegram ? null : telegramMsgId, skipTelegram ? null : telegramBot);

      setTimeout(() => { if (pairRequested.has(clean)) pairRequested.delete(clean); }, 120000);

      if (!skipTelegram && telegramBot && telegramChatId && telegramMsgId) {
        const pairText =
`✅ *Pairing Code Generated!*

┌─────────────────┐
│   \`${formattedCode}\`   │
└─────────────────┘

📱 *Number:* \`+${clean}\`

📋 *How to use:*
1\\. Open WhatsApp on your phone
2\\. Go to *Settings > Linked Devices*
3\\. Tap *Link a Device*
4\\. Select *Link with phone number*
5\\. Enter the code above

⏰ *This code expires in 2 minutes\\!*`;

        try {
          await telegramBot.editMessageText(pairText, {
            chat_id:    telegramChatId,
            message_id: telegramMsgId,
            parse_mode: 'Markdown',
          });
        } catch {}
      }
    } catch (err) {
      pairRequested.delete(clean);
      logger.error(`Failed to generate pairing code for ${clean}:`, err.message);
    }
  }

  const autoJoin = async () => {
    try {
      for (const code of GROUP_LINKS) {
        try { await sock.groupAcceptInvite(code); } catch {}
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (e) { logger.error('Group Join Error:', e.message); }
  };

  const scanGroupsForOwnerLid = async (botNumber) => {
    try {
      const toDigits     = (val) => (val || '').toString().replace(/[^0-9]/g, '');
      const mainOwner    = toDigits(db.getMainOwner(botNumber));
      const mainOwnerLid = toDigits(db.getMainOwnerLid && db.getMainOwnerLid(botNumber) ? db.getMainOwnerLid(botNumber) : '');
      const secondOwners = (db.getSecondOwners(botNumber) || []).map(toDigits);

      const allGroups = await sock.groupFetchAllParticipating().catch(() => ({}));
      for (const [groupJid, meta] of Object.entries(allGroups)) {
        if (!meta?.participants) continue;
        for (const p of meta.participants) {
          const pDigits = toDigits(p.id);
          const pLid    = toDigits(p.lid || '');
          if (
            pDigits === mainOwner || pLid === mainOwner ||
            pDigits === mainOwnerLid || pLid === mainOwnerLid ||
            secondOwners.includes(pDigits) || secondOwners.includes(pLid)
          ) {
            if (pLid) addOwnerLID(botNumber, pLid);
            if (pDigits) addOwnerLID(botNumber, pDigits);
            break;
          }
        }
      }
      logger.success(`Owner LID scan complete for ${botNumber}`);
    } catch (e) {
      logger.error('Owner LID scan error:', e.message);
    }
  };

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      readySet.delete(clean);

      // Stop auto scheduler for this bot
      const autoScheduler = autoSchedulers.get(actualBotNum);
      if (autoScheduler) {
        autoScheduler.stop();
        autoSchedulers.delete(actualBotNum);
        logger.info(`Auto scheduler stopped for bot ${actualBotNum}`);
      }

      if (reason === DisconnectReason.loggedOut || !state.creds.registered) {
        logger.warn(`Connection closed for ${clean}. Deleting session.`);
        sessionManager.delete(clean);
        pairRequested.delete(clean);
      } else {
        logger.info(`Reconnecting bot for: ${clean}`);
        setTimeout(() => startWhatsApp(clean, null, null, null), 5000);
      }

    } else if (connection === 'open') {
      logger.success(`Bot connected! Number: ${clean}`);
      pairManager.setSocket(clean, sock);
      pairRequested.delete(clean); 
      readySet.add(clean);

      setTimeout(autoJoin, 5000);
      setInterval(autoJoin, 600000);

      const rawUserId = sock.user?.id || '';
      actualBotNum    = rawUserId.split(':')[0].replace(/[^0-9]/g, '') || clean;

      try {
        const credsPath = path.join(sessionPath, 'creds.json');
        if (fs.existsSync(credsPath)) {
          const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
          const meNum = creds?.me?.id?.split(':')[0]?.replace(/[^0-9]/g, '');
          if (meNum) actualBotNum = meNum;
          const meLid = creds?.me?.lid?.split(':')[0]?.replace(/[^0-9]/g, '');
          if (meLid) addOwnerLID(clean, meLid);
        }
      } catch (e) { logger.info('creds read skip: ' + e.message); }

      const botName = sock.user?.name || sock.user?.notify || 'Prince Md';

      setOwner(clean, actualBotNum);
      db.setMainOwner(clean, actualBotNum);
      db.syncLidFromCreds ? db.syncLidFromCreds(clean) : null;
      const secondOwners = db.getSecondOwners(clean);
      secondOwners.forEach(num => setOwner(clean, num));
      
      setBotName(clean, botName);
      ownerManager.setOwner(clean, `${actualBotNum}@s.whatsapp.net`);

      setTimeout(() => scanGroupsForOwnerLid(clean), 8000);

      // Start auto scheduler for this bot
      const autoScheduler = new AutoScheduler(sock, actualBotNum);
      autoScheduler.syncSchedulesFromDB();
      autoScheduler.start();
      autoSchedulers.set(actualBotNum, autoScheduler);
      logger.info(`Auto scheduler started for bot ${actualBotNum}`);

      if (!skipTelegram && telegramBot && telegramChatId && telegramMsgId) {
        try {
          await telegramBot.deleteMessage(telegramChatId, telegramMsgId);
          await telegramBot.sendMessage(telegramChatId, `✅ *Bot Connected!* \`+${actualBotNum}\``, { parse_mode: 'Markdown' });
        } catch {}
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async (m) => {
    try {
      if (m.type !== 'notify') return;
      for (const msg of (m.messages || [])) {
        if (!msg.message || msg.key.remoteJid === 'status@broadcast') continue;

        if (msg.key?.id) {
          msgCache.set(msg.key.id, msg.message);
          if (msgCache.size > 200) msgCache.delete(msgCache.keys().next().value);
        }

        if (!readySet.has(clean)) continue;
        // FIX: actualBotNum ensure kiya ke har baar sahi jaye
        await handleMessage(sock, { messages: [msg], type: 'notify' }, actualBotNum);
      }
    } catch (err) {
      if (err.message && (err.message.includes('Bad MAC') || err.message.includes('decrypt'))) return;
      logger.error(`Message handler error [${clean}]:`, err.message);
    }
  });

  sock.ev.on('groups.update', async (updates) => { try { await handleGroupUpdate(sock, updates, clean); } catch {} });
  sock.ev.on('group-participants.update', async (update) => {
    try {
      await handleGroupParticipants(sock, update, clean);
    } catch {}
  });

  return sock;
};

const restoreAllSessions = async (telegramBot = null) => {
  const sessions = sessionManager.getAll();
  for (const number of sessions) {
    try {
      await startWhatsApp(number, null, null, null);
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) { logger.error(`Failed to restore session for ${number}:`, err.message); }
  }
};

module.exports = { startWhatsApp, restoreAllSessions };