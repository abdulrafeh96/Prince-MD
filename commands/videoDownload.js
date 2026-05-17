// ============================================
//      Prince Md — COMMANDS/VIDEODOWNLOAD.JS
//      Video Download Handler
// ============================================

'use strict';

const axios = require('axios');
const { toSmallCaps } = require('../utils/fonts');
const logger = require('../utils/logger');

// ─── Handle video selection reply ─────────────────
const handleVideoSelection = async (ctx) => {
  const { sock, from, msg, body } = ctx;
  
  try {
    // Check if user replied to a video search
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quotedMsg) return false;
    
    const quotedText = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || '';
    if (!quotedText.includes('Prince Md video search')) return false;
    
    // Check if reply is a number
    const selection = parseInt(body.trim());
    if (isNaN(selection) || selection < 1) return false;
    
    // Get stored search results
    const searchResults = global.videoSearchResults?.[from];
    if (!searchResults) {
      await ctx.reply(`❌ *${toSmallCaps('search expired')}*\n\n${toSmallCaps('please search again')}`);
      return true;
    }
    
    // Check if search is recent (within 5 minutes)
    if (Date.now() - searchResults.timestamp > 300000) {
      delete global.videoSearchResults[from];
      await ctx.reply(`❌ *${toSmallCaps('search expired')}*\n\n${toSmallCaps('please search again')}`);
      return true;
    }
    
    // Check if selection is valid
    if (selection > searchResults.videos.length) {
      await ctx.reply(`❌ *${toSmallCaps('invalid selection')}*\n\n${toSmallCaps('please choose between 1-')}${searchResults.videos.length}`);
      return true;
    }
    
    // Get selected video
    const selectedVideo = searchResults.videos[selection - 1];
    
    await ctx.reply(`📥 *${toSmallCaps('downloading video')}* ${selection}: ${selectedVideo.title}`);
    
    // Download video
    await downloadVideo(ctx, selectedVideo);
    
    return true;
  } catch (err) {
    logger.error('Video selection error:', err.message);
    return false;
  }
};

// ─── Download selected video ────────────────────
const downloadVideo = async (ctx, video) => {
  const { sock, from, msg } = ctx;
  
  try {
    let finalDlUrl = null;
    const rawUrl = video.url;

    const videoApis = [
      () => axios.get(`https://api.agatz.xyz/api/ytv?url=${rawUrl}`, { timeout: 30000 }),
      () => axios.get(`https://api.dapuhy.ga/api/downloader/youtube?url=${rawUrl}`, { timeout: 30000 }),
      () => axios.get(`https://api.lolhuman.xyz/api/ytvideo2?apikey=apikey&url=${rawUrl}`, { timeout: 30000 }),
      () => axios.get(`https://api.akuari.my.id/downloader/youtube?url=${rawUrl}`, { timeout: 30000 }),
      () => axios.get(`https://api.xteam.xyz/download/youtube?url=${rawUrl}&APIKEY=APIKEY`, { timeout: 30000 })
    ];

    for (const callApi of videoApis) {
      try {
        const res = await callApi();
        const data = res.data;
        console.log('Video API Response:', data);
        
        // Try different response formats
        let candidate = null;
        if (data?.result?.url) candidate = data.result.url;
        else if (data?.url) candidate = data.url;
        else if (data?.download_url) candidate = data.download_url;
        else if (data?.link) candidate = data.link;
        else if (data?.video?.url) candidate = data.video.url;
        else if (data?.data?.url) candidate = data.data.url;
        
        if (candidate && typeof candidate === 'string' && candidate.startsWith('http')) {
          finalDlUrl = candidate;
          console.log('Found video URL:', finalDlUrl);
          break;
        }
      } catch (e) { 
        console.log('API Error:', e.message);
        continue; 
      }
    }

    if (!finalDlUrl) throw new Error('All download APIs failed');

    console.log('Downloading video from:', finalDlUrl);
    
    const response = await axios.get(finalDlUrl, { 
      responseType: 'arraybuffer', 
      maxRedirects: 10,
      timeout: 900000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    console.log('Video downloaded, size:', response.data.length);

    const videoBuffer = Buffer.from(response.data);
    
    // Check if buffer is valid
    if (videoBuffer.length === 0) {
      throw new Error('Downloaded video is empty');
    }

    console.log('Sending video to chat...');

    await sock.sendMessage(from, {
      video: videoBuffer,
      mimetype: 'video/mp4',
      caption: `✅ *${video.title}*\n👤 ${video.author.name}\n⏱️ ${video.timestamp}\n👀 ${video.views.toLocaleString()}\n\n_ʙʏ ${toSmallCaps('Prince Md')}_`
    }, { quoted: msg });

    console.log('Video sent successfully');

  } catch (err) {
    logger.error('video download error:', err.message);
    console.log('Full error:', err);
    await ctx.reply(`❌ *${toSmallCaps('failed to download video')}!*\n\n${toSmallCaps('error')}: ${err.message}\n\n${toSmallCaps('try again later or use a different video')}`);
  }
};

module.exports = {
  handleVideoSelection
};
