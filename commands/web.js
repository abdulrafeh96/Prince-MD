'use strict';
const axios = require('axios');
const { toSmallCaps } = require('../utils/fonts');

const web = async (ctx) => {
  const { sock, from, msg, args, react, reply } = ctx;

  if (args.length === 0) {
    return reply(`❌ *${toSmallCaps('please provide a website url')}.*`);
  }

  let url = args[0];
  // Agar user ne http/https nahi likha toh automatically laga do
  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }

  await react('⏳');

  try {
    // Tumhari di gayi API use ho rahi hai
    const apiUrl = `https://apiskeith.top/tool/screenshot?url=${encodeURIComponent(url)}`;
    
    // Screenshot bhejne ke liye image buffer ya direct url use karo
    await sock.sendMessage(from, { 
      image: { url: apiUrl }, 
      caption: `📸 *${toSmallCaps('website screenshot of')}* ${url}\n\n> ${toSmallCaps('powered by Prince Md')}` 
    }, { quoted: msg });

    await react('✅');
  } catch (err) {
    console.error('Web Screenshot Error:', err);
    await react('❌');
    await reply(`❌ *${toSmallCaps('failed to capture screenshot')}*`);
  }
};

module.exports = { web };