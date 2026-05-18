// ============================================
//    Prince Md — HANDLERS/GROUPHANDLER.JS
//    WhatsApp Group Events Handler
// ============================================

'use strict';

const logger = require('../utils/logger');
const { toSmallCaps } = require('../utils/fonts');
const db = require('../database/db'); // Database import for settings check

function cleanGroupRules(desc = '') {
  const hasLink = (line) => /(?:https?:\/\/|chat\.whatsapp\.com\/|wa\.me\/)\S+/i.test(line);
  const isLinkHeading = (line) => {
    const normalized = String(line || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

    return [
      /^links?$/,
      /^links?\s*(here|below)?$/,
      /^(this\s+)?groups?\s+links?$/,
      /^(this\s+)?whatsapp\s+groups?\s+links?$/,
      /^(invite|joining|join|chat)\s+links?$/,
      /^(official|important|useful)\s+links?$/,
    ].some((pattern) => pattern.test(normalized));
  };

  return String(desc || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !hasLink(line) && !isLinkHeading(line))
    .map((line) => line.replace(/(?:https?:\/\/|chat\.whatsapp\.com\/|wa\.me\/)\S+/gi, '').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

/**
 * Handle group metadata updates
 * @param {Object} sock
 * @param {Array}  updates
 * @param {string} botNum
 */
const handleGroupUpdate = async (sock, updates, botNum) => {
  for (const update of updates) {
    try {
      const { id, subject, desc, announce, restrict } = update;
      if (!id) continue;
      logger.debug(`Group update: ${id}`, update);
    } catch (err) {
      logger.error('Group update error:', err.message);
    }
  }
};

/**
 * Handle group participant add/remove/promote/demote
 * @param {Object} sock
 * @param {Object} update
 * @param {string} botNum
 */
const handleGroupParticipants = async (sock, update, botNum) => {
  const { id, participants, action, author } = update;
  if (!id || !participants) return;

  const cleanBot = botNum.replace(/[^0-9]/g, '');

  try {
    const groupMeta = await sock.groupMetadata(id).catch(() => null);
    const groupName = groupMeta?.subject || 'Group';
    const groupRules = cleanGroupRules(groupMeta?.desc) || 'No rules set in group description.';

    for (const participant of participants) {
      const number = participant.split('@')[0];
      const by = author ? author.split('@')[0] : 'Unknown';

      switch (action) {

        // ─── Member Joined ───────────────────
        case 'add': {
          // Agar welcome false hai to skip karo
          if (db.isWelcomeOn(cleanBot) === false) return; 

          logger.info(`[${groupName}] ${number} joined`);

          const welcomeText =
`╭━━〔 *WELCOME* 〕━━╮
┃ *Assalam-o-Alaikum* @${number}
┃
┃ *Welcome to ${groupName}*
╰━━━━━━━━━━━━╯

📌 *Group Rules*
${groupRules}`;

          await sock.sendMessage(id, {
            text: welcomeText,
            mentions: [participant],
          });
          break;
        }

        // ─── Member Left ──────────────────────
        case 'remove': {
          // Agar bye false hai to skip karo
          if (db.isByeOn(cleanBot) === false) return;

          logger.info(`[${groupName}] ${number} left`);

          await sock.sendMessage(id, {
            text: `👋 *@${number}* has left the group.\n_Goodbye!_`,
            mentions: [participant],
          });
          break;
        }

        // ─── Member Promoted ──────────────────
        case 'promote': {
          // Agar pnotify false hai to skip karo
          if (db.isPnotifyOn(cleanBot) === false) return;

          logger.info(`[${groupName}] ${number} promoted to admin by ${by}`);

          await sock.sendMessage(id, {
            text: `⭐ *@${number}* has been promoted to *Admin* by @${by}!\n\n_Congratulations!_`,
            mentions: [participant, author],
          });
          break;
        }

        // ─── Member Demoted ───────────────────
        case 'demote': {
          // Agar dnotify false hai to skip karo
          if (db.isDnotifyOn(cleanBot) === false) return;

          logger.info(`[${groupName}] ${number} demoted from admin by ${by}`);

          await sock.sendMessage(id, {
            text: `🔻 *@${number}* has been demoted from Admin by @${by}.`,
            mentions: [participant, author],
          });
          break;
        }

        default:
          break;
      }
    }
  } catch (err) {
    logger.error('Group participants handler error:', err.message);
  }
};

module.exports = { handleGroupUpdate, handleGroupParticipants };
