// ============================================
//     Prince Md — COMMANDS/UTILITY.JS
//     Utility Commands
// ============================================

'use strict';

const axios  = require('axios');
const { toSmallCaps, toBold, toItalic, toMono, toFancy } = require('../utils/fonts');
const logger = require('../utils/logger');

// ─── .tts — Text to Speech ────────────────────
const tts = async (ctx) => {
  const { sock, from, msg, args, react, isGroup } = ctx;
  await react('🔊');

  const text = args.join(' ');
  if (!text) return ctx.reply('❌ *Provide text!*\nUsage: `.tts Hello world`');

  try {
    // StreamElements TTS — natural female voice (Brian/Amy)
    const voice = 'Amy'; // Natural female AI voice
    const url   = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${encodeURIComponent(text)}`;

    const buffer = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });

    if (!buffer.data || buffer.data.byteLength < 100) throw new Error('Empty audio');

    const audioBuf = Buffer.from(buffer.data);
    const waveform = Buffer.from(Array(64).fill(0).map(() => Math.floor(Math.random() * 100)));

    await sock.sendMessage(from, {
      audio:    audioBuf,
      mimetype: 'audio/mpeg',
      ptt:      false,  // attachment style — device se utha ke bheji audio jaisi
      fileName: 'voice.mp3',
    }, { quoted: msg });

    await react('✅');
  } catch (err) {
    // Fallback — Google TTS
    try {
      const lang = 'en';
      const gUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;
      const buf2 = await axios.get(gUrl, {
        responseType: 'arraybuffer', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      const waveform2 = Buffer.from(Array(64).fill(0).map(() => Math.floor(Math.random() * 100)));
      await sock.sendMessage(from, {
        audio: Buffer.from(buf2.data), mimetype: 'audio/mpeg', ptt: false, fileName: 'voice.mp3',
      }, { quoted: msg });
      await react('✅');
    } catch {
      logger.error('tts error:', err.message);
      await react('❌');
      await ctx.reply('❌ *TTS failed!*\n_Try a shorter text._');
    }
  }
};

// ─── .translate ───────────────────────────────
const translate = async (ctx) => {
  const { args, react } = ctx;
  await react('🌐');

  if (args.length < 2) {
    return ctx.reply(
      '❌ *Usage:* `.translate <lang> <text>`\n\n*Examples:*\n`.translate ur Hello world`\n`.translate ar How are you`\n\n*Common codes:* ur=Urdu, ar=Arabic, es=Spanish, fr=French, de=German, zh=Chinese, ja=Japanese'
    );
  }

  const lang = args[0].toLowerCase();
  const text = args.slice(1).join(' ');

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await axios.get(url, { timeout: 10000 });
    const translated = res.data?.[0]?.map(item => item?.[0]).filter(Boolean).join('') || '';
    const detectedLang = res.data?.[2] || 'auto';

    if (!translated) throw new Error('Empty translation');

    await ctx.reply(
      `🌐 *Translation*\n\n` +
      `📥 *From (${detectedLang}):* ${text}\n` +
      `📤 *To (${lang}):* ${translated}`
    );
    await react('✅');
  } catch (err) {
    logger.error('translate error:', err.message);
    await react('❌');
    await ctx.reply('❌ *Translation failed!*\n_Check the language code and try again._');
  }
};

// ─── .qr — Generate QR Code ───────────────────
const qr = async (ctx) => {
  const { sock, from, msg, args, react } = ctx;
  await react('⏳');

  const text = args.join(' ');
  if (!text) return ctx.reply('❌ *Provide text or URL!*\nUsage: `.qr https://example.com`');

  try {
    const QRCode = require('qrcode');
    const buffer = await QRCode.toBuffer(text, {
      type:            'png',
      width:           400,
      margin:          2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    await sock.sendMessage(from, {
      image:   buffer,
      caption: `🔲 *QR Code Generated!*\n\n📝 *Content:* ${text}\n\n_by ${toSmallCaps('Prince Md')}_`,
    });

    await react('✅');
  } catch (err) {
    logger.error('qr error:', err.message);
    await react('❌');
    await ctx.reply('❌ *Failed to generate QR Code!*');
  }
};

// ─── .calc — Calculator ───────────────────────
const calc = async (ctx) => {
  const { args, react } = ctx;
  await react('🧮');

  const expression = args.join(' ').replace(/[^0-9+\-*/.() %^]/g, '');
  if (!expression) return ctx.reply('❌ *Provide a math expression!*\nUsage: `.calc 25 * 4 + 10`');

  try {
    // Safe eval using Function constructor
    const result = Function('"use strict"; return (' + expression + ')')();
    if (typeof result !== 'number' || !isFinite(result)) throw new Error('Invalid result');

    await ctx.reply(
      `🧮 *Calculator*\n\n` +
      `📝 *Expression:* \`${expression}\`\n` +
      `✅ *Result:* \`${result}\``
    );
    await react('✅');
  } catch {
    await react('❌');
    await ctx.reply('❌ *Invalid expression!*\nExample: `.calc 10 * 5 + 3`');
  }
};

// ─── .shorturl — URL Shortener ────────────────
const shorturl = async (ctx) => {
  const { args, react } = ctx;
  await react('🔗');

  const url = args[0];
  if (!url || !url.startsWith('http')) {
    return ctx.reply('❌ *Provide a valid URL!*\nUsage: `.shorturl https://example.com`');
  }

  try {
    // TinyURL free API
    const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, { timeout: 8000 });
    await ctx.reply(
      `🔗 *URL Shortened!*\n\n` +
      `📎 *Original:* ${url}\n` +
      `✂️ *Short:* ${res.data}`
    );
    await react('✅');
  } catch (err) {
    logger.error('shorturl error:', err.message);
    await react('❌');
    await ctx.reply('❌ *Failed to shorten URL!*');
  }
};

// ─── .reverse — Reverse text ──────────────────
const reverse = async (ctx) => {
  const { args, react } = ctx;
  await react('🔄');

  const text = args.join(' ');
  if (!text) return ctx.reply('❌ *Provide text!*\nUsage: `.reverse Hello World`');

  const reversed = text.split('').reverse().join('');
  await ctx.reply(`🔄 *Reversed Text*\n\n${reversed}`);
  await react('✅');
};

// ─── .fancy — Fancy fonts ─────────────────────
const fancy = async (ctx) => {
  const { args, react } = ctx;
  await react('✨');

  const text = args.join(' ');
  if (!text) return ctx.reply('❌ *Provide text!*\nUsage: `.fancy Hello World`');

  const response =
`✨ *Fancy Text Generator*

📝 *Input:* ${text}

━━━━━━━━━━━━━━━━━━
🅰️ *Small Caps:* ${toSmallCaps(text)}
𝗕 *Bold:*       ${toBold(text)}
𝘐 *Italic:*     ${toItalic(text)}
𝙼 *Mono:*       ${toMono(text)}
✦ *Fancy:*      ${toFancy(text)}
━━━━━━━━━━━━━━━━━━`;

  await ctx.reply(response);
  await react('✅');
};

// ─── .weather ─────────────────────────────────
const weather = async (ctx) => {
  const { args, react } = ctx;
  await react('🌤️');

  const city = args.join(' ');
  if (!city) return ctx.reply('❌ *Provide a city!*\nUsage: `.weather Karachi`');

  try {
    // wttr.in free weather API (no key needed)
    const res = await axios.get(
      `https://wttr.in/${encodeURIComponent(city)}?format=j1`,
      { timeout: 10000 }
    );
    const data    = res.data;
    const current = data.current_condition[0];
    const area    = data.nearest_area[0];
    const areaName = area.areaName[0]?.value || city;
    const country  = area.country[0]?.value || '';

    const text =
`🌤️ *Weather Report*

📍 *Location:* ${areaName}, ${country}
🌡️ *Temperature:* ${current.temp_C}°C / ${current.temp_F}°F
🌬️ *Feels Like:* ${current.FeelsLikeC}°C
💧 *Humidity:* ${current.humidity}%
💨 *Wind:* ${current.windspeedKmph} km/h ${current.winddir16Point}
👁️ *Visibility:* ${current.visibility} km
☁️ *Condition:* ${current.weatherDesc[0]?.value}
🌅 *UV Index:* ${current.uvIndex}`;

    await ctx.reply(text);
    await react('✅');
  } catch (err) {
    logger.error('weather error:', err.message);
    await react('❌');
    await ctx.reply('❌ *Failed to get weather!*\n_Check the city name and try again._');
  }
};

// ─── .wiki ────────────────────────────────────
const wiki = async (ctx) => {
  const { args, react } = ctx;
  await react('📖');

  const query = args.join(' ');
  if (!query) return ctx.reply('❌ *Provide a search term!*\nUsage: `.wiki Artificial Intelligence`');

  try {
    const res = await axios.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`,
      { timeout: 10000 }
    );
    const data = res.data;
    if (data.type === 'disambiguation') {
      return ctx.reply(`📖 *${data.title}*\n\n${data.extract}\n\n_Try a more specific term._`);
    }

    const text =
`📖 *Wikipedia*

*${data.title}*

${data.extract?.slice(0, 800)}${data.extract?.length > 800 ? '...' : ''}

🔗 ${data.content_urls?.desktop?.page || ''}`;

    await ctx.reply(text);
    await react('✅');
  } catch (err) {
    logger.error('wiki error:', err.message);
    await react('❌');
    await ctx.reply('❌ *Not found on Wikipedia!*\n_Try a different search term._');
  }
};

module.exports = { tts, translate, qr, calc, shorturl, reverse, fancy, weather, wiki };