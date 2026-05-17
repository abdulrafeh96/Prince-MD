// ============================================
//      Prince Md – COMMANDS/GROUP.JS
//      Group Management Commands
// ============================================

'use strict';

const safeOpts = (ctx, extra = {}) => {
  if (ctx.isGroup || ctx.msg?.key?.fromMe) {
    return { quoted: ctx.msg, ...extra };
  }
  return { ...extra };
};

const { authMiddleware, isGroupAdmin } = require('../middleware/auth');
const { toSmallCaps }    = require('../utils/fonts');
const { getMentions, jidToNumber } = require('../utils/helpers');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const db = require('../database/db');
                  
// ─── .kick ────────────────────────────────────────────
const kick = async (ctx) => {
  const { sock, from, msg, args, react, botNum, isOwner } = ctx;
  const auth = authMiddleware(ctx);
  if (!await auth.requireAdmin())    return;

  const mentions = getMentions(msg.message);
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant || '';

  const target = mentions[0] || quotedParticipant || (args[0] ? (args[0].includes('@') ? args[0] : `${args[0].replace(/[^0-9]/g,'')}@s.whatsapp.net`) : null);

  if (!target) return ctx.reply(`❌ *${toSmallCaps('tag reply or provide a number to kick')}!*`);

  // Bot khud ko kick na kare
  const botDigits = botNum.replace(/[^0-9]/g, '').split(':')[0];
  const targetDigits = target.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
  if (targetDigits === botDigits) {
    return ctx.reply(`❌ *${toSmallCaps("i can't kick myself")}*\n${toSmallCaps('you can try on yourself')} 😄`);
  }

  // Owner ko kick na kare
  const db2 = require('../database/db');
  const cleanBotNum = botNum.replace(/[^0-9]/g, '');
  const mainOwner   = (db2.getMainOwner(cleanBotNum) || '').replace(/[^0-9]/g, '');
  const secondOwners = (db2.getSecondOwners(cleanBotNum) || []).map(o => o.replace(/[^0-9]/g, ''));

  if (targetDigits === mainOwner || secondOwners.includes(targetDigits)) {
    return ctx.reply(`❌ *${toSmallCaps("i can't kick my owner")}*\n${toSmallCaps('you can try on yourself')} 😄`);
  }

  if (await isGroupAdmin(sock, from, target).catch(() => false)) {
    return ctx.reply(`I can't kick group admins.`);
  }

  await react('⏳');
  try {
    await sock.groupParticipantsUpdate(from, [target], 'remove');
    const displayId = target.split('@')[0].split(':')[0];
    await sock.sendMessage(from, {
      text: `✅ @${displayId} *${toSmallCaps('kicked successfully')}*`,
      mentions: [target],
    }, { quoted: msg });
    await react('✅');
  } catch {
    await ctx.reply(`❌ *${toSmallCaps('failed to kick make sure i am admin')}*`);
    await react('❌');
  }
};

// ─── .add ─────────────────────────────────────────────
const add = async (ctx) => {
  const { sock, from, msg, args, react } = ctx;
  const auth = authMiddleware(ctx);
  if (!await auth.requireAdmin())    return;

  let rawNum = args[0]?.replace(/[^0-9]/g, '') || '';
  if (!rawNum) return ctx.reply(`❌ *${toSmallCaps('provide a number to add')}!*`);

  if (rawNum.startsWith('0') && rawNum.length <= 11) {
    rawNum = '92' + rawNum.slice(1);
  }

  if (rawNum.length < 9) {
    return ctx.reply(`❌ *${toSmallCaps('invalid number include country code')}*`);
  }

  await react('⏳');
  try {
    const jid = `${rawNum}@s.whatsapp.net`;

    // WhatsApp pe check karo ke number exist karta hai
    let actualJid = jid;
    try {
      const [result] = await sock.onWhatsApp(rawNum);
      if (!result?.exists) {
        await react('❌');
        return ctx.reply(`❌ *${toSmallCaps('this number is not on whatsapp')}*`);
      }
      actualJid = result.jid || jid;
    } catch {
      // onWhatsApp fail ho to crash na ho, direct try karo
      actualJid = jid;
    }

    const results = await sock.groupParticipantsUpdate(from, [actualJid], 'add');

    // Result check karo
    const res = results?.[0];
    const status = res?.status;

    if (status === '403') {
      await react('❌');
      return ctx.reply(`❌ *${toSmallCaps('cannot add – user has restricted group invites')}*`);
    } else if (status === '408') {
      await react('❌');
      return ctx.reply(`❌ *${toSmallCaps('invite sent – user must accept to join')}*`);
    } else if (status === '409') {
      await react('❌');
      return ctx.reply(`❌ *${toSmallCaps('user is already in the group')}*`);
    }

    await sock.sendMessage(from, {
      text: `✅ @${rawNum} *${toSmallCaps('added successfully')}*`,
      mentions: [actualJid],
    }, { quoted: msg });
    await react('✅');
  } catch (err) {
    console.error('Add Error:', err);
    const errMsg = err?.message || '';
    if (errMsg.includes('not-authorized') || errMsg.includes('forbidden')) {
      await ctx.reply(`❌ *${toSmallCaps('cannot add – user may have restricted group invites')}*`);
    } else {
      await ctx.reply(`❌ *${toSmallCaps('failed to add user')}*`);
    }
    await react('❌');
  }
};

// ─── .promote ─────────────────────────────────────────
const promote = async (ctx) => {
  const { sock, from, msg, args, react } = ctx;
  const auth = authMiddleware(ctx);
  if (!await auth.requireAdmin())    return;

  const mentions = getMentions(msg.message);
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant || '';
  const target = mentions[0] || quotedParticipant || (args[0] ? (args[0].includes('@') ? args[0] : `${args[0].replace(/[^0-9]/g,'')}@s.whatsapp.net`) : null);

  if (!target) return ctx.reply(`❌ *${toSmallCaps('tag someone to promote')}!*`);

  const displayId = target.split('@')[0].split(':')[0];

  await react('⏳');
  try {
    await sock.groupParticipantsUpdate(from, [target], 'promote');
    await sock.sendMessage(from, {
      text: `⭐ @${displayId} *${toSmallCaps('promoted to admin successfully')}*`,
      mentions: [target],
    }, { quoted: msg });
    await react('✅');
  } catch {
    await ctx.reply(`❌ *${toSmallCaps('failed to promote')}*`);
    await react('❌');
  }
};

// ─── .demote ──────────────────────────────────────────
const demote = async (ctx) => {
  const { sock, from, msg, args, react } = ctx;
  const auth = authMiddleware(ctx);
  if (!await auth.requireAdmin())    return;

  const mentions = getMentions(msg.message);
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant || '';
  const target = mentions[0] || quotedParticipant || (args[0] ? (args[0].includes('@') ? args[0] : `${args[0].replace(/[^0-9]/g,'')}@s.whatsapp.net`) : null);

  if (!target) return ctx.reply(`❌ *${toSmallCaps('tag someone to demote')}!*`);

  const displayId = target.split('@')[0].split(':')[0];

  await react('⏳');
  try {
    await sock.groupParticipantsUpdate(from, [target], 'demote');
    await sock.sendMessage(from, {
      text: `🔻 @${displayId} *${toSmallCaps('demoted from admin successfully')}*`,
      mentions: [target],
    }, { quoted: msg });
    await react('✅');
  } catch {
    await ctx.reply(`❌ *${toSmallCaps('failed to demote')}*`);
    await react('❌');
  }
};

// ─── .mute ────────────────────────────────────────────
const mute = async (ctx) => {
  const { sock, from, msg, react } = ctx;
  const auth = authMiddleware(ctx);
  if (!await auth.requireAdmin())    return;

  await react('⏳');
  try {
    await sock.groupSettingUpdate(from, 'announcement');
    db.setMute(from, true);
    await ctx.reply(`🔇 *${toSmallCaps('group has been muted only admins can message')}*`);
    await react('✅');
  } catch {
    await ctx.reply(`❌ *${toSmallCaps('failed to mute group')}*`);
    await react('❌');
  }
};

// ─── .unmute ──────────────────────────────────────────
const unmute = async (ctx) => {
  const { sock, from, msg, react } = ctx;
  const auth = authMiddleware(ctx);
  if (!await auth.requireAdmin())    return;

  await react('⏳');
  try {
    await sock.groupSettingUpdate(from, 'not_announcement');
    db.setMute(from, false);
    await ctx.reply(`🔊 *${toSmallCaps('group has been unmuted everyone can message')}*`);
    await react('✅');
  } catch {
    await ctx.reply(`❌ *${toSmallCaps('failed to unmute group')}*`);
    await react('❌');
  }
};

// ─── .tagall ──────────────────────────────────────────
// Owner: admin na ho tab bhi chala sakta hai
// Admin: normal flow
// Regular users: block
const tagall = async (ctx) => {
  const { sock, from, msg, args, react } = ctx;
  const auth = authMiddleware(ctx);

  // Owner bypass – agar owner hai to admin check skip
  if (!await auth.requireAdmin()) return;

  await react('📢');
  try {
    const meta    = await sock.groupMetadata(from);
    const members = meta.participants.map(p => p.id);
    const text    = args.join(' ') || `${toSmallCaps('attention everyone')}`;
    const tagText = `📢 *${text}*\n\n` + members.map(m => `@${m.split('@')[0]}`).join(' ');

    await sock.sendMessage(from, { text: tagText, mentions: members }, { quoted: msg });
    await react('✅');
  } catch {
    await ctx.reply(`❌ *${toSmallCaps('failed to tag all')}*`);
    await react('❌');
  }
};

// ─── .hidetag ─────────────────────────────────────────
// Owner: admin na ho tab bhi chala sakta hai
// Admin: normal flow
// Regular users: block
const hidetag = async (ctx) => {
  const { sock, from, msg, args, react } = ctx;
  const auth = authMiddleware(ctx);

  // Owner bypass – agar owner hai to admin check skip
  if (!await auth.requireAdmin()) return;

  await react('📢');
  try {
    const meta       = await sock.groupMetadata(from);
    const members    = meta.participants.map(p => p.id);
    const quotedInfo = msg.message?.extendedTextMessage?.contextInfo;
    const quotedMsg  = quotedInfo?.quotedMessage;

    if (quotedMsg) {
      const msgType = Object.keys(quotedMsg)[0];

      let sendPayload;
      if (msgType === 'conversation' || msgType === 'extendedTextMessage') {
        const text = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || '';
        sendPayload = { text, mentions: members };
      } else if (msgType === 'imageMessage') {
        const fakeMsg = { key: { remoteJid: from, id: quotedInfo.stanzaId || msg.key.id, participant: quotedInfo.participant || msg.key.participant, fromMe: false }, message: quotedMsg };
        const buffer = await downloadMediaMessage(fakeMsg, 'buffer');
        sendPayload = { image: buffer, caption: quotedMsg.imageMessage?.caption || '', mentions: members };
      } else if (msgType === 'videoMessage') {
        const fakeMsg = { key: { remoteJid: from, id: quotedInfo.stanzaId || msg.key.id, participant: quotedInfo.participant || msg.key.participant, fromMe: false }, message: quotedMsg };
        const buffer = await downloadMediaMessage(fakeMsg, 'buffer');
        sendPayload = { video: buffer, caption: quotedMsg.videoMessage?.caption || '', mentions: members };
      } else if (msgType === 'audioMessage') {
        const fakeMsg = { key: { remoteJid: from, id: quotedInfo.stanzaId || msg.key.id, participant: quotedInfo.participant || msg.key.participant, fromMe: false }, message: quotedMsg };
        const buffer = await downloadMediaMessage(fakeMsg, 'buffer');
        sendPayload = { audio: buffer, mimetype: 'audio/mp4', mentions: members };
      } else if (msgType === 'stickerMessage') {
        const fakeMsg = { key: { remoteJid: from, id: quotedInfo.stanzaId || msg.key.id, participant: quotedInfo.participant || msg.key.participant, fromMe: false }, message: quotedMsg };
        const buffer = await downloadMediaMessage(fakeMsg, 'buffer');
        sendPayload = { sticker: buffer };
      } else {
        const text = args.join(' ') || `${toSmallCaps('hidden tag notification')}`;
        sendPayload = { text, mentions: members };
      }

      await sock.sendMessage(from, sendPayload, { quoted: msg });
    } else {
      const text = args.join(' ') || `${toSmallCaps('hidden tag notification')}`;
      await sock.sendMessage(from, { text, mentions: members }, { quoted: msg });
    }

    await react('✅');
  } catch (err) {
    console.error('Hidetag Error:', err);
    await ctx.reply(`❌ *${toSmallCaps('failed to send hidetag')}*`);
    await react('❌');
  }
};

// ─── .groupinfo ───────────────────────────────────────
const groupinfo = async (ctx) => {
  const { sock, from, msg, react } = ctx;
  const auth = authMiddleware(ctx);
  if (!await auth.requireAdmin()) return;

  await react('ℹ️');
  try {
    const meta    = await sock.groupMetadata(from);
    const admins  = meta.participants.filter(p => p.admin).map(p => `@${p.id.split('@')[0]}`).join(', ');
    const created = new Date(meta.creation * 1000).toLocaleDateString();

    const text =
`👥 *${toSmallCaps('group information')}*

━━━━━━━━━━━━━━━━━━━━
📛 *${toSmallCaps('name')}:* ${meta.subject}
📝 *${toSmallCaps('description')}:* ${meta.desc || 'None'}
👤 *${toSmallCaps('members')}:* ${meta.participants.length}
👑 *${toSmallCaps('admins')}:* ${admins || 'None'}
📅 *${toSmallCaps('created')}:* ${created}
🆔 *${toSmallCaps('jid')}:* ${from}
━━━━━━━━━━━━━━━━━━━━`;

    await sock.sendMessage(from, { text, mentions: meta.participants.map(p => p.id) }, { quoted: msg });
  } catch {
    await ctx.reply(`❌ *${toSmallCaps('failed to fetch group info')}*`);
  }
};

// ─── .setname ─────────────────────────────────────────
const setname = async (ctx) => {
  const { sock, from, args, react } = ctx;
  const auth = authMiddleware(ctx);
  if (!await auth.requireAdmin())    return;

  const name = args.join(' ');
  if (!name) return ctx.reply(`❌ *${toSmallCaps('provide a new group name')}!*`);

  await react('⏳');
  try {
    await sock.groupUpdateSubject(from, name);
    await ctx.reply(`✅ *${toSmallCaps('group name changed successfully')}*`);
    await react('✅');
  } catch {
    await ctx.reply(`❌ *${toSmallCaps('failed to change group name')}*`);
    await react('❌');
  }
};

// ─── .setdesc ─────────────────────────────────────────
const setdesc = async (ctx) => {
  const { sock, from, args, react } = ctx;
  const auth = authMiddleware(ctx);
  if (!await auth.requireAdmin())    return;

  const desc = args.join(' ');
  if (!desc) return ctx.reply(`❌ *${toSmallCaps('provide a new description')}!*`);

  await react('⏳');
  try {
    await sock.groupUpdateDescription(from, desc);
    await ctx.reply(`✅ *${toSmallCaps('group description updated successfully')}*`);
    await react('✅');
  } catch {
    await ctx.reply(`❌ *${toSmallCaps('failed to update description')}*`);
    await react('❌');
  }
};

// ─── .linkgc ──────────────────────────────────────────
const linkgc = async (ctx) => {
  const { sock, from, react } = ctx;
  const auth = authMiddleware(ctx);
  if (!await auth.requireAdmin())  return;

  await react('🔗');
  try {
    const link = await sock.groupInviteCode(from);
    await ctx.reply(`🔗 *${toSmallCaps('group invite link')}*:\nhttps://chat.whatsapp.com/${link}`);
    await react('✅');
  } catch {
    await ctx.reply(`❌ *${toSmallCaps('failed to get invite link')}*`);
    await react('❌');
  }
};

// ─── .revokegc ────────────────────────────────────────
const revokegc = async (ctx) => {
  const { sock, from, react } = ctx;
  const auth = authMiddleware(ctx);
  if (!await auth.requireAdmin())    return;

  await react('⏳');
  try {
    await sock.groupRevokeInvite(from);
    await ctx.reply(`✅ *${toSmallCaps('group invite link has been reset')}*`);
    await react('✅');
  } catch {
    await ctx.reply(`❌ *${toSmallCaps('failed to reset invite link')}*`);
    await react('❌');
  }
};

// ─── .antilink ────────────────────────────────────────
const antilink = async (ctx) => {
  const { from, args, react, botNum } = ctx;
  const auth = authMiddleware(ctx);

  if (!await auth.requireGroup())    return;
  if (!await auth.requireAdmin())    return;

  const action = args[0]?.toLowerCase();
  const cleanBot = botNum.replace(/[^0-9]/g, '');

  if (!action) {
    const current = db.isAntiLink(from, cleanBot);
    const currentAction = db.getAntiLinkAction(from, cleanBot);
    return ctx.reply(`🔗 *${toSmallCaps('antilink status')}:* ${current ? '✅ ᴏɴ' : '❌ ᴏꜰꜰ'}\n` +
      `⚡ *${toSmallCaps('action')}:* ${currentAction}\n\n` +
      `${toSmallCaps('usage: .antilink on/off/action')}\n` +
      `${toSmallCaps('actions: delete, kick, warn, warndelete')}`);
  }

  if (['on','off'].includes(action)) {
    const value = action === 'on';
    db.setAntiLink(from, value, cleanBot);
    await ctx.reply(`🔗 *${toSmallCaps('antilink system')}* ${value ? '✅ ᴇɴᴀʙʟᴇᴅ' : '❌ ᴅɪsᴀʙʟᴇᴅ'}`);
    await react('✅');
    return;
  }

  if (['delete','kick','warn','warndelete'].includes(action)) {
    db.setAntiLinkAction(from, action, cleanBot);
    await ctx.reply(`⚡ *${toSmallCaps('antilink action set to')}:* ${action}\n\n` +
      `${toSmallCaps('delete = remove message')}\n` +
      `${toSmallCaps('kick = remove user')}\n` +
      `${toSmallCaps('warn = add warning')}\n` +
      `${toSmallCaps('warndelete = warn user and delete message')}`);
    await react('✅');
    return;
  }

  await ctx.reply(`❌ *${toSmallCaps('invalid action')}*\n${toSmallCaps('usage: .antilink on/off/action (delete/kick/warn/warndelete)')}`);
};

// ─── .antichannel ────────────────────────────────────────
const antichannel = async (ctx) => {
  const { from, args, react, botNum } = ctx;
  const auth = authMiddleware(ctx);

  if (!await auth.requireGroup())    return;
  if (!await auth.requireAdmin())    return;

  const action = args[0]?.toLowerCase();
  const requestedAction = action === 'action' ? args[1]?.toLowerCase() : action;
  const cleanBot = botNum.replace(/[^0-9]/g, '');

  if (!action) {
    const current = db.isAntiChannel(from, cleanBot);
    const currentAction = db.getAntiChannelAction(from, cleanBot);
    return ctx.reply(`📺 *${toSmallCaps('antichannel status')}:* ${current ? '✅ ᴏɴ' : '❌ ᴏꜰꜰ'}\n` +
      `⚡ *${toSmallCaps('action')}:* ${currentAction}\n\n` +
      `${toSmallCaps('usage: .antichannel on/off/action')}\n` +
      `${toSmallCaps('actions: delete, kick, warn, warndelete')}`);
  }

  if (['on','off'].includes(action)) {
    const value = action === 'on';
    db.setAntiChannel(from, value, cleanBot);
    await ctx.reply(`📺 *${toSmallCaps('antichannel system')}* ${value ? '✅ ᴇɴᴀʙʟᴇᴅ' : '❌ ᴅɪsᴀʙʟᴇᴅ'}`);
    await react('✅');
    return;
  }

  if (['delete','kick','warn','warndelete'].includes(requestedAction)) {
    db.setAntiChannelAction(from, requestedAction, cleanBot);
    await ctx.reply(`⚡ *${toSmallCaps('antichannel action set to')}:* ${requestedAction}\n\n` +
      `${toSmallCaps('delete = remove message')}\n` +
      `${toSmallCaps('kick = remove user')}\n` +
      `${toSmallCaps('warn = add warning')}\n` +
      `${toSmallCaps('warndelete = warn user and delete message')}`);
    await react('✅');
    return;
  }

  await ctx.reply(`❌ *${toSmallCaps('invalid action')}*\n${toSmallCaps('usage: .antichannel on/off/action (delete/kick/warn/warndelete)')}`);
};

// ─── .antisticker ────────────────────────────────────────
const antisticker = async (ctx) => {
  const { from, args, react, botNum } = ctx;
  const auth = authMiddleware(ctx);

  if (!await auth.requireGroup())    return;
  if (!await auth.requireAdmin())    return;

  const action = args[0]?.toLowerCase();
  const requestedAction = action === 'action' ? args[1]?.toLowerCase() : action;
  const cleanBot = botNum.replace(/[^0-9]/g, '');

  if (!action) {
    const current = db.isAntiSticker(from, cleanBot);
    const currentAction = db.getAntiStickerAction(from, cleanBot);
    return ctx.reply(`🎭 *${toSmallCaps('antisticker status')}:* ${current ? '✅ ᴏɴ' : '❌ ᴏꜰꜰ'}\n` +
      `⚡ *${toSmallCaps('action')}:* ${currentAction}\n\n` +
      `${toSmallCaps('usage: .antisticker on/off/action')}\n` +
      `${toSmallCaps('actions: delete, kick, warn, warndelete')}`);
  }

  if (['on','off'].includes(action)) {
    const value = action === 'on';
    db.setAntiSticker(from, value, cleanBot);
    await ctx.reply(`🎭 *${toSmallCaps('antisticker system')}* ${value ? '✅ ᴇɴᴀʙʟᴇᴅ' : '❌ ᴅɪsᴀʙʟᴇᴅ'}`);
    await react('✅');
    return;
  }

  if (['delete','kick','warn','warndelete'].includes(requestedAction)) {
    db.setAntiStickerAction(from, requestedAction, cleanBot);
    await ctx.reply(`⚡ *${toSmallCaps('antisticker action set to')}:* ${requestedAction}\n\n` +
      `${toSmallCaps('delete = remove message')}\n` +
      `${toSmallCaps('kick = remove user')}\n` +
      `${toSmallCaps('warn = add warning')}\n` +
      `${toSmallCaps('warndelete = warn user and delete message')}`);
    await react('✅');
    return;
  }

  await ctx.reply(`❌ *${toSmallCaps('invalid action')}*\n${toSmallCaps('usage: .antisticker on/off/action (delete/kick/warn/warndelete)')}`);
};


// ─── .autoopen ────────────────────────────────────────
// ─── .antispam ────────────────────────────────────────
const antispam = async (ctx) => {
  const { from, args, react, botNum } = ctx;
  const auth = authMiddleware(ctx);

  if (!await auth.requireGroup()) return;
  if (!await auth.requireAdmin()) return;

  const action = args[0]?.toLowerCase();
  const requestedAction = action === 'action' ? args[1]?.toLowerCase() : action;
  const cleanBot = botNum.replace(/[^0-9]/g, '');

  if (!action) {
    const current = db.isAntiSpam(from, cleanBot);
    const currentAction = db.getAntiSpamAction(from, cleanBot);
    return ctx.reply(`┏━━〔 *Anti-Spam Status* 〕━━┓

*Status:* ${current ? 'ON' : 'OFF'}
*Action:* ${currentAction}

*Usage:* .antispam on/off/action
*Actions:* delete, kick, warn, warndelete
┗━━━━━━━━━━━━━━┛`);
  }

  if (['on', 'off'].includes(action)) {
    const value = action === 'on';
    db.setAntiSpam(from, value, cleanBot);
    await ctx.reply(`┏━━〔 *Anti-Spam System* 〕━━┓

*Status:* ${value ? 'Enabled' : 'Disabled'}
Spam di train hun ${value ? 'station te rok ditti' : 'free track te chali gayi'}.

┗━━━━━━━━━━━━━━┛`);
    await react('✅');
    return;
  }

  if (['delete', 'kick', 'warn', 'warndelete'].includes(requestedAction)) {
    db.setAntiSpamAction(from, requestedAction, cleanBot);
    await ctx.reply(`┏━━〔 *Anti-Spam Action* 〕━━┓

*Action set to:* ${requestedAction}

delete = remove message
kick = remove user
warn = add warning
warndelete = warn + delete
┗━━━━━━━━━━━━━━┛`);
    await react('✅');
    return;
  }

  await ctx.reply(`❌ *Invalid action*\nUsage: .antispam on/off/action (delete/kick/warn/warndelete)`);
};

const autoopen = async (ctx) => {
  const { sock, from, args, react, botNum } = ctx;
  const auth = authMiddleware(ctx);
  if (!await auth.requireAdmin()) return;

  const cleanBot = botNum.replace(/[^0-9]/g, '');
  const time = args[0];

  await react('⏳');
  try {
    // If time is provided, set auto-open time
    if (time) {
      if (['off','remove','delete'].includes(time.toLowerCase())) {
        db.removeAutoOpenTime(from, cleanBot);
        await ctx.reply('Auto-open time removed.');
        return;
      }

      // Validate time format (HH:MM)
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(time)) {
        return ctx.reply(`❌ *${toSmallCaps('invalid time format')}*\n${toSmallCaps('use 24-hour format like 09:00 or 14:00')}`);
      }

      db.setAutoOpenTime(from, time, cleanBot);
      await react('✅');
      return ctx.reply(`✅ *${toSmallCaps('auto-open time set')}*\n\n` +
        `⏰ *${toSmallCaps('group will open daily at')}*: ${time}\n` +
        `📅 *${toSmallCaps('every day')}*`);
    }

    // If no time provided, open immediately
    await sock.groupSettingUpdate(from, 'not_announcement');
    db.setMute(from, false, cleanBot);
    await sock.sendMessage(from, {
      text: `🔓 *${toSmallCaps('group opened')}* 🔓\n\n` +
            `✨ *${toSmallCaps('group is open for everyone now')}*`
    });
    await ctx.reply(`✅ *${toSmallCaps('group opened successfully')}*`);
    await react('✅');
  } catch (err) {
    await ctx.reply(`❌ *${toSmallCaps('failed to open group')}*`);
    await react('❌');
  }
};

// ─── .autoclose ───────────────────────────────────────
const autoclose = async (ctx) => {
  const { sock, from, args, react, botNum } = ctx;
  const auth = authMiddleware(ctx);
  if (!await auth.requireAdmin()) return;

  const cleanBot = botNum.replace(/[^0-9]/g, '');
  const time = args[0];

  await react('⏳');
  try {
    // If time is provided, set auto-close time
    if (time) {
      if (['off','remove','delete'].includes(time.toLowerCase())) {
        db.removeAutoCloseTime(from, cleanBot);
        await ctx.reply('Auto-close time removed.');
        return;
      }

      // Validate time format (HH:MM)
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(time)) {
        return ctx.reply(`❌ *${toSmallCaps('invalid time format')}*\n${toSmallCaps('use 24-hour format like 09:00 or 14:00')}`);
      }

      db.setAutoCloseTime(from, time, cleanBot);
      await react('✅');
      return ctx.reply(`✅ *${toSmallCaps('auto-close time set')}*\n\n` +
        `⏰ *${toSmallCaps('group will close daily at')}*: ${time}\n` +
        `📅 *${toSmallCaps('every day')}*`);
    }

    // If no time provided, close immediately
    await sock.groupSettingUpdate(from, 'announcement');
    db.setMute(from, true, cleanBot);
    await sock.sendMessage(from, {
      text: `🔒 *${toSmallCaps('group closed')}* 🔒\n\n` +
            `✨ *${toSmallCaps('only admins can send messages now')}*`
    });
    await ctx.reply(`✅ *${toSmallCaps('group closed successfully')}*`);
    await react('✅');
  } catch (err) {
    await ctx.reply(`❌ *${toSmallCaps('failed to close group')}*`);
    await react('❌');
  }
};

// ─── .autostatus ───────────────────────────────────────
const autostatus = async (ctx) => {
  const { from, react, botNum } = ctx;
  const auth = authMiddleware(ctx);
  if (!await auth.requireAdmin()) return;

  const cleanBot = botNum.replace(/[^0-9]/g, '');
  await react('⏳');

  const autoOpenTime = db.getAutoOpenTime(from, cleanBot);
  const autoCloseTime = db.getAutoCloseTime(from, cleanBot);

  let status = `📊 *${toSmallCaps('auto open/close status')}*\n\n`;
  
  if (autoOpenTime) {
    status += `🔓 *${toSmallCaps('auto open')}*: ${autoOpenTime}\n`;
  } else {
    status += `🔓 *${toSmallCaps('auto open')}*: ${toSmallCaps('not set')}\n`;
  }
  
  if (autoCloseTime) {
    status += `🔒 *${toSmallCaps('auto close')}*: ${autoCloseTime}\n`;
  } else {
    status += `🔒 *${toSmallCaps('auto close')}*: ${toSmallCaps('not set')}\n`;
  }

  await ctx.reply(status);
  await react('✅');
};

module.exports = {
  kick, add, promote, demote, mute, unmute,
  tagall, hidetag, groupinfo, setname, setdesc,
  linkgc, revokegc, antilink, antichannel, antisticker, antispam,
  autoopen, autoclose, autostatus
};
