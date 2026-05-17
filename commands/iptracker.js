// ============================================
//      Prince Md — COMMANDS/IPTRACKER.JS
//      IP Address Tracker
// ============================================

'use strict';

const axios = require('axios');
const { toSmallCaps } = require('../utils/fonts');

// ─── .iptracker ────────────────────────────────────────────
const iptracker = async (ctx) => {
  const { sock, msg, from, sender, args } = ctx;

  const ip = args[0];
  if (!ip) {
    return ctx.reply(`❌ *${toSmallCaps('provide an IP address')}*\n\n*Example:* .iptracker 8.8.8.8\n*Example:* .iptracker 192.168.1.1`);
  }

  // Basic IP validation
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!ipRegex.test(ip)) {
    return ctx.reply(`❌ *${toSmallCaps('invalid IP address')}*\n\n${toSmallCaps('please provide a valid IP address')}`);
  }

  await ctx.reply(`🔍 *${toSmallCaps('tracking IP address')}* ${ip}...`);

  try {
    // Using free IP geolocation API
    const response = await axios.get(`http://ip-api.com/json/${ip}`);
    
    if (response.data.status === 'fail') {
      return ctx.reply(`❌ *${toSmallCaps('IP tracking failed')}*\n\n${toSmallCaps('error')}: ${response.data.message}`);
    }

    const data = response.data;

    let responseText = `🌐 *${toSmallCaps('IP address tracker')}*\n\n`;
    responseText += `🔢 *${toSmallCaps('IP address')}:* ${data.query}\n`;
    responseText += `🌍 *${toSmallCaps('country')}:* ${data.country || 'Unknown'}\n`;
    responseText += `🏙️ *${toSmallCaps('region')}:* ${data.regionName || 'Unknown'}\n`;
    responseText += `🏙️ *${toSmallCaps('city')}:* ${data.city || 'Unknown'}\n`;
    responseText += `📮 *${toSmallCaps('zip code')}:* ${data.zip || 'Unknown'}\n`;
    responseText += `🌐 *${toSmallCaps('timezone')}:* ${data.timezone || 'Unknown'}\n`;
    responseText += `📡 *${toSmallCaps('ISP')}:* ${data.isp || 'Unknown'}\n`;
    responseText += `🏢 *${toSmallCaps('organization')}:* ${data.org || 'Unknown'}\n`;
    responseText += `📶 *${toSmallCaps('AS')}:* ${data.as || 'Unknown'}\n`;
    responseText += `📍 *${toSmallCaps('coordinates')}:* ${data.lat ? `${data.lat}, ${data.lon}` : 'Unknown'}\n\n`;
    
    responseText += `⚠️ *${toSmallCaps('disclaimer')}*\n`;
    responseText += `${toSmallCaps('this information is based on IP geolocation data and may not be 100% accurate. actual location may vary.')}\n\n`;
    responseText += `> ${toSmallCaps('powered by ip-api.com')}`;

    await ctx.reply(responseText);

  } catch (error) {
    console.log('[IPTRACKER ERROR]', error.message);
    await ctx.reply(`❌ *${toSmallCaps('IP tracking failed')}*\n\n${toSmallCaps('please try again later')}`);
  }
};

module.exports = { iptracker };
