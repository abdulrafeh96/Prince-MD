// ============================================
//      Prince Md — COMMANDS/RESTRICT.JS
//      User Restriction System (LID/JID Based)
// ============================================

'use strict';

const { authMiddleware } = require('../middleware/auth');
const { toSmallCaps }    = require('../utils/fonts');
const { getMentions }    = require('../utils/helpers');
const db                 = require('../database/db');

const restrict = async (ctx) => {
  const { msg, args, react, botNum } = ctx;
  const auth = authMiddleware(ctx);
  if (!await auth.requireOwner()) return;

  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
  const mentioned = getMentions(msg.message)[0];
  
  // FIX: extra suffix (@s.whatsapp.net) hata diya taake sirf ID save ho
  const target = mentioned || quotedParticipant || (args[0] ? args[0].replace(/[^0-9]/g,'') : null);

  if (!target) return ctx.reply(`❌ *${toSmallCaps('tag someone or reply to restrict')}!*`);

  await react('🚫');
  try {
    db.setRestricted(target, true, botNum);
    await ctx.reply(`🚫 *${toSmallCaps('user has been restricted by owner')}. ${toSmallCaps('bot will now ignore their commands')}.*`);
    await react('✅');
  } catch (err) {
    await ctx.reply(`❌ *${toSmallCaps('failed to restrict user')}*`);
    await react('❌');
  }
};

const unrestrict = async (ctx) => {
  const { msg, args, react, botNum } = ctx;
  const auth = authMiddleware(ctx);
  if (!await auth.requireOwner()) return;

  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
  const mentioned = getMentions(msg.message)[0];
  
  // FIX: extra suffix (@s.whatsapp.net) hata diya
  const target = mentioned || quotedParticipant || (args[0] ? args[0].replace(/[^0-9]/g,'') : null);

  if (!target) return ctx.reply(`❌ *${toSmallCaps('tag someone or reply to unrestrict')}!*`);

  await react('✅');
  try {
    db.setRestricted(target, false, botNum);
    await ctx.reply(`✅ *${toSmallCaps('user has been unrestricted')}.*`);
    await react('✅');
  } catch (err) {
    await ctx.reply(`❌ *${toSmallCaps('failed to unrestrict user')}*`);
    await react('❌');
  }
};

module.exports = { restrict, unrestrict };