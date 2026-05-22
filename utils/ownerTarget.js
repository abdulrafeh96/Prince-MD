'use strict';

const config = require('../config/config');
const db = require('../database/db');

function cleanNumber(value = '') {
  return String(value || '').replace(/[^0-9]/g, '');
}

function getOwnerJid(botNum) {
  const cleanBot = cleanNumber(botNum);
  const mainOwner = cleanNumber(db.getMainOwner(cleanBot));
  const configOwner = cleanNumber(config.ownerNumber);
  const target = mainOwner || configOwner || cleanBot;
  return target ? `${target}@s.whatsapp.net` : '';
}

module.exports = { getOwnerJid };
