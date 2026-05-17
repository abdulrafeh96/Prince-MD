'use strict';
const axios = require('axios');
const { toSmallCaps } = require('../utils/fonts');

const bbc = async (ctx) => {
  const { sock, from, msg, react, reply } = ctx;

  await react('⏳');

  try {
    const response = await axios.get('https://apiskeith.top/news/bbc');
    const data = response.data;

    // Check karo ke news data exist karta hai ya nahi
    if (!data || !data.result || !data.result.topStories || data.result.topStories.length === 0) {
      throw new Error('No news found');
    }

    // Sirf top 5 stories nikal rahe hain
    const news = data.result.topStories.slice(0, 5);
    
    for (const item of news) {
      // Caption format: Title + Description + URL + Signature
      let caption = `*${item.title}*\n\n`;
      if (item.description) caption += `${item.description}\n\n`;
      caption += `🔗 ${item.url}\n\n`;
      caption += `> ${toSmallCaps('prince md news')}`;

      // Image URL agar empty ho toh fallback image use karo
      const imageUrl = item.imageUrl || 'https://static.files.bbci.co.uk/bbcdotcom/web/20260409-151157-6d668e92bf-web-3.1.0-1/grey-placeholder.png';

      // Har news ko thumbnail ke sath bhejo
      await sock.sendMessage(from, { 
        image: { url: imageUrl }, 
        caption: caption 
      }, { quoted: msg });
      
      // WhatsApp block na kare isliye 1 second ka pause
      await new Promise(r => setTimeout(r, 1000));
    }

    await react('✅');

  } catch (err) {
    console.error('BBC News Error:', err.message);
    await react('❌');
    await reply(`❌ *${toSmallCaps('failed to fetch news')}*`);
  }
};

module.exports = { bbc };