'use strict';

const { toSmallCaps } = require('../utils/fonts');
const db = require('../database/db');

const totalchat = async (ctx) => {
  const { sock, from, msg, botNum } = ctx;
  if (!ctx.isGroup) {
    return sock.sendMessage(from, { text: `❌ *${toSmallCaps('this command is only for groups')}*` }, { quoted: msg });
  }

  // Database se top members fetch karna
  const stats = db.getTopMembers(from, botNum.replace(/[^0-9]/g, ''));
  const sorted = Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (sorted.length === 0) {
    return sock.sendMessage(from, { text: `📊 *${toSmallCaps('no activity found in this group yet')}*` }, { quoted: msg });
  }

  let text = `📊 *${toSmallCaps('group activity leaderboard')}*\n\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  
  for (let i = 0; i < sorted.length; i++) {
    const user = sorted[i][0];
    const count = sorted[i][1];
    text += `${i + 1}. @${user.split('@')[0]} — *${count}* ${toSmallCaps('messages')}\n`;
  }
  
  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `*${toSmallCaps('keep chatting to rank up')}*!`;

  await sock.sendMessage(from, { 
    text: text, 
    mentions: sorted.map(x => x[0]) 
  }, { quoted: msg });
};

const trackMessage = (from, sender, botNum) => {
  db.addMsgCount(from, sender, botNum.replace(/[^0-9]/g, ''));
};

module.exports = { totalchat, trackMessage };