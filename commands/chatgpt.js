// ============================================
//      Prince Md — COMMANDS/CHATGPT.JS
//      ChatGPT Integration
// ============================================

'use strict';

const { toSmallCaps } = require('../utils/fonts');
const { askAi } = require('../utils/aiProvider');

// ─── .chatgpt ────────────────────────────────────────────
const chatgpt = async (ctx) => {
  const { sock, msg, from, sender, args } = ctx;

  const query = args.join(' ');
  if (!query) {
    return ctx.reply(`❌ *${toSmallCaps('provide a question or prompt')}*\n\n*Example:* .chatgpt What is artificial intelligence?`);
  }

  await ctx.reply(`🤖 *${toSmallCaps('thinking with ChatGPT')}*...`);

  try {
    const answer = await askAi(query, { endpoint: 'chatgpt' });

    let responseText = `🤖 *${toSmallCaps('ChatGPT Response')}*\n\n`;
    responseText += `📝 *${toSmallCaps('question')}:* ${query}\n\n`;
    responseText += `💡 *${toSmallCaps('answer')}:*\n${answer}\n\n`;
    responseText += `> ${toSmallCaps('powered by OpenAI ChatGPT')}`;

    await ctx.reply(responseText);

  } catch (error) {
    console.log('[CHATGPT ERROR]', error.message);
    
    const fallbackResponse = `I'm sorry, the AI service is not responding right now. Please try again later.`;
    
    let responseText = `🤖 *${toSmallCaps('ChatGPT Response')}*\n\n`;
    responseText += `📝 *${toSmallCaps('question')}:* ${query}\n\n`;
    responseText += `💡 *${toSmallCaps('answer')}:*\n${fallbackResponse}\n\n`;
    responseText += `> ${toSmallCaps('service temporarily unavailable')}`;
    
    await ctx.reply(responseText);
  }
};

module.exports = { chatgpt };
