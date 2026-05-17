'use strict';

const { toSmallCaps } = require('../utils/fonts');

const wahab = async (ctx) => {
    const { sock, from, msg, reply } = ctx;
    const imagePath = './assets/wahab.jpg'; // Path check kar lena yahi hai ya 'ganduboys' folder hai

    try {
        if (!require('fs').existsSync(imagePath)) {
            return reply(`❌ *${toSmallCaps('wahab.jpg not found in assets folder')}*`);
        }

        await sock.sendMessage(from, { 
            image: { url: imagePath }, 
            caption: `👤 *${toSmallCaps('this is wahab')}*` 
        }, { quoted: msg });
        
    } catch (err) {
        console.error('Wahab Command Error:', err);
        reply(`❌ *${toSmallCaps('failed to send wahab image')}*`);
    }
};

module.exports = { wahab };