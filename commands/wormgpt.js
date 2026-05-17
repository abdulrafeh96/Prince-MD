// ============================================
//      Prince Md â€” COMMANDS/WORMGPT.JS
//      WormGPT AI Command
// ============================================

'use strict';

const axios = require('axios');
const { toSmallCaps } = require('../utils/fonts');
const logger = require('../utils/logger');

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const askGroq = async (query, mode) => {
  const systemPrompt = mode === 'cursorai'
    ? 'You are Cursor AI assistant, an expert coding assistant. Provide practical, concise coding help with: 1) Clear code examples, 2) Step-by-step explanations, 3) Best practices, 4) Common pitfalls to avoid. Focus on JavaScript, Python, and web development. Keep responses under 300 words.'
    : 'You are WormGPT style assistant. Reply directly and clearly to user prompts.';

  const res = await axios.post(GROQ_URL, {
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }
    ],
    temperature: 0.7,
    max_tokens: 700
  }, {
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });

  return res.data?.choices?.[0]?.message?.content?.trim() || '';
};

const askLegacyWormApi = async (query) => {
  // Try the free ChatGPT API first
  try {
    const res = await axios.post(
      'https://chatgpt-api.shn.hk/v1/',
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: query }]
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );
    return res.data?.choices?.[0]?.message?.content?.trim() || '';
  } catch (e) {
    // Fallback to old API
    const res = await axios.get(
      `https://apiskeith.top/ai/wormgpt?q=${encodeURIComponent(query)}`,
      { timeout: 30000 }
    );
    return (
      res.data?.result ||
      res.data?.response ||
      res.data?.answer ||
      res.data?.text ||
      res.data?.message ||
      (typeof res.data === 'string' ? res.data : '')
    );
  }
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
    let reply = '';
    try {
      reply = await askGroq(query, mode);
    } catch (e) {
      if (mode === 'wormgpt') {
        reply = await askLegacyWormApi(query);
      } else {
        throw e;
      }
    }

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

