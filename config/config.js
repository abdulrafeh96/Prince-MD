// ============================================
//       Prince Md - MAIN CONFIGURATION
//   ⚠️  Sari settings yahan se change karo
//       .env file ki zaroorat nahi hai
// ============================================

const config = {

  // ─── Bot Identity ────────────────────────────
  botName:   'Prince Md',


  // ─── Owner Number (apna WhatsApp number daalo with country code) ──
  // Example: '923001234567' (no + sign, no spaces)
  ownerNumber: '923051056536',   // ← YAHAN APNA NUMBER DAALO
  developer: 'Abdul Rafeh',
  prefix:    '.',
  version:   '2.0.0',

  // ─── ⭐ Telegram Settings ─────────────────────
  //  Yahan apna Telegram Bot Token daalo
  telegram: {
    token:     '8937682744:AAFTtJ7T8FFd7GlOYmXH4617iHFg-pxnDOk',   // ← @BotFather se lo
    channelId: '@your_channel_username',          // ← optional
  },

  // ─── WhatsApp Channel Links ──────────────────
  channels: {
    channel1:   'https://whatsapp.com/channel/0029Vb6sfZ6LikgCe1as3o21',
    channel2:   'https://whatsapp.com/channel/0029Vb7MBCzAO7RLYVH1kx0l',
  },

  // ─── Pairing Code Settings ───────────────────
  pairing: {
    codeExpiry: 120000,   // 2 minutes (ms) — code expire time
    maxRetries: 3,
  },

  // ─── Session Settings ────────────────────────
  sessions: {
    dir:          './sessions',
    cleanupDelay: 5000,   // 5 seconds delay before deleting on logout
  },

  // ─── Database ────────────────────────────────
  database: {
    path: './database/data.json',
  },

  // ─── Bot Behavior ────────────────────────────
  behavior: {
    antiCrash:            true,
    autoRead:             false,
    autoTyping:           true,
    autoRecording:        false,
    deleteCommandMessage: false,
    rejectCalls:          false,
    rejectCallMessage:    '❌ Calls are not accepted on this bot.',
  },

  // ─── WhatsApp Login Options ──────────────────
  whatsapp: {
    // 'code' (pairing code) or 'qr' (scan QR)
    loginMethod: 'code',
    // If true, print QR in terminal/VPS when generated
    qrInTerminal: true,
  },

  // ─── Rate Limiting ───────────────────────────
  rateLimit: {
    maxCommands: 10,
    windowMs:    10000,   // per 10 seconds
  },

  // ─── Logging ─────────────────────────────────
  logLevel: 'info',       // 'info' | 'debug' | 'warn' | 'error'

  // ─── Web Server Port ─────────────────────────
  port: 3000,

  // ─── Assets ──────────────────────────────────
  assets: {
    menuImage: './assets/menu.jpg',
    menuAudio: './assets/menu.mp3',
  },

    
};

module.exports = config;