// ============================================
//      Prince Md — UTILS/ANTILINK.JS
//      Anti-Link Detection & Action System
// ============================================

'use strict';

const db     = require('../database/db');
const logger = require('../utils/logger');

// ─── URL / Link Patterns (Aggressive Mode) ───
const LINK_PATTERNS = [
  /https?:\/\/[^\s]+/gi,
  /www\.[^\s]+/gi,
  /[a-zA-Z0-9-]+\.(com|net|org|edu|gov|mil|int|biz|info|io|co|me|xyz|site|online|store|tech|tv|blog)/gi,
  /chat\.whatsapp\.com\/[^\s]+/gi,
  /whatsapp\.com\/channel\/[^\s]+/gi, 
  /tiktok\.com\/[^\s]+/gi,            
  /facebook\.com\/[^\s]+/gi,          
  /fb\.watch\/[^\s]+/gi,              
  /instagram\.com\/[^\s]+/gi,         
  /wa\.me\/[^\s]+/gi,
  /t\.me\/[^\s]+/gi,
  /discord\.gg\/[^\s]+/gi,
  /bit\.ly\/[^\s]+/gi,
  /tinyurl\.com\/[^\s]+/gi,
];

const WA_GROUP_PATTERN = /chat\.whatsapp\.com\/[a-zA-Z0-9]+/gi;

/**
 * Check if text contains ANY kind of link (Fixed: Using match for better detection)
 */
const hasLink = (text) => {
  if (!text) return false;
  const str = typeof text === 'string' ? text : JSON.stringify(text);
  
  // Har pattern ko check karein ke kya woh text mein kahi bhi exist karta hai
  for (const pattern of LINK_PATTERNS) {
    if (str.match(pattern)) return true;
  }
  return false;
};

const hasWAGroupLink = (text) => {
  if (!text) return false;
  return WA_GROUP_PATTERN.test(text);
};

/**
 * Handle anti-link check for a message
 */
const checkAntiLink = async (sock, msg, from, sender, body, botNum, isOwner) => {
  if (!from.endsWith('@g.us')) return false;

  const cleanBot = botNum.replace(/[^0-9]/g, '');

  if (!db.isAntiLink(from, cleanBot)) return false;

  // Skip if sender is owner
  if (isOwner) return false;

  // 1. Detect all links (Ab ye text ke saath link ko bhi detect karega)
  const containsLink = hasLink(body);
  const action = db.getAntiLinkAction(from, cleanBot);
  const warnKey = `${from}:${sender}`;

  if (containsLink) {
    logger.warn(`Anti-link triggered in ${from} by ${sender}`);

    const deleteMessage = async () => {
      try {
        await sock.sendMessage(from, {
          delete: {
            remoteJid: from,
            fromMe: false,
            id: msg.key.id,
            participant: msg.key.participant || sender
          }
        });
      } catch (err) {
        logger.error('Anti-link delete error:', err.message);
      }
    };

    const warnUser = async () => {
      const punjabiWarns = db.addWarn(warnKey, cleanBot);
      const punjabiMaxWarns = 3;
      await sock.sendMessage(from, {
        text: `┏━━〔 *Anti-Link Alert* 〕━━┓

@${sender.split('@')[0]} paaji, linkan di rehri ethe nahi lagdi.
Group nu OLX na bnao, message chakk lya gaya ae.

*Warning Meter:* ${punjabiWarns}/${punjabiMaxWarns}
┗━━━━━━━━━━━━━━┛`,
        mentions: [sender]
      });

      if (punjabiWarns >= punjabiMaxWarns) {
        try {
          await sock.groupParticipantsUpdate(from, [sender], 'remove');
          await sock.sendMessage(from, {
            text: `┏━━〔 *Member Removed* 〕━━┓

@${sender.split('@')[0]} paaji linkan de chakkar ch group ton bahar ho gaye.
*Warnings:* ${punjabiMaxWarns}/${punjabiMaxWarns}

┗━━━━━━━━━━━━━━┛`,
            mentions: [sender]
          });
        } catch (err) {
          logger.error('Anti-link kick error:', err.message);
        }
      }
      return;

      const currentWarns = db.addWarn(warnKey, cleanBot);
      const maxAllowedWarns = 3;
      await sock.sendMessage(from, {
        text: `🔗 *Link Bazaar Closed!*

@${sender.split('@')[0]} bhai, yahan links ki dukaan lagana allowed nahi hai.
Message ka link ticket cancel ho gaya.

⚠️ *Warnings:* ${currentWarns}/${maxAllowedWarns}`,
        mentions: [sender]
      });

      if (currentWarns >= maxAllowedWarns) {
        try {
          await sock.groupParticipantsUpdate(from, [sender], 'remove');
          await sock.sendMessage(from, {
            text: `🚫 @${sender.split('@')[0]} link express se seedha group ke bahar nikal gaye. ${maxAllowedWarns}/${maxAllowedWarns} warnings complete.`,
            mentions: [sender]
          });
        } catch (err) {
          logger.error('Anti-link kick error:', err.message);
        }
      }
      return;

      const warns = db.addWarn(warnKey, cleanBot);
      const maxWarns = 3;
      await sock.sendMessage(from, {
        text: `⚠️ *Anti-link warning*

@${sender.split('@')[0]} you are not allowed to send links in this group.

Warnings: ${warns}/${maxWarns}`,
        mentions: [sender]
      });

      if (warns >= maxWarns) {
        try {
          await sock.groupParticipantsUpdate(from, [sender], 'remove');
          await sock.sendMessage(from, {
            text: `🚫 @${sender.split('@')[0]} has been removed after reaching ${maxWarns} warnings.`,
            mentions: [sender]
          });
        } catch (err) {
          logger.error('Anti-link kick error:', err.message);
        }
      }
    };

    try {
      // Use setTimeout to ensure message is fully stored before deletion
      setTimeout(async () => {
        try {
          if (action === 'warn') {
            await warnUser();
          } else if (action === 'warndelete') {
            await deleteMessage();
            await warnUser();
          } else if (action === 'kick') {
            await deleteMessage();
            await sock.groupParticipantsUpdate(from, [sender], 'remove');
          } else {
            await deleteMessage();
          }
        } catch (err) {
          logger.error('Anti-link action error:', err.message);
        }
      }, 500);
      
      return true;
    } catch (err) {
      logger.error('Anti-link error:', err.message);
      return false;
    }
  }

  return false;
};

module.exports = { hasLink, hasWAGroupLink, checkAntiLink };
