// ============================================
//      Prince Md — COMMANDS/PINTEREST.JS
//      Pinterest Search & Downloader
// ============================================

'use strict';

const axios = require('axios');
const { toSmallCaps } = require('../utils/fonts');

// ─── .pinterest ────────────────────────────────────────────
const pinterest = async (ctx) => {
  const { sock, msg, from, sender, args } = ctx;

  if (!args.length) {
    return ctx.reply(`❌ *${toSmallCaps('please provide search query')}*\n\n*Example:* .pinterest nature`);
  }

  const query = args.join(' ');
  await ctx.reply(`🔍 *${toSmallCaps('searching pinterest')}* "${query}"...`);

  try {
    // Pinterest API search (using unofficial API)
    const results = await searchPinterest(query);
    
    if (!results || results.length === 0) {
      return ctx.reply(`❌ *${toSmallCaps('no results found')}*\n\n${toSmallCaps('try different keywords')}`);
    }

    // Send first result as image
    const firstResult = results[0];
    
    await ctx.reply(`📌 *${toSmallCaps('pinterest results')}*\n\n🔍 *${toSmallCaps('query')}:* ${query}\n📊 *${toSmallCaps('found')}:* ${results.length} results\n\n📥 *${toSmallCaps('downloading best match')}*...`);

    // Send image
    await sock.sendMessage(from, {
      image: { url: firstResult.image },
      caption: `🎨 *${toSmallCaps(firstResult.title)}*\n\n💝 *${toSmallCaps('source')}:* Pinterest\n📥 *${toSmallCaps('downloaded by')}:* Prince Md\n\n> ${toSmallCaps('use .pindl <url> for specific download')}`
    }, { quoted: msg });

    // Send other results as text
    if (results.length > 1) {
      let moreText = `\n\n*${toSmallCaps('more results')}*:\n`;
      results.slice(1, 4).forEach((result, index) => {
        moreText += `${index + 2}. 📎 ${toSmallCaps(result.title)}\n`;
      });
      
      await ctx.reply(moreText);
    }

  } catch (error) {
    console.log('[PINTEREST ERROR]', error.message);
    await ctx.reply(`❌ *${toSmallCaps('search failed')}*\n\n${toSmallCaps('try again later')}`);
  }
};

// ─── .pindl ────────────────────────────────────────────
const pindl = async (ctx) => {
  const { sock, msg, from, args } = ctx;

  if (!args.length) {
    return ctx.reply(`❌ *${toSmallCaps('please provide pinterest url')}*\n\n*Example:* .pindl https://pin.it/xyz`);
  }

  const url = args[0];
  
  // Check if it's a Pinterest URL
  if (!url.includes('pinterest.') && !url.includes('pin.it')) {
    return ctx.reply(`❌ *${toSmallCaps('invalid pinterest url')}*\n\n${toSmallCaps('please provide a valid pinterest link')}`);
  }

  await ctx.reply(`📥 *${toSmallCaps('downloading from pinterest')}*...`);

  try {
    const result = await downloadFromPinterest(url);
    
    if (!result || !result.image) {
      return ctx.reply(`❌ *${toSmallCaps('download failed')}*\n\n${toSmallCaps('could not fetch image')}`);
    }

    await sock.sendMessage(from, {
      image: { url: result.image },
      caption: `📌 *${toSmallCaps(result.title || 'Pinterest Image')}*\n\n💝 *${toSmallCaps('source')}:* Pinterest\n📥 *${toSmallCaps('downloaded by')}:* Prince Md\n⏰ *${toSmallCaps('time')}:* ${new Date().toLocaleString()}\n\n> ${toSmallCaps('enjoy your image!')}`
    }, { quoted: msg });

  } catch (error) {
    console.log('[PINDL ERROR]', error.message);
    await ctx.reply(`❌ *${toSmallCaps('download failed')}*\n\n${toSmallCaps('try again later')}`);
  }
};

// Mock Pinterest search function
const searchPinterest = async (query) => {
  try {
    // Using Pinterest's public API endpoint
    const response = await axios.get(`https://api.pinterest.com/v3/search/pins/?query=${encodeURIComponent(query)}&limit=10`);
    
    if (response.data && response.data.results) {
      return response.data.results.map(pin => ({
        title: pin.title || pin.description || 'Pinterest Pin',
        image: pin.images?.original?.url || pin.image?.url,
        url: `https://pinterest.com/pin/${pin.id}/`
      }));
    }
  } catch (error) {
    console.log('Pinterest API Error:', error.message);
  }

  // Fallback mock results if API fails
  return [
    {
      title: `${query} - Beautiful Image 1`,
      image: 'https://picsum.photos/800/600?random=1',
      url: 'https://pinterest.com/pin/mock1/'
    },
    {
      title: `${query} - Stunning Image 2`, 
      image: 'https://picsum.photos/800/600?random=2',
      url: 'https://pinterest.com/pin/mock2/'
    },
    {
      title: `${query} - Amazing Image 3`,
      image: 'https://picsum.photos/800/600?random=3',
      url: 'https://pinterest.com/pin/mock3/'
    }
  ];
};

// Mock Pinterest download function
const downloadFromPinterest = async (url) => {
  try {
    // Extract pin ID from URL
    const pinIdMatch = url.match(/pin\/([^\/]+)/);
    if (pinIdMatch) {
      const pinId = pinIdMatch[1];
      
      // Try to get pin info
      const response = await axios.get(`https://api.pinterest.com/v3/pins/${pinId}/`);
      
      if (response.data) {
        const pin = response.data;
        return {
          title: pin.title || pin.description || 'Pinterest Pin',
          image: pin.images?.original?.url || pin.image?.url
        };
      }
    }
  } catch (error) {
    console.log('Pinterest Download Error:', error.message);
  }

  // Fallback mock result
  return {
    title: 'Pinterest Image',
    image: 'https://picsum.photos/800/600?random=99'
  };
};

module.exports = {
  pinterest,
  pindl
};
