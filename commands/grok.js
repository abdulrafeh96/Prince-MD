'use strict';
const axios = require('axios');
const { toSmallCaps } = require('../utils/fonts');

const grok = async (ctx) => {
  const { args, react, reply } = ctx;
  const prompt = args.join(' ');

  if (!prompt) {
    return reply(`âŒ *${toSmallCaps('please provide a prompt')}*`);
  }

  await react('â³');

  try {
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: "llama-3.3-70b-versatile", // Yeh model sabse best hai aur available hai
      messages: [{ role: "user", content: prompt }]
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY || ''}`,
        'Content-Type': 'application/json'
      }
    });

    const answer = response.data.choices[0].message.content;
    
    // Response ko Small Caps mein convert karke bhejo
    await reply(`ðŸ¤– *${toSmallCaps('eddy ai')}*\n\n${answer}\n\n> ${toSmallCaps('powered by Prince Md')}`);
    await react('âœ…');

  } catch (err) {
    console.error('Grok/AI Error:', err.response?.data || err.message);
    await react('âŒ');
    await reply(`âŒ *${toSmallCaps('ai failed to respond')}*`);
  }
};

module.exports = { grok };
