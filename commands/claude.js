'use strict';
const axios = require('axios');

const claude = async (ctx) => {
  const { args, reply, react } = ctx;

  const query = args.join(' ').trim();
  if (!query) return reply('❌ Kuch likho!\nExample: `.claude hello`');

  await react('🤖');

  try {
    const res = await axios.get('https://apiskeith.top/ai/claudeai', {
      params: { q: query },
      timeout: 20000,
    });

    const data = res.data;
    if (!data.status || !data.result) {
      return reply('❌ Koi response nahi mila. Dobara try karo.');
    }

    await react('✅');
    await reply(data.result);

  } catch (err) {
    await react('❌');
    await reply(`❌ Error: ${err.message}`);
  }
};

module.exports = { claude };
