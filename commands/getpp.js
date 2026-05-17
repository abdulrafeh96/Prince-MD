'use strict';

const { toSmallCaps } = require('../utils/fonts');
const { authMiddleware } = require('../middleware/auth');
const { getMentions } = require('../utils/helpers');

const getpp = async (ctx) => {
    const { sock, msg, args, botNum, react, sender } = ctx;
    const auth = authMiddleware(ctx);

    // Security: Sirf Owner
    if (!await auth.requireOwner()) return;

    // Target nikalna: Space remove ki aur sirf digits rakhe
    let target = msg.message?.extendedTextMessage?.contextInfo?.participant 
                 || getMentions(msg.message)[0];

    if (!target && args.length > 0) {
        // Saare args ko mila kar space remove kar di
        const rawNum = args.join('').replace(/[^0-9]/g, '');
        target = `${rawNum}@s.whatsapp.net`;
    } else if (!target) {
        target = sender;
    }

    try {
        const pp = await sock.profilePictureUrl(target, 'image');
        const ownerJid = `${botNum.replace(/[^0-9]/g, '')}@s.whatsapp.net`;

        // Image direct Owner ke DM mein
        await sock.sendMessage(ownerJid, {
            image: { url: pp },
            caption: `📸 *${toSmallCaps('profile picture fetched')}*`
        });
    } catch (e) {
        // Sirf error par cross react karega
        await react('❌');
    }
};

module.exports = { getpp };