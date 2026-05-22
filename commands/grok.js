'use strict';
const { toSmallCaps } = require('../utils/fonts');
const { askAi } = require('../utils/aiProvider');

const grok = async (ctx) => {
  const { args, react, reply } = ctx;
  const prompt = args.join(' ');

  if (!prompt) {
    return reply(`âŒ *${toSmallCaps('please provide a prompt')}*`);
  }

  await react('â³');

  try {
    const answer = await askAi(prompt, { endpoint: 'grok' });
    
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
