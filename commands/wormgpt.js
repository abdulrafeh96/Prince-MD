// ============================================
//      Prince Md â€” COMMANDS/WORMGPT.JS
//      WormGPT AI Command
// ============================================

'use strict';

const { toSmallCaps } = require('../utils/fonts');
const logger = require('../utils/logger');
const { askAi } = require('../utils/aiProvider');

const askUniversalAi = (query, mode) => {
  const systemPrompt = mode === 'cursorai'
    ? 'You are Cursor AI assistant, an expert coding assistant. Provide practical, concise coding help.'
    : 'Reply directly and clearly to the user prompt.';
  return askAi(query, {
    systemPrompt,
    endpoint: mode === 'cursorai' ? 'cursorai' : 'wormgpt',
  });
};

const runAi = async (ctx, mode = 'wormgpt') => {
  const { sock, from, msg, args, react } = ctx;
  const query = args.join(' ');

  if (!query) {
    return ctx.reply(
      `âŒ *${toSmallCaps('provide a question')}!*\n\n` +
      `ðŸ“Œ *${toSmallCaps('usage')}:* .${mode === 'cursorai' ? 'cursorai' : 'wormgpt'} <question>`
    );
  }

  // âœ… Typing animation â€” 2 seconds
  await sock.sendPresenceUpdate('composing', from);
  await new Promise(r => setTimeout(r, 2000));
  await sock.sendPresenceUpdate('paused', from);

  await react('ðŸ¤–');

  try {
    const reply = await askUniversalAi(query, mode);

    if (!reply) {
      await react('âŒ');
      return ctx.reply(`âŒ *${toSmallCaps('no response from ai')}*`);
    }

    await react('âœ…');
    await sock.sendMessage(from, {
      text: `ðŸ¤– *${toSmallCaps(mode === 'cursorai' ? 'cursor ai' : 'wormgpt')}*\n\n${reply}`
    }, { quoted: msg });

  } catch (err) {
    logger.error(`${mode} error:`, err.message);
    await react('âŒ');

    const status = err.response?.status;
    let errMsg = `âŒ *${toSmallCaps('something went wrong, try again later')}*`;

    if (status === 504 || status === 503) {
      errMsg = `â±ï¸ *${toSmallCaps('api timeout â€” thodi der baad try karo')}*`;
    } else if (err.code === 'ECONNABORTED') {
      errMsg = `âŒ *${toSmallCaps('request timeout â€” server slow hai')}*`;
    }

    await ctx.reply(errMsg);
  }
};

const wormgpt = async (ctx) => runAi(ctx, 'wormgpt');
const cursorai = async (ctx) => runAi(ctx, 'cursorai');

module.exports = { wormgpt, cursorai };

