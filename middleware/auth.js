'use strict';

const db = require('../database/db');
const rateLimitStore = new Map();

/**
 * Helper to get the base ID (removes @s.whatsapp.net, @g.us, @lid, and device :1)
 */
const getBaseId = (jid) => {
  if (!jid) return '';
  return jid.split('@')[0].split(':')[0];
};

const getDigits = (value) => getBaseId(value).replace(/[^0-9]/g, '');

const getParticipantIds = (participant = {}) => [
  participant.id,
  participant.jid,
  participant.lid,
  participant.phoneNumber,
  participant.phone,
].filter(Boolean);

const isAdminParticipant = (participant = {}) =>
  participant.admin === 'admin' ||
  participant.admin === 'superadmin' ||
  participant.admin === true;

const idsMatch = (left, right) => {
  const leftBase = getBaseId(left);
  const rightBase = getBaseId(right);
  const leftDigits = getDigits(left);
  const rightDigits = getDigits(right);

  return (
    (leftBase && rightBase && leftBase === rightBase) ||
    (leftDigits && rightDigits && leftDigits === rightDigits)
  );
};

const isGroupAdmin = async (sock, groupJid, userJid) => {
  try {
    const meta = await sock.groupMetadata(groupJid);

    return meta.participants.some(p => {
      if (!isAdminParticipant(p)) return false;
      return getParticipantIds(p).some(id => idsMatch(id, userJid));
    });
  } catch { return false; }
};

const authMiddleware = (ctx) => {
  const { isOwner, isGroup, sock, from, sender, botNum } = ctx;

  return {

    requireOwner: async () => {
      if (!isOwner) {
        const cleanBot = botNum.replace(/[^0-9]/g, '');
        const currentMode = db.getBotMode(cleanBot);
        await ctx.reply(
`╭━━〔 ᴀᴄᴄᴇss ᴅᴇɴɪᴇᴅ 〕━━┈⊷
┃◈ ᴏᴡɴᴇʀ ᴏɴʟʏ ᴄᴏᴍᴍᴀɴᴅ
╰━━━━━━━━━━━━━━━┈⊷`);
        return false;
      }
      return true;
    },

    requireGroup: async () => {
      if (!isGroup) {
        await ctx.reply(`👥 *${'ɢʀᴏᴜᴘ ᴏɴʟʏ ᴄᴏᴍᴍᴀɴᴅ'}!*`);
        return false;
      }
      return true;
    },

    requireAdmin: async () => {
      // Allow admins to use group commands in private mode
      if (!isGroup && !isOwner) {
        await ctx.reply(`👥 *${'ɢʀᴏᴜᴘ ᴏɴᴇʟ ɴᴏᴛ ɢʀᴏᴜᴍ'}!*`);
        return false;
      }
      // Owner hamesha bypass
      if (isOwner) return true;

      // Only check admin if in group
      if (isGroup) {
        const admin = await isGroupAdmin(sock, from, sender);
        if (!admin) {
          await ctx.reply(`👮 *${'ᴀᴅᴍɪɴ ᴏɴᴇʟ ɴᴏᴛ ɢʀᴏᴜᴘ'}!*\n${'ᴏɴᴇʟ ɴᴏᴛ ɢʀᴏᴜᴘ ɪs ᴀᴅᴍɪɴ'}.`);
          return false;
        }
      }
      return true;
    },

    requireBotAdmin: async () => {
      if (!isGroup) {
        await ctx.reply(`👥 *${'ɢʀᴏᴜᴘ ᴏɴʟʏ ᴄᴏᴍᴍᴀɴᴅ'}!*`);
        return false;
      }
      // isOwner bypass NAHI — bot ka actual admin hona zaroori hai

      try {
        const meta = await sock.groupMetadata(from);

        // Bot ki saari possible identities — number aur LID dono
        const botIds = [
          sock.user?.id,
          sock.user?.jid,
          sock.user?.lid,
          botNum,
          botNum ? `${botNum.replace(/[^0-9]/g, '')}@s.whatsapp.net` : '',
        ].filter(Boolean);

        const botIsAdmin = meta.participants.some(p => {
          if (!isAdminParticipant(p)) return false;
          const participantIds = getParticipantIds(p);
          return participantIds.some(pid => botIds.some(bid => idsMatch(pid, bid)));
        });

        if (!botIsAdmin) {
          await ctx.reply(`🤖 *${'ʙᴏᴛ ɴᴇᴇᴅs ᴀᴅᴍɪɴ ᴘᴇʀᴍɪssɪᴏɴ'}!*\n${'ᴘʟᴇᴀsᴇ ᴍᴀᴋᴇ ᴍᴇ ᴀɴ ᴀᴅᴍɪɴ ғɪʀsᴛ'}.`);
          return false;
        }
        return true;
      } catch {
        return false;
      }
    },

  };
};

const checkRateLimit = (senderNum) => {
  const now    = Date.now();
  const limit  = 5;
  const window = 10 * 1000;
  const entry  = rateLimitStore.get(senderNum) || { count: 0, resetAt: now + window };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + window; }
  entry.count++;
  rateLimitStore.set(senderNum, entry);
  return entry.count <= limit;
};

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitStore.entries()) {
    if (now > v.resetAt) rateLimitStore.delete(k);
  }
}, 5 * 60 * 1000);

module.exports = { authMiddleware, isGroupAdmin, checkRateLimit };
