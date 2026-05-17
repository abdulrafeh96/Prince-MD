'use strict';
const db = require('../database/db');
const logger = require('./logger');

const checkAntiKeyword = async (sock, msg, from, sender, body, botNum, isOwner) => {
    // Sirf groups mein anti-keyword check karo
    if (!from.endsWith('@g.us')) return;

    const cleanBot = botNum.replace(/[^0-9]/g, '');
    const keywords = db.getAntiKeywords(from, cleanBot);
    if (!keywords || keywords.length === 0) return;

    // Skip if sender is owner
    if (isOwner) return;

    // Body ka text lo
    const text = (body || '').toLowerCase();

    // Check karo kya koi keyword message mein hai
    const found = keywords.find(k => text.includes(k.toLowerCase()));

    if (found) {
        logger.warn(`Anti-keyword triggered for "${found}" in ${from} by ${sender}`);
        
        // Use setTimeout to ensure message is fully stored before deletion
        setTimeout(async () => {
            try {
                // Message delete karo properly
                await sock.sendMessage(from, {
                    delete: {
                        remoteJid: from,
                        fromMe: false,
                        id: msg.key.id,
                        participant: msg.key.participant || sender
                    }
                });
                
                // Phir user ko group se remove (kick) karo
                await sock.groupParticipantsUpdate(from, [sender], 'remove');
                
                // Notify admins
                await sock.sendMessage(from, {
                    text: `┏━━〔 *Forbidden Lafz Alert* 〕━━┓

@${sender.split('@')[0]} paaji ne banned lafz *${found}* bol ditta.
Bot ne keha: "bas hun tussi bahar hawa khao."

┗━━━━━━━━━━━━━━━━┛`,
                    mentions: [sender]
                });
                return;

                await sock.sendMessage(from, {
                    text: `🚫 @${sender.split('@')[0]} has been removed for posting forbidden keyword: *${found}*`,
                    mentions: [sender]
                });
            } catch (err) {
                logger.error('AntiKeyword Error:', err.message);
            }
        }, 500);
    }
};

module.exports = { checkAntiKeyword };
