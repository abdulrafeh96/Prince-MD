'use strict';

const { toSmallCaps } = require('../utils/fonts');
const axios = require('axios');

// ─── .jid <group link> ────────────────────────────────
const jid = async (ctx) => {
  const { sock, from, msg, args, react } = ctx;

  await react('🔍');

  const link = args[0]?.trim();
  if (!link) return ctx.reply(`❌ *${toSmallCaps('provide a whatsapp group link')}*\nExample: \`.jid https://chat.whatsapp.com/xxxx\``);

  // Extract invite code from link
  const match = link.match(/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/);
  if (!match) return ctx.reply(`❌ *${toSmallCaps('invalid whatsapp group link')}*`);

  const code = match[1];

  try {
    const info = await sock.groupGetInviteInfo(code);
    const groupJid = info.id;

    await sock.sendMessage(from, {
      text:
`╭━━〔 🆔 ${toSmallCaps('group jid info')} 〕━━┈⊷
┃
┃  📛 *${toSmallCaps('name')}*
┃  ${info.subject || toSmallCaps('unknown')}
┃
┃  🆔 *${toSmallCaps('jid')}*
┃  ${groupJid}
┃
┃  👥 *${toSmallCaps('members')}*
┃  ${info.size || '?'}
┃
╰━━━━━━━━━━━━━━┈⊷

> ${toSmallCaps('powered by Prince Md')}`,
    }, { quoted: msg });

    await react('✅');
  } catch (err) {
    await react('❌');
    await ctx.reply(`❌ *${toSmallCaps('failed to fetch group info')}*\n_${toSmallCaps('link may be invalid or expired')}_`);
  }
};

module.exports = { jid };