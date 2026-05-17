// ============================================
//      Prince Md — COMMANDS/CHATGPT.JS
//      ChatGPT Integration
// ============================================

'use strict';

const axios = require('axios');
const { toSmallCaps } = require('../utils/fonts');

// ─── .chatgpt ────────────────────────────────────────────
const chatgpt = async (ctx) => {
  const { sock, msg, from, sender, args } = ctx;

  const query = args.join(' ');
  if (!query) {
    return ctx.reply(`❌ *${toSmallCaps('provide a question or prompt')}*\n\n*Example:* .chatgpt What is artificial intelligence?`);
  }

  await ctx.reply(`🤖 *${toSmallCaps('thinking with ChatGPT')}*...`);

  try {
    // Using OpenAI API (you'll need to add your API key)
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: query
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': 'Bearer YOUR_OPENAI_API_KEY', // Replace with your API key
        'Content-Type': 'application/json'
      }
    });

    const answer = response.data.choices[0].message.content;

    let responseText = `🤖 *${toSmallCaps('ChatGPT Response')}*\n\n`;
    responseText += `📝 *${toSmallCaps('question')}:* ${query}\n\n`;
    responseText += `💡 *${toSmallCaps('answer')}:*\n${answer}\n\n`;
    responseText += `> ${toSmallCaps('powered by OpenAI ChatGPT')}`;

    await ctx.reply(responseText);

  } catch (error) {
    console.log('[CHATGPT ERROR]', error.message);
    
    // Fallback response if API fails
    const fallbackResponse = `I'm sorry, I'm having trouble connecting to ChatGPT right now. Please try again later or check if the API key is properly configured.`;
    
    let responseText = `🤖 *${toSmallCaps('ChatGPT Response')}*\n\n`;
    responseText += `📝 *${toSmallCaps('question')}:* ${query}\n\n`;
    responseText += `💡 *${toSmallCaps('answer')}:*\n${fallbackResponse}\n\n`;
    responseText += `> ${toSmallCaps('service temporarily unavailable')}`;
    
    await ctx.reply(responseText);
  }
};

module.exports = { chatgpt };
