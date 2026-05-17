// ============================================
//      Prince Md — DATABASE/DB.JS
//      Database Management
// ============================================

'use strict';
const path = require('path');
const fs   = require('fs');
const config = require('../config/config');
const logger = require('../utils/logger');
const DEFAULT_DB = { users:{}, groups:{}, settings:{}, warns:{}, banned:[], afk:{}, restricted:[], antiKeywords:{}, msgCount:{}, stickerCmds:{}, chatLocks:{}, antigroup:{}, groupstatus:{} };

// Caching DB in memory for speed
const dbCache = new Map();

const safeMkdir = (p) => {
try { fs.mkdirSync(p, { recursive: true }); } catch(e) {}
};

const getDbPath = (botNum) => {
const num = (botNum || '').replace(/[^0-9]/g, '');
if (!num || num.length > 15) return null;
const dbDir = path.resolve(process.cwd(), 'sessions', 'session_' + num);
safeMkdir(dbDir);
return path.join(dbDir, 'data.json');
};

const loadDB = (botNum) => {
if (dbCache.has(botNum)) return dbCache.get(botNum);
try {
const dbPath = getDbPath(botNum);
if (!dbPath) return { ...DEFAULT_DB };
let data;
if (fs.existsSync(dbPath)) {
data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
} else {
data = { users:{}, groups:{}, settings:{}, warns:{}, banned:[], afk:{}, restricted:[], antiKeywords:{}, msgCount:{}, stickerCmds:{} };
fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}
if (!data.settings)  data.settings  = {};
if (!data.users)     data.users     = {};
if (!data.groups)    data.groups    = {};
if (!data.warns)     data.warns     = {};
if (!data.banned)    data.banned    = [];
if (!data.afk)       data.afk       = {};
if (!data.restricted) data.restricted = [];
if (!data.antiKeywords) data.antiKeywords = {};
if (!data.msgCount) data.msgCount = {};
if (!data.stickerCmds) data.stickerCmds = {};
if (!data.chatLocks) data.chatLocks = {};
if (!data.antigroup) data.antigroup = {};
if (!data.groupstatus) data.groupstatus = {};
dbCache.set(botNum, data);
return data;
} catch { return { ...DEFAULT_DB }; }
};

const saveDB = (data, botNum) => {
try {
const dbPath = getDbPath(botNum);
if (!dbPath) return;
dbCache.set(botNum, data);
fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
} catch (err) { logger.error('DB save error:', err.message); }
};

const db = {
  getUser:     (jid, b)       => loadDB(b).users[jid] || null,
  setUser:     (jid, info, b) => { const d=loadDB(b); d.users[jid]={...(d.users[jid]||{}), ...info}; saveDB(d,b); },
  getAllUsers:  (b)            => loadDB(b).users,
  getGroup:    (jid, b)       => loadDB(b).groups[jid] || {},
  setGroup:    (jid, info, b) => { const d=loadDB(b); d.groups[jid]={...(d.groups[jid]||{}), ...info}; saveDB(d,b); },
  getAllGroups: (b)            => loadDB(b).groups,
  getSetting:  (key, b)       => loadDB(b).settings[key],
  setSetting:  (key, val, b)  => { const d=loadDB(b); d.settings[key]=val; saveDB(d,b); },
  getBotMode:  (botNum)      => { try { return loadDB(botNum).settings['mode'] || 'public'; } catch { return 'public'; } },
  setBotMode:  (botNum, val) => { const d=loadDB(botNum); d.settings['mode']=val; saveDB(d,botNum); },
  getWarns:    (jid, b)  => loadDB(b).warns[jid] || 0,
  addWarn:     (jid, b)  => { const d=loadDB(b); d.warns[jid]=(d.warns[jid]||0)+1; saveDB(d,b); return d.warns[jid]; },
  resetWarns:  (jid, b)  => { const d=loadDB(b); d.warns[jid]=0; saveDB(d,b); },
  resetWarnsForUser: (groupJid, userJids, b) => {
    const d = loadDB(b);
    const aliases = new Set(
      (Array.isArray(userJids) ? userJids : [userJids])
        .filter(Boolean)
        .map(j => String(j).split(':')[0])
    );
    const digits = new Set(
      [...aliases]
        .map(j => j.split('@')[0].replace(/[^0-9]/g, ''))
        .filter(Boolean)
    );
    let resetCount = 0;

    for (const key of Object.keys(d.warns || {})) {
      const separator = key.indexOf(':');
      if (separator === -1) continue;
      const keyGroup = key.slice(0, separator);
      const keyUser = key.slice(separator + 1).split(':')[0];
      const keyDigits = keyUser.split('@')[0].replace(/[^0-9]/g, '');

      if (
        keyGroup === groupJid &&
        (aliases.has(keyUser) || (keyDigits && digits.has(keyDigits)))
      ) {
        delete d.warns[key];
        resetCount += 1;
      }
    }

    for (const jid of aliases) {
      const directKey = `${groupJid}:${jid}`;
      if (d.warns?.[directKey]) {
        delete d.warns[directKey];
        resetCount += 1;
      }
    }

    saveDB(d, b);
    return resetCount;
  },
  isBanned:    (jid, b)  => (loadDB(b).banned||[]).includes(jid),
  ban:         (jid, b)  => { const d=loadDB(b); if(!d.banned.includes(jid)) d.banned.push(jid); saveDB(d,b); },
  unban:       (jid, b)  => { const d=loadDB(b); d.banned=(d.banned||[]).filter(j=>j!==jid); saveDB(d,b); },
  setAfk:    (jid, reason='', b) => { const d=loadDB(b); d.afk[jid]={reason,time:Date.now()}; saveDB(d,b); },
  getAfk:    (jid, b)            => loadDB(b).afk[jid] || null,
  removeAfk: (jid, b)            => { const d=loadDB(b); delete d.afk[jid]; saveDB(d,b); },
  isAfk:     (jid, b)            => !!loadDB(b).afk[jid],
  isAntiLink:  (jid, b)       => db.getGroup(jid, b)?.antilink === true,
  setAntiLink: (jid, val, b)  => db.setGroup(jid, { antilink: val }, b),
  isAntiChannel: (jid, b)    => db.getGroup(jid, b)?.antichannel === true,
  setAntiChannel: (jid, val, b) => db.setGroup(jid, { antichannel: val }, b),
  isAntiSpam: (jid, b) => db.getGroup(jid, b)?.antispam === true,
  setAntiSpam: (jid, val, b) => db.setGroup(jid, { antispam: val }, b),

  isWelcomeOn: (b)       => db.getSetting('welcome', b) !== false,
  setWelcome:  (val, b)  => db.setSetting('welcome', val, b),
  isByeOn:     (b)       => db.getSetting('bye', b) !== false,
  setBye:      (val, b)  => db.setSetting('bye', val, b),
  isPnotifyOn: (b)       => db.getSetting('pnotify', b) !== false,
  setPnotify:  (val, b)  => db.setSetting('pnotify', val, b),
  isDnotifyOn: (b)       => db.getSetting('dnotify', b) !== false,
  setDnotify:  (val, b)  => db.setSetting('dnotify', val, b),

  isMuted:     (jid, b)       => db.getGroup(jid, b)?.mute === true,
  setMute:     (jid, val, b)  => db.setGroup(jid, { mute: val }, b),
  getBotChatbot: (botNum, type) => { try { return loadDB(botNum).settings[`chatbot_${type}`] === true; } catch { return false; } },
  setBotChatbot: (botNum, type, val) => { const d=loadDB(botNum); d.settings[`chatbot_${type}`]=val; saveDB(d,botNum); },
  getMainOwner: (botNum) => {
  try { return loadDB(botNum).settings['mainOwner'] || ''; } catch { return ''; }
  },
  setMainOwner: (botNum, ownerNum) => {
  const d = loadDB(botNum);
  d.settings['mainOwner'] = ownerNum.replace(/[^0-9]/g, '');
  saveDB(d, botNum);
  },
  getMainOwnerLid: (botNum) => {
  try { return loadDB(botNum).settings['mainOwnerLid'] || ''; } catch { return ''; }
  },
  getBotAntidelete: (botNum) => {
  try { return loadDB(botNum).settings['antidelete'] === true; } catch { return false; }
  },
  setBotAntidelete: (botNum, val) => {
  const d = loadDB(botNum);
  d.settings['antidelete'] = val; saveDB(d, botNum);
  },
  getSecondOwners: (botNum) => {
  try { return loadDB(botNum).settings['secondOwners'] || []; } catch { return []; }
  },
  addSecondOwner: (botNum, num) => {
  const d = loadDB(botNum);
  const list = d.settings['secondOwners'] || [];
  const clean = num.replace(/[^0-9]/g, '');
  if (!list.includes(clean)) list.push(clean);
  d.settings['secondOwners'] = list;
  saveDB(d, botNum);
  },
  removeSecondOwner: (botNum, num) => {
  const d = loadDB(botNum);
  const clean = num.replace(/[^0-9]/g, '');
  d.settings['secondOwners'] = (d.settings['secondOwners'] || []).filter(n => n !== clean);
  saveDB(d, botNum);
  },
  isSecondOwner: (botNum, num) => {
  try {
  const clean = num.replace(/[^0-9]/g, '');
  return (loadDB(botNum).settings['secondOwners'] || []).includes(clean);
  } catch { return false; }
  },
  isRestricted: (jid, b) => {
  return loadDB(b).restricted.includes(jid);
  },
  setRestricted: (jid, val, b) => {
  const d = loadDB(b);
  if (val) {
  if (!d.restricted.includes(jid)) d.restricted.push(jid);
  } else {
  d.restricted = d.restricted.filter(j => j !== jid);
  }
  saveDB(d, b);
  },
  addAntiKeyword: (jid, keyword, b) => { const d=loadDB(b); if(!d.antiKeywords[jid]) d.antiKeywords[jid]=[]; if(!d.antiKeywords[jid].includes(keyword)) d.antiKeywords[jid].push(keyword); saveDB(d,b); },
  getAntiKeywords: (jid, b) => loadDB(b).antiKeywords[jid] || [],
  removeAntiKeyword: (jid, keyword, b) => { const d=loadDB(b); if(d.antiKeywords[jid]) d.antiKeywords[jid]=d.antiKeywords[jid].filter(k=>k!==keyword); saveDB(d,b); },
  
  addMsgCount: (jid, sender, b) => {
    const d = loadDB(b);
    if (!d.msgCount) d.msgCount = {};
    if (!d.msgCount[jid]) d.msgCount[jid] = {};
    d.msgCount[jid][sender] = (d.msgCount[jid][sender] || 0) + 1;
    saveDB(d, b);
  },
  getTopMembers: (jid, b) => {
    const d = loadDB(b);
    if (!d.msgCount || !d.msgCount[jid]) return {};
    return d.msgCount[jid];
  },

  // Sticker Command Functions
  setStickerCmd: (stickerId, command, b) => {
    const d = loadDB(b);
    if (!d.stickerCmds) d.stickerCmds = {};
    d.stickerCmds[stickerId] = command;
    saveDB(d, b);
  },
  getStickerCmd: (stickerId, b) => {
    const d = loadDB(b);
    return d.stickerCmds ? d.stickerCmds[stickerId] : null;
  },
  delStickerCmd: (stickerId, b) => {
    const d = loadDB(b);
    if (d.stickerCmds && d.stickerCmds[stickerId]) {
      delete d.stickerCmds[stickerId];
      saveDB(d, b);
      return true;
    }
    return false;
  },
  getAllStickerCmds: (b) => {
    const d = loadDB(b);
    return d.stickerCmds || {};
  },

  // AntiSticker Functions
  isAntiSticker: (jid, b) => db.getGroup(jid, b)?.antisticker === true,
  setAntiSticker: (jid, val, b) => db.setGroup(jid, { antisticker: val }, b),

  // AntiLink Action Functions
  getAntiLinkAction: (jid, b) => db.getGroup(jid, b)?.antilinkAction || 'delete',
  setAntiLinkAction: (jid, action, b) => db.setGroup(jid, { antilinkAction: action }, b),

  // AntiChannel Action Functions  
  getAntiChannelAction: (jid, b) => db.getGroup(jid, b)?.antichannelAction || 'delete',
  setAntiChannelAction: (jid, action, b) => db.setGroup(jid, { antichannelAction: action }, b),

  // AntiSticker Action Functions
  getAntiStickerAction: (jid, b) => db.getGroup(jid, b)?.antistickerAction || 'delete',
  setAntiStickerAction: (jid, action, b) => db.setGroup(jid, { antistickerAction: action }, b),

  // AntiSpam Action Functions
  getAntiSpamAction: (jid, b) => db.getGroup(jid, b)?.antispamAction || 'warn',
  setAntiSpamAction: (jid, action, b) => db.setGroup(jid, { antispamAction: action }, b),

  // AntiGroup Functions
  isAntiGroup: (jid, b) => db.getGroup(jid, b)?.antigroup === true,
  setAntiGroup: (jid, val, b) => db.setGroup(jid, { antigroup: val }, b),
  getAntiGroupAction: (jid, b) => db.getGroup(jid, b)?.antigroupAction || 'delete',
  setAntiGroupAction: (jid, action, b) => db.setGroup(jid, { antigroupAction: action }, b),

  // GroupStatus Functions
  isGroupStatus: (jid, b) => db.getGroup(jid, b)?.groupstatus === true,
  setGroupStatus: (jid, val, b) => db.setGroup(jid, { groupstatus: val }, b),
  getGroupStatusAction: (jid, b) => db.getGroup(jid, b)?.groupstatusAction || 'delete',
  setGroupStatusAction: (jid, action, b) => db.setGroup(jid, { groupstatusAction: action }, b),

  // Chat Lock Functions
  setChatLock: (groupJid, userJid, locked, botNum) => {
    const d = loadDB(botNum);
    if (!d.chatLocks) d.chatLocks = {};
    if (!d.chatLocks[groupJid]) d.chatLocks[groupJid] = {};
    d.chatLocks[groupJid][userJid] = locked;
    saveDB(d, botNum);
  },
  removeChatLock: (groupJid, userJid, botNum) => {
    const d = loadDB(botNum);
    const locks = d.chatLocks?.[groupJid];
    if (!locks) return false;

    const targetBase = db.getJidBase(userJid);
    const lockKey = Object.keys(locks).find(jid => jid === userJid || db.getJidBase(jid) === targetBase);
    if (lockKey) {
      delete locks[lockKey];
      saveDB(d, botNum);
      return true;
    }
    return false;
  },
  getLockedUsers: (groupJid, botNum) => {
    const d = loadDB(botNum);
    if (!d.chatLocks || !d.chatLocks[groupJid]) return [];
    return Object.keys(d.chatLocks[groupJid]).filter(user => d.chatLocks[groupJid][user] === true);
  },
  getJidBase: (jid) => (jid || '').toString().split('@')[0].split(':')[0],
  isChatLocked: (groupJid, userJid, botNum) => {
    const d = loadDB(botNum);
    const locks = d.chatLocks?.[groupJid];
    if (!locks) return false;

    const userBase = db.getJidBase(userJid);
    return Object.entries(locks).some(([lockedJid, locked]) => {
      if (locked !== true) return false;
      return lockedJid === userJid || db.getJidBase(lockedJid) === userBase;
    });
  },

  // AutoOpen/AutoClose Time Functions
  setAutoOpenTime: (jid, time, b) => {
    const d = loadDB(b);
    if (!d.groups) d.groups = {};
    if (!d.groups[jid]) d.groups[jid] = {};
    d.groups[jid].autoOpenTime = time;
    saveDB(d, b);
  },
  getAutoOpenTime: (jid, b) => {
    const d = loadDB(b);
    return d.groups?.[jid]?.autoOpenTime || null;
  },
  setAutoCloseTime: (jid, time, b) => {
    const d = loadDB(b);
    if (!d.groups) d.groups = {};
    if (!d.groups[jid]) d.groups[jid] = {};
    d.groups[jid].autoCloseTime = time;
    saveDB(d, b);
  },
  getAutoCloseTime: (jid, b) => {
    const d = loadDB(b);
    return d.groups?.[jid]?.autoCloseTime || null;
  },
  removeAutoOpenTime: (jid, b) => {
    const d = loadDB(b);
    if (d.groups?.[jid]) {
      delete d.groups[jid].autoOpenTime;
      saveDB(d, b);
    }
  },
  removeAutoCloseTime: (jid, b) => {
    const d = loadDB(b);
    if (d.groups?.[jid]) {
      delete d.groups[jid].autoCloseTime;
      saveDB(d, b);
    }
  },
  getAllAutoTimes: (b) => {
    const d = loadDB(b);
    const result = {};
    if (d.groups) {
      for (const [jid, group] of Object.entries(d.groups)) {
        if (group.autoOpenTime || group.autoCloseTime) {
          result[jid] = {
            autoOpenTime: group.autoOpenTime || null,
            autoCloseTime: group.autoCloseTime || null
          };
        }
      }
    }
    return result;
  },
};
module.exports = db;
