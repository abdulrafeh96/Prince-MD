// ============================================
//      Prince Md — COMMANDS/ANTIGROUP.JS
//      Anti Group Mention System
// ============================================

'use strict';

const { authMiddleware } = require('../middleware/auth');
const { toSmallCaps } = require('../utils/fonts');
const { getMentions } = require('../utils/helpers');
const db = require('../database/db');

// ─── .antigroup ───────────────────────────────────────
const antigroup = async (ctx) => {
  const { from, args, react, botNum } = ctx;
  const auth = authMiddleware(ctx);

  if (!await auth.requireGroup()) return;
  if (!await auth.requireAdmin()) return;

  const action = args[0]?.toLowerCase();
  const cleanBot = botNum.replace(/[^0-9]/g, '');

  if (!action) {
    const current = db.isAntiGroup(from, cleanBot);
    const currentAction = db.getAntiGroupAction ? db.getAntiGroupAction(from, cleanBot) : 'delete';
    return ctx.reply(`🚫 *${toSmallCaps('antigroup status')}:* ${current ? '✅ ᴏɴ' : '❌ ᴏꜰꜰ'}\n` +
      `⚡ *${toSmallCaps('action')}:* ${currentAction}\n\n` +
      `${toSmallCaps('usage: .antigroup on/off/action')}\n` +
      `${toSmallCaps('actions: delete, kick, warn, warndelete')}`);
  }

  if (['on','off'].includes(action)) {
    const value = action === 'on';
    db.setAntiGroup(from, value, cleanBot);
    await ctx.reply(`🚫 *${toSmallCaps('antigroup system')}* ${value ? '✅ ᴇɴᴀʙʟᴇᴅ' : '❌ ᴅɪsᴀʙʟᴇᴅ'}`);
    await react('✅');
    return;
  }

  if (['delete','kick','warn','warndelete'].includes(action)) {
    db.setAntiGroupAction(from, action, cleanBot);
    await ctx.reply(`⚡ *${toSmallCaps('antigroup action set to')}:* ${action}\n\n` +
      `${toSmallCaps('delete = remove message')}\n` +
      `${toSmallCaps('kick = remove user')}\n` +
      `${toSmallCaps('warn = add warning')}\n` +
      `${toSmallCaps('warndelete = warn user and delete message')}`);
    await react('✅');
    return;
  }

  await ctx.reply(`❌ *${toSmallCaps('invalid action')}*\n${toSmallCaps('usage: .antigroup on/off/action (delete/kick/warn/warndelete)')}`);
};

module.exports = {
  antigroup
};
