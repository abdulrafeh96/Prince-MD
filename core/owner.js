'use strict';

const db = require('../database/db');

// In-memory LID store — bot restart par reset hoga
// Par messageHandler mein har baar LID save hoti rahegi
const lidMap = new Map(); // botNum -> Set of LID digits

const ownerManager = {
  setOwner: (botNumber, ownerJid) => {
    const cleanBot = botNumber.replace(/[^0-9]/g, '');
    const ownerNum = ownerJid.replace(/[^0-9]/g, '');
    if (!cleanBot || !ownerNum) return;
    db.setMainOwner(cleanBot, ownerNum);
  },
  getOwner: (botNumber) => {
    const cleanBot = botNumber.replace(/[^0-9]/g, '');
    const num = db.getMainOwner(cleanBot);
    return num ? `${num}@s.whatsapp.net` : null;
  },
  isOwner: (botNumber, jid) => {
    const owner = ownerManager.getOwner(botNumber);
    if (!owner) return false;
    return jid.split('@')[0].replace(/[^0-9]/g,'') === owner.split('@')[0].replace(/[^0-9]/g,'');
  },
  removeOwner: (botNumber) => {
    const cleanBot = botNumber.replace(/[^0-9]/g, '');
    db.setMainOwner(cleanBot, '');
  },
  hasOwner: (botNumber) => !!ownerManager.getOwner(botNumber),
  getAllOwners: () => {
    return {};
  },

  // ─── LID Support ─────────────────────────────────────────────────────────────
  saveLID: (botNumber, lidDigits) => {
    const cleanBot = botNumber.replace(/[^0-9]/g, '');
    const cleanLid = lidDigits.replace(/[^0-9]/g, '');
    if (!cleanBot || !cleanLid) return;
    if (!lidMap.has(cleanBot)) lidMap.set(cleanBot, new Set());
    lidMap.get(cleanBot).add(cleanLid);
  },
  isOwnerLID: (botNumber, lidDigits) => {
    const cleanBot = botNumber.replace(/[^0-9]/g, '');
    const cleanLid = (lidDigits || '').replace(/[^0-9]/g, '');
    if (!cleanBot || !cleanLid) return false;
    return lidMap.has(cleanBot) && lidMap.get(cleanBot).has(cleanLid);
  },
  // ─────────────────────────────────────────────────────────────────────────────
};

module.exports = ownerManager;