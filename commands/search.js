// ============================================
//      Prince Md — COMMANDS/SEARCH.JS
//      Search Commands (Free APIs)
// ============================================

'use strict';

const axios  = require('axios');
const { toSmallCaps } = require('../utils/fonts');
const { truncate }    = require('../utils/helpers');
const logger = require('../utils/logger');

// ─── .google ──────────────────────────────────
const google = async (ctx) => {
  const { sock, from, msg, args, react } = ctx;
  await react('🔍');

  const query = args.join(' ');
  if (!query) return ctx.reply('❌ *Provide a search query!*\nUsage: `.google WhatsApp bots`');

  try {
    const res = await axios.get(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      { timeout: 10000 }
    );
    const data = res.data;

    let text = `🔍 *Search: ${query}*\n\n`;

    if (data.AbstractText) {
      text += `📝 *Result:*\n${truncate(data.AbstractText, 600)}\n\n`;
      if (data.AbstractURL) text += `🔗 *Source:* ${data.AbstractURL}\n`;
    } else if (data.RelatedTopics?.length) {
      text += `📋 *Related Results:*\n`;
      const topics = data.RelatedTopics.slice(0, 5);
      topics.forEach((t, i) => {
        if (t.Text) text += `${i + 1}. ${truncate(t.Text, 120)}\n`;
      });
    } else {
      text += `_No instant answer found._\n🔗 Search on Google: https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }

    await ctx.reply(text);
    await react('✅');
  } catch (err) {
    logger.error('google error:', err.message);
    await react('❌');
    await ctx.reply(`❌ *Search failed!*\n🔗 Try: https://www.google.com/search?q=${encodeURIComponent(args.join('+'))}`);
  }
};

// ─── .image ───────────────────────────────────
const image = async (ctx) => {
  const { sock, from, msg, args, react } = ctx;
  await react('🖼️');

  const query = args.join(' ');
  if (!query) return ctx.reply('❌ *Provide a search term!*\nUsage: `.image sunset mountains`');

  // Pehle searching msg bhejo
  await sock.sendMessage(from, {
    text: toSmallCaps(`searching images for ${query}...`),
  }, { quoted: msg });

  try {
    let images = [];

    // API Try
    try {
      const res = await axios.get(`https://apiskeith.top/search/images`, {
        params: { query: query },
        timeout: 10000,
      });
      if (res.data?.result?.length > 0) {
        images = res.data.result.slice(0, 5).map(item => item.url);
      }
    } catch (e) {
      logger.warn('Keith API failed, using fallback.');
    }

    // Fallback if Keith fails
    if (images.length === 0) {
      const apiKey = '49266185-115f20625f3810a957813a406';
      const res = await axios.get(`https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&image_type=photo&per_page=5`);
      if (res.data?.hits?.length > 0) {
        images = res.data.hits.map(hit => hit.largeImageURL);
      }
    }

    if (images.length === 0) throw new Error('No images found');

    // Saari images ek saath parallel bhejo — no caption, no delay
    await Promise.all(
      images.map(imgUrl =>
        axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 15000 })
          .then(buf =>
            sock.sendMessage(from, {
              image: Buffer.from(buf.data),
            })
          )
          .catch(() => {}) // agar ek fail ho skip karo
      )
    );

    await react('✅');
  } catch (err) {
    logger.error('image error:', err.message);
    await react('❌');
    await ctx.reply('❌ *Image search failed!*\n_Try a different search term._');
  }
};

// ─── .lyrics ──────────────────────────────────
const lyrics = async (ctx) => {
  const { args, react } = ctx;
  await react('🎵');

  const query = args.join(' ');
  if (!query) return ctx.reply('❌ *Provide a song name!*\nUsage: `.lyrics Shape of You`');

  try {
    let artist = '', title = query;
    if (query.includes(' - ')) {
      [artist, title] = query.split(' - ').map(s => s.trim());
    } else if (query.includes(' by ')) {
      [title, artist] = query.split(' by ').map(s => s.trim());
    }

    let url = artist
      ? `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
      : `https://api.lyrics.ovh/suggest/${encodeURIComponent(query)}`;

    const res = await axios.get(url, { timeout: 10000 });

    if (artist && res.data?.lyrics) {
      const lyricsText = res.data.lyrics.slice(0, 1500);
      await ctx.reply(`🎵 *Lyrics: ${title}*\n${artist ? `👤 *Artist:* ${artist}\n` : ''}\n━━━━━━━━━━━━━━━━━━\n${lyricsText}`);
    } else {
      const data = res.data;
      if (data?.data?.length) {
        const song      = data.data[0];
        const lyricsRes = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(song.artist.name)}/${encodeURIComponent(song.title)}`);
        const lyricsText = lyricsRes.data.lyrics.slice(0, 1500);
        await ctx.reply(`🎵 *${song.title}*\n👤 *Artist:* ${song.artist.name}\n\n━━━━━━━━━━━━━━━━━━\n${lyricsText}`);
      } else {
        throw new Error('Song not found');
      }
    }
    await react('✅');
  } catch (err) {
    logger.error('lyrics error:', err.message);
    await react('❌');
    await ctx.reply('❌ *Lyrics not found!*\n_Try format: `.lyrics Artist - Song Title`_');
  }
};

// ─── .weather ─────────────────────────────────
const weather = async (ctx) => {
  const { args, react } = ctx;
  await react('🌤️');

  const query = args.join(' ').trim();
  if (!query) return ctx.reply('❌ *City name do!*\nUsage: `.weather Karachi`');

  try {
    const res = await axios.get(
      `https://wttr.in/${encodeURIComponent(query)}?format=j1`,
      { timeout: 10000 }
    );
    const data = res.data;
    const cur  = data.current_condition?.[0];
    const area = data.nearest_area?.[0];

    if (!cur) throw new Error('No data found');

    const city    = area?.areaName?.[0]?.value || query;
    const country = area?.country?.[0]?.value || '';
    const desc    = cur.weatherDesc?.[0]?.value || '';
    const tempC   = cur.temp_C;
    const feelsC  = cur.FeelsLikeC;
    const humidity= cur.humidity;
    const wind    = cur.windspeedKmph;
    const vis     = cur.visibility;

    const text =
`🌤️ *${toSmallCaps('weather report')}*

━━━━━━━━━━━━━━━━━━━━
📍 *${toSmallCaps('location')}:* ${city}${country ? ', ' + country : ''}
🌡️ *${toSmallCaps('temperature')}:* ${tempC}°C
🤔 *${toSmallCaps('feels like')}:* ${feelsC}°C
☁️ *${toSmallCaps('condition')}:* ${desc}
💧 *${toSmallCaps('humidity')}:* ${humidity}%
💨 *${toSmallCaps('wind speed')}:* ${wind} km/h
👁️ *${toSmallCaps('visibility')}:* ${vis} km
━━━━━━━━━━━━━━━━━━━━`;

    await ctx.reply(text);
    await react('✅');
  } catch (err) {
    logger.error('weather error:', err.message);
    await react('❌');
    await ctx.reply('❌ *Weather fetch failed!*\n_City name check karo aur dobara try karo._');
  }
};

module.exports = { google, image, lyrics, weather };
