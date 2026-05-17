'use strict';
const axios = require('axios');

const wallpaper = async (ctx) => {
  const { sock, msg, from, args, reply, react } = ctx;

  const query = args.join(' ').trim();
  if (!query) return reply('❌ Text likho!\nExample: `.wp car`');

  await react('🖼️');

  try {
    const res = await axios.get('https://apiskeith.top/download/wallpaper', {
      params: { text: query, page: 1 },
      timeout: 15000,
    });

    const data = res.data;
    if (!data.status || !data.result || data.result.length === 0) {
      return reply('❌ Koi wallpaper nahi mila. Dusra text try karo.');
    }

    await react('✅');

    // Har result ki pehli (best quality) image bhejo
    for (const item of data.result) {
      const imageUrl = item.image?.[0];
      if (!imageUrl) continue;

      try {
        await sock.sendMessage(from, {
          image: { url: imageUrl },
          caption: `🖼️ *${item.type}*`,
        }, { quoted: msg });

        // Thori si delay taki spam na ho
        await new Promise(r => setTimeout(r, 500));
      } catch {
        // Agar ek image fail ho toh baaki continue karo
        continue;
      }
    }

  } catch (err) {
    await react('❌');
    reply(`❌ Error: ${err.message}`);
  }
};

module.exports = { wallpaper };
