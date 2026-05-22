'use strict';

const { askAi } = require('../utils/aiProvider');

const claude = async (ctx) => {
  const { args, reply, react } = ctx;
  const query = args.join(' ').trim();
  if (!query) return reply('❌ Please provide a prompt.\nExample: `.claude hello`');

  await react('🤖');

  try {
    const output = await askAi(query, { endpoint: 'claudeai' });
    await react('✅');
    await reply(output);
  } catch (err) {
    await react('❌');
    await reply(`❌ Claude is not available right now. Please try again later.`);
  }
};

module.exports = { claude };
