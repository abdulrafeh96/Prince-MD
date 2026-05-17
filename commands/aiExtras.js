'use strict';

const axios = require('axios');

const runAiProvider = async (ctx, providerName, endpoint) => {
  const { args, reply, react } = ctx;
  const query = args.join(' ').trim();
  if (!query) return reply(`❌ Please provide a prompt. Example: .${providerName} Explain recursion.`);

  await react('🤖');

  try {
    const res = await axios.get(`https://apiskeith.top/ai/${endpoint}`, {
      params: { q: query },
      timeout: 20000,
    });

    const data = res.data || {};
    const output = data.result || data.answer || data.text || data.response || data.reply;

    if (!output) {
      throw new Error('No response from provider');
    }

    return reply(`🤖 *${providerName.toUpperCase()} Response*\n\n${output}`);
  } catch (err) {
    console.log(`[AIEXTRAS ${providerName.toUpperCase()} ERROR]`, err.message || err);
    return reply(`⚠️ *${providerName}* is not available right now. Please try again later.`);
  }
};

const devin = async (ctx) => runAiProvider(ctx, 'devin', 'devin');
const windsurf = async (ctx) => runAiProvider(ctx, 'windsurf', 'windsurf');
const codex = async (ctx) => runAiProvider(ctx, 'codex', 'codex');
const gpt54 = async (ctx) => runAiProvider(ctx, 'gpt5.4', 'gpt54');
const bolt = async (ctx) => runAiProvider(ctx, 'bolt', 'bolt');
const kiro = async (ctx) => runAiProvider(ctx, 'kiro', 'kiro');

module.exports = { devin, windsurf, codex, gpt54, bolt, kiro };