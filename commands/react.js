'use strict';

const { toSmallCaps } = require('../utils/fonts');

const reactCommand = async (ctx) => {
    const { sock, from, msg, args, isOwner, reply, react } = ctx;

    // Security: Sirf Owner chala sakta hai
    if (!isOwner) {
        return reply(`❌ *${toSmallCaps('this is an owner-only command')}*`);
    }

    // Emoji check
    const emoji = args[0];
    if (!emoji) {
        return reply(`❌ *${toSmallCaps('please provide an emoji to react')}*`);
    }

    // Quoted message check
    const quoted = msg.message?.extendedTextMessage?.contextInfo;
    if (!quoted) {
        return reply(`❌ *${toSmallCaps('please reply to a message to react')}*`);
    }

    try {
        await sock.sendMessage(from, {
            react: {
                text: emoji,
                key: {
                    remoteJid: from,
                    fromMe: quoted.participant === (sock.user?.id?.split(':')[0] + '@s.whatsapp.net'),
                    id: quoted.stanzaId,
                    participant: quoted.participant
                }
            }
        });
        await react('✅');
    } catch (err) {
        console.error('React Command Error:', err);
        reply(`❌ *${toSmallCaps('failed to react')}:* ${err.message}`);
    }
};

module.exports = { reactCommand };