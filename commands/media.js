// ============================================
//      Prince Md â€” COMMANDS/MEDIA.JS
//      Media Commands (Instant Metadata Version)
// ============================================

'use strict';

const axios  = require('axios');
const yts    = require('yt-search'); 
const { toSmallCaps } = require('../utils/fonts');
const logger = require('../utils/logger');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// â”€â”€â”€ Helper: Smart Query Sanitizer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const cleanQuery = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/gi, ' ')
    .replace(/(please|find|search|for|me|play|this|song|lyrics|video|official|audio|full|hd|mp3|download|can|you|the|want|to|listen|online)/gi, '') 
    .replace(/\s+/g, ' ') 
    .trim();
};

// â”€â”€â”€ Helper: Extreme YouTube Search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const searchYT = async (query) => {
  try {
    const sanitized = cleanQuery(query);
    const r = await yts(sanitized || query);
    const video = r.videos[0];
    
    if (video) {
      return { 
        id: video.videoId, 
        title: video.title, 
        url: video.url,
        author: video.author.name,
        thumbnail: video.thumbnail,
        duration: video.timestamp,
        views: video.views.toLocaleString()
      };
    }

    const apiSearch = await axios.get(`https://api.agatz.xyz/api/ytsearch?message=${encodeURIComponent(sanitized || query)}`, { timeout: 15000 }).catch(() => null);
    if (apiSearch?.data?.data?.[0]) {
      const first = apiSearch.data.data[0];
      return {
        id: first.videoId,
        title: first.title,
        url: first.url,
        author: 'YouTube',
        thumbnail: first.thumbnail,
        duration: '---',
        views: '---'
      };
    }

    return null;
  } catch (e) {
    logger.error('Search Logic Error:', e.message);
    return null;
  }
};

// â”€â”€â”€ .play / .song â€” Search & download audio â”€â”€
const play = async (ctx) => {
  const { sock, from, msg, args, react } = ctx;
  await react('â³');

  const query = args.join(' ');
  if (!query) return ctx.reply(`âŒ *${toSmallCaps('provide a song name')}!*`);

  try {
    const result = await searchYT(query);
    if (!result) throw new Error('Search failed');

    const detailsText = 
`ðŸŽ§ *${toSmallCaps('Prince Md music player')}*\n

ðŸŽµ *${toSmallCaps('title')}:* ${result.title}
ðŸ”— *${toSmallCaps('link')}:* ${result.url}
â±ï¸ *${toSmallCaps('duration')}:* ${result.duration}
ðŸ‘€ *${toSmallCaps('views')}:* ${result.views}

> *${toSmallCaps('powered by Prince Md')}*`;

    await sock.sendMessage(from, { 
      image: { url: result.thumbnail }, 
      caption: detailsText 
    }, { quoted: msg });

    let finalUrl = null;
    const rawUrl = result.url;

    const audioApis = [
      () => axios.get(`https://apiskeith.top/download/audio?url=${rawUrl}`, { timeout: 30000 }),
      () => axios.get(`https://apiskeith.top/download/mp3?url=${rawUrl}`,   { timeout: 30000 }),
      () => axios.get(`https://apiskeith.top/download/ytmp3?url=${rawUrl}`, { timeout: 30000 }),
      () => axios.get(`https://apiskeith.top/download/dlmp3?url=${rawUrl}`, { timeout: 30000 }),
      () => axios.get(`https://apiskeith.top/download/yta?url=${rawUrl}`,   { timeout: 30000 }),
      () => axios.get(`https://apiskeith.top/download/ytv?url=${rawUrl}`,   { timeout: 30000 })
    ];

    for (const callApi of audioApis) {
      try {
        const res  = await callApi();
        const data = res.data;
        const candidate = data?.result || data?.url || data?.download_url || data?.link;
        if (candidate && typeof candidate === 'string' && candidate.startsWith('http')) {
          finalUrl = candidate;
          break;
        }
      } catch (e) { continue; }
    }

    if (!finalUrl) throw new Error('All download APIs failed');

    const buffer = await axios.get(finalUrl, { 
      responseType: 'arraybuffer', 
      timeout: 900000,
      maxRedirects: 10,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    await sock.sendMessage(from, {
      audio:    Buffer.from(buffer.data),
      mimetype: 'audio/mpeg',
      ptt:      false,
      fileName: `${result.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`
    }, { quoted: msg });

    await react('âœ…');
  } catch (err) {
    logger.error('play error:', err.message);
    await react('âŒ');
    await ctx.reply(`âŒ *${toSmallCaps('failed to play song')}!*`);
  }
};

// â”€â”€â”€ .video â€” Search videos with selection â”€â”€â”€â”€â”€â”€â”€â”€
const video = async (ctx) => {
  const { sock, from, msg, args, react } = ctx;
  await react('â³');

  const query = args.join(' ');
  if (!query) return ctx.reply(`âŒ *${toSmallCaps('provide a video name')}!*`);

  try {
    // Search for multiple videos
    const sanitized = cleanQuery(query);
    const r = await yts(sanitized || query);
    const videos = r.videos.slice(0, 5); // Get top 5 results
    
    if (!videos || videos.length === 0) throw new Error('No results found');

    let searchResults = `ðŸ“½ï¸ *${toSmallCaps('Prince Md video search')}*\n\n`;
    searchResults += `ï¿½ *${toSmallCaps('search results for')}:* ${query}\n\n`;
    
    videos.forEach((video, index) => {
      searchResults += `${index + 1}. ðŸŽ¬ *${toSmallCaps(video.title)}*\n`;
      searchResults += `   ðŸ‘¤ *${toSmallCaps('channel')}:* ${video.author.name}\n`;
      searchResults += `   â±ï¸ *${toSmallCaps('duration')}:* ${video.timestamp}\n`;
      searchResults += `   ðŸ‘€ *${toSmallCaps('views')}:* ${video.views.toLocaleString()}\n`;
      searchResults += `   ðŸ“… *${toSmallCaps('uploaded')}:* ${video.ago}\n\n`;
    });
    
    searchResults += `ðŸ“‹ *${toSmallCaps('how to download')}*:\n`;
    searchResults += `â€¢ Reply with number (1-${videos.length}) to download\n`;
    searchResults += `â€¢ Example: Reply "1" to download first video\n\n`;
    searchResults += `> *${toSmallCaps('powered by Prince Md')}*`;

    // Send search results with first video thumbnail
    await sock.sendMessage(from, { 
      image: { url: videos[0].thumbnail }, 
      caption: searchResults 
    }, { quoted: msg });

    // Store search results for later use
    global.videoSearchResults = global.videoSearchResults || {};
    global.videoSearchResults[from] = {
      videos: videos,
      query: query,
      timestamp: Date.now()
    };

    await react('âœ…');
  } catch (err) {
    logger.error('video search error:', err.message);
    await react('âŒ');
    await ctx.reply(`âŒ *${toSmallCaps('failed to search videos')}!*\n\n${toSmallCaps('error')}: ${err.message}`);
  }
};

// â”€â”€â”€ .gif â€” Search & send GIF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const gif = async (ctx) => {
  const { sock, from, msg, args, react } = ctx;
  await react('â³');

  const query = args.join(' ') || 'funny';

  try {
    const res = await axios.get(
      `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${process.env.TENOR_API_KEY || ''}&limit=10`,
      { timeout: 10000 }
    );

    const results = res.data?.results;
    if (!results?.length) throw new Error('No GIFs found');

    const random  = results[Math.floor(Math.random() * results.length)];
    const gifUrl  = random.media_formats?.mp4?.url || random.url;
    const buffer  = await axios.get(gifUrl, { responseType: 'arraybuffer', timeout: 15000 });

    await sock.sendMessage(from, {
      video:    Buffer.from(buffer.data),
      mimetype: 'video/mp4',
      gifPlayback: true,
      caption:  `ðŸŽ¬ *${toSmallCaps('gif')}: ${query}*\n_Ê™Ê ${toSmallCaps('Prince Md')}_`,
    }, { quoted: msg });

    await react('âœ…');
  } catch (err) {
    logger.error('gif error:', err.message);
    await react('âŒ');
    await ctx.reply(`âŒ *${toSmallCaps('failed to get gif')}!*`);
  }
};

// â”€â”€â”€ .tomp3 â€” Convert video to audio â”€â”€â”€â”€â”€â”€â”€â”€â”€
const tomp3 = async (ctx) => {
  const { sock, from, msg, react } = ctx;
  await react('â³');

  try {
    const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
    const msgToDownload = quoted ? { message: quoted } : msg;
    const isVideo = !!msgToDownload.message?.videoMessage;

    if (!isVideo) {
      await react('âŒ');
      return ctx.reply(`âŒ *${toSmallCaps('quote a video to convert to audio')}!*`);
    }

    const buffer = await downloadMediaMessage(msgToDownload, 'buffer', {});

    await sock.sendMessage(from, {
      audio:    buffer,
      mimetype: 'audio/mpeg',
      ptt:      false,
    }, { quoted: msg });

    await react('âœ…');
  } catch (err) {
    logger.error('tomp3 error:', err.message);
    await react('âŒ');
    await ctx.reply(`âŒ *${toSmallCaps('conversion failed')}!*`);
  }
};

module.exports = { play, song: play, video, gif, tomp3 };
