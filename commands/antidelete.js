// ============================================
//      Prince Md — COMMANDS/ANTIDELETE.JS
//      Anti-Delete System
// ============================================

'use strict';

const fs   = require('fs');
const path = require('path');
const { downloadMediaMessage, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { toSmallCaps } = require('../utils/fonts');
const db = require('../database/db');

const TEMP_DIR = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const msgStores = new Map();

const getStore = (botNum) => {
  const k = botNum.replace(/[^0-9]/g, '');
  if (!msgStores.has(k)) msgStores.set(k, new Map());
  return msgStores.get(k);
};

setInterval(() => {
  try {
    const files = fs.readdirSync(TEMP_DIR);
    let size = 0;
    for (const f of files) {
      try { size += fs.statSync(path.join(TEMP_DIR, f)).size; } catch {}
    }
    if (size > 200 * 1024 * 1024) {
      for (const f of files) { try { fs.unlinkSync(path.join(TEMP_DIR, f)); } catch {} }
    }
  } catch {}
}, 60 * 1000);

const storeMessageForAntidelete = async (sock, msg, botNum) => {
  try {
    const cleanBot = botNum.replace(/[^0-9]/g, '');
    if (!db.getBotAntidelete(cleanBot)) return;

    const msgId = msg.key?.id;
    if (!msg.message || !msgId) return;

    const from   = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!from) return;

    // ✅ FIX 1: Owner ke apne messages store mat karo (DM + group dono)
    const senderDigits = (sender || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    if (senderDigits === cleanBot || msg.key.fromMe) return;

    let message = msg.message;
    let content = '', mediaType = '', mediaPath = '', isViewOnceMsg = false;

    // ✅ FIX 2: ViewOnce wrapper detect karo
    const voWrapper = message?.viewOnceMessageV2 || message?.viewOnceMessageV2Extension || message?.viewOnceMessage;
    const actualMsg = voWrapper ? (voWrapper.message || voWrapper) : message;
    if (voWrapper) isViewOnceMsg = true;

    const imgMsg  = actualMsg?.imageMessage;
    const vidMsg  = actualMsg?.videoMessage;
    const audMsg  = actualMsg?.audioMessage;
    const stkMsg  = actualMsg?.stickerMessage;
    const textMsg = actualMsg?.conversation || actualMsg?.extendedTextMessage?.text;

    if (textMsg) {
      content = textMsg;
    } else if (imgMsg || vidMsg || audMsg || stkMsg) {
      mediaType = imgMsg ? 'image' : vidMsg ? 'video' : audMsg ? 'audio' : 'sticker';
      content   = (imgMsg || vidMsg)?.caption || '';
      try {
        let buf = null;

        if (isViewOnceMsg) {
          // ✅ FIX 3: ViewOnce ke liye downloadContentFromMessage use karo
          const mediaKind = imgMsg ? 'image' : vidMsg ? 'video' : 'audio';
          try {
            const stream = await downloadContentFromMessage(imgMsg || vidMsg || audMsg, mediaKind);
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            buf = Buffer.concat(chunks);
          } catch (e) { buf = null; }
        } else {
          // Normal message ke liye downloadMediaMessage theek hai
          buf = await downloadMediaMessage({ message: actualMsg }, 'buffer', {}).catch(() => null);
        }

        if (buf && buf.length > 100) {
          const ext = imgMsg ? '.jpg' : vidMsg ? '.mp4' : audMsg ? '.mp3' : '.webp';
          mediaPath = path.join(TEMP_DIR, `${msgId}${ext}`);
          fs.writeFileSync(mediaPath, buf);
        }
      } catch {}
    }

    if (!content && !mediaType) return;

    getStore(cleanBot).set(msgId, {
      from, sender, content, mediaType, mediaPath, isViewOnceMsg,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.log('[ANTIDELETE STORE ERROR]', err.message);
  }
};

const handleDeletedMessage = async (sock, msg, botNum) => {
  try {
    const cleanBot = botNum.replace(/[^0-9]/g, '');
    if (!db.getBotAntidelete(cleanBot)) return;

    const deletedId = msg.message?.protocolMessage?.key?.id;
    if (!deletedId) return;

    const store    = getStore(cleanBot);
    const original = store.get(deletedId);
    if (!original) return;

    const deletedBy = msg.key.participant || msg.key.remoteJid || '';
    const delNum = deletedBy.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    
    // ✅ NEW FIX: Agar delete karne wala khud owner/bot hai to inbox mein mat bhejo
    if (delNum === cleanBot) return;

    const senderNum = original.sender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    // ✅ NEW FIX: Agar original message sender khud owner/bot hai to inbox mein mat bhejo
    if (senderNum === cleanBot) return;

    const time = new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi', hour12: true });

    const isGroup = original.from?.endsWith('@g.us');
    let groupName = '';
    if (isGroup) {
      try { groupName = (await sock.groupMetadata(original.from)).subject; } catch {}
    }

    // ✅ FIX 4: ViewOnce delete hone pe message ki jagah "view once" likho
    const notifyText =
`🗑️ *${toSmallCaps('deleted message detected')}*

👤 *${toSmallCaps('deleted by')}:* @${delNum}
📱 *${toSmallCaps('sender')}:* @${senderNum}
🕒 *${toSmallCaps('time')}:* ${time}${groupName ? `\n👥 *${toSmallCaps('group')}:* ${groupName}` : ''}${original.isViewOnceMsg ? `\n\n👁️ *${toSmallCaps('message')}:* ${toSmallCaps('view once')}` : original.content ? `\n\n💬 *${toSmallCaps('message')}:*\n${original.content}` : ''}`;

    const targetJid = `${cleanBot}@s.whatsapp.net`;

    await sock.sendMessage(targetJid, {
      text: notifyText,
      mentions: [original.sender, deletedBy].filter(Boolean),
    });

    // ✅ FIX 5: ViewOnce media forward karo (normal message ki tarah, viewonce nahi)
    if (original.mediaType && original.mediaPath && fs.existsSync(original.mediaPath)) {
      try {
        const mediaBuf = fs.readFileSync(original.mediaPath);
        const caption  = `↩️ *${toSmallCaps('deleted')} ${original.isViewOnceMsg ? toSmallCaps('view once') + ' ' : ''}${original.mediaType}*`;

        if (original.mediaType === 'image')        await sock.sendMessage(targetJid, { image: mediaBuf, caption });
        else if (original.mediaType === 'video')   await sock.sendMessage(targetJid, { video: mediaBuf, caption, mimetype: 'video/mp4' });
        else if (original.mediaType === 'audio')   await sock.sendMessage(targetJid, { audio: mediaBuf, mimetype: 'audio/mpeg' });
        else if (original.mediaType === 'sticker') await sock.sendMessage(targetJid, { sticker: mediaBuf });

        try { fs.unlinkSync(original.mediaPath); } catch {}
      } catch (e) { console.log('[ANTIDELETE MEDIA ERROR]', e.message); }
    }
    store.delete(deletedId);
  } catch (err) {
    console.log('[ANTIDELETE DELETE ERROR]', err.message);
  }
};

const antidelete = async (ctx) => {
  const { botNum, args, react } = ctx;
  const { authMiddleware } = require('../middleware/auth');
  const auth = authMiddleware(ctx);
  if (!await auth.requireOwner()) return;

  const cleanBot = botNum.replace(/[^0-9]/g, '');
  const val = args[0]?.toLowerCase();

  if (!val || !['on', 'off'].includes(val)) {
    const current = db.getBotAntidelete(cleanBot);
    return ctx.reply(`🗑️ *${toSmallCaps('antidelete status')}:* ${current ? '✅ ᴏɴ' : '❌ ᴏғғ'}\n\n*${toSmallCaps('usage')}:* \`.antidelete on\` / \`.antidelete off\``);
  }

  db.setBotAntidelete(cleanBot, val === 'on');
  await ctx.reply(val === 'on'
    ? `✅ *${toSmallCaps('antidelete is now on')}*`
    : `❌ *${toSmallCaps('antidelete is now off')}*`
  );
  await react('✅');
};

module.exports = { antidelete, storeMessageForAntidelete, handleDeletedMessage };