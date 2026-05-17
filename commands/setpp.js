'use strict';

const { toSmallCaps } = require('../utils/fonts');
const { authMiddleware } = require('../middleware/auth');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

const setpp = async (ctx) => {
    const { sock, msg, react, reply } = ctx;
    const auth = authMiddleware(ctx);

    if (!await auth.requireOwner()) return;

    // Check karo kya message mein image hai ya quoted mein
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const isImage = msg.message?.imageMessage || quoted?.imageMessage;
    
    if (!isImage) {
        return reply(`❌ *${toSmallCaps('please reply to an image to set your profile picture')}!*`);
    }

    await react('⏳');
    try {
        // Agar quoted message hai to quoted wala msg object download karo
        const downloadSource = quoted ? { message: quoted } : { message: msg.message };
        
        const buffer = await downloadMediaMessage(downloadSource, 'buffer', {});
        
        // WhatsApp profile picture update
        await sock.updateProfilePicture(sock.user.id, buffer);
        
        await reply(`✅ *${toSmallCaps('your profile picture has been updated')}*`);
        await react('✅');
    } catch (err) {
        console.error('SetPP Error:', err);
        await react('❌');
        await reply(`❌ *${toSmallCaps('failed to update profile picture')}:* ${err.message}`);
    }
};

module.exports = { setpp };