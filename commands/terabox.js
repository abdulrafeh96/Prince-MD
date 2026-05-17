// ============================================
//      Prince Md — COMMANDS/TERABOX.JS
//      Terabox Downloader Command (Multi-file Support)
// ============================================

'use strict';

const axios = require('axios');
const { toSmallCaps } = require('../utils/fonts');

const terabox = async (ctx) => {
  const { sock, from, msg, args, react } = ctx;
  
  const url = args.join(' ');
  if (!url) return ctx.reply(`❌ *${toSmallCaps('provide a terabox link')}!*`);
  
  await react('⏳');
  
  try {
    const apiUrl = `https://terabox-lime.vercel.app/api/terabox?url=${encodeURIComponent(url)}&token=tlz.vercel.app`;
    
    const response = await axios.get(apiUrl, { timeout: 60000 });
    const res = response.data;

    // Direct link aur file details nikalna
    const files = res.data?.data?.['📄 Files'];
    if (!files || files.length === 0) throw new Error('No files found');

    // 🚀 Multi-file sending loop
    for (const file of files) {
      const dlUrl = file['🔽 Direct Download Link'];
      const fileName = file['📂 Name'] || 'Terabox_Download';
      const isVideo = fileName.endsWith('.mp4') || fileName.endsWith('.mkv');
      const isAudio = fileName.endsWith('.mp3') || fileName.endsWith('.wav');

      if (isVideo) {
        await sock.sendMessage(from, {
          video: { url: dlUrl },
          caption: `✅ *${toSmallCaps('terabox video download success')}*\n\n📄 *File:* ${fileName}`,
          fileName: fileName,
          mimetype: 'video/mp4'
        }, { quoted: msg });
      } else if (isAudio) {
        await sock.sendMessage(from, {
          audio: { url: dlUrl },
          mimetype: 'audio/mpeg',
          ptt: false,
          fileName: fileName
        }, { quoted: msg });
      } else {
        // Document (Zip/Others)
        await sock.sendMessage(from, {
          document: { url: dlUrl },
          fileName: fileName,
          mimetype: 'application/octet-stream',
          caption: `✅ *${toSmallCaps('terabox document download success')}*\n\n📄 *File:* ${fileName}`
        }, { quoted: msg });
      }
      // Thoda delay taake WhatsApp block na kare
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    await react('✅');
  } catch (err) {
    console.error('Terabox Error:', err);
    await react('❌');
    await ctx.reply(`❌ *${toSmallCaps('failed to download')}:* ${err.message}`);
  }
};

module.exports = { terabox, tb: terabox };