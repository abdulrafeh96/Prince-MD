const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { toSmallCaps } = require('../utils/fonts');
const axios = require('axios');
const FormData = require('form-data');

const hd = async (ctx) => {
    const { sock, from, msg, react } = ctx;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const isQuotedImage = quoted?.imageMessage;
    const isDirectImage = msg.message?.imageMessage;

    if (!isQuotedImage && !isDirectImage) {
        return ctx.reply(`❌ *${toSmallCaps('please send or reply to an image')}*`);
    }

    await react('⏳');

    try {
        const buffer = await downloadMediaMessage(
            isQuotedImage ? { key: { remoteJid: from }, message: quoted } : msg,
            'buffer'
        );

        // 1. Upload to tmpfiles.org (Sabse fast aur open API)
        const form = new FormData();
        form.append('file', buffer, { filename: 'image.jpg' });

        const uploadRes = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
            headers: form.getHeaders()
        });

        // Tmpfiles response structure: https://tmpfiles.org/dl/12345/image.jpg
        // API response mein url aata hai: https://tmpfiles.org/12345/image.jpg
        const rawUrl = uploadRes.data.data.url;
        const imageUrl = rawUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');

        // 2. Call HD API (Keith)
        const hdRes = await axios.get(`https://apiskeith.top/ai/hd?url=${encodeURIComponent(imageUrl)}`);
        
        if (hdRes.data?.result?.[0]) {
            await sock.sendMessage(from, { 
                image: { url: hdRes.data.result[0] },
                caption: "✨ *Enhanced*"
            }, { quoted: msg });
            await react('✅');
        } else {
            throw new Error('Enhancement failed');
        }

    } catch (err) {
        console.error("HD Error:", err.message);
        await react('❌');
        await ctx.reply(`❌ *${toSmallCaps('image enhancement failed')}_*`);
    }
};

module.exports = { hd };