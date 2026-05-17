'use strict';
const path   = require('path');
const config = require('../config/config');
const logger = require('../utils/logger');

const SESSION_DIR = path.resolve(config.sessions.dir);

// Safe mkdir
const safeMkdir = (p) => {
  try { require('fs').mkdirSync(p, { recursive: true }); } catch(e) {}
};

// Ensure session dir on first use
safeMkdir(SESSION_DIR);

const sessionManager = {
  getSessionPath: (number) => {
    return path.join(SESSION_DIR, 'session_' + number.replace(/[^0-9]/g,''));
  },
  exists: (number) => {
    try { return require('fs').existsSync(sessionManager.getSessionPath(number)); } catch { return false; }
  },
  getAll: () => {
    try {
      return require('fs').readdirSync(SESSION_DIR)
        .filter(d => d.startsWith('session_'))
        .map(d => d.replace('session_', ''));
    } catch { return []; }
  },
  delete: (number, delay = 0) => {
    const sessionPath = sessionManager.getSessionPath(number);
    const doDelete = () => {
      try {
        const fs = require('fs');
        if (fs.existsSync(sessionPath)) {
          fs.rmSync(sessionPath, { recursive: true, force: true });
          logger.warn('Session deleted for: ' + number);
        }
      } catch (err) { logger.error('Failed to delete session:', err.message); }
    };
    delay > 0 ? setTimeout(doDelete, delay) : doDelete();
  },
  deleteOnLogout: (number) => {
    logger.warn('Deleting session for ' + number + ' in 5 seconds...');
    sessionManager.delete(number, config.sessions.cleanupDelay);
  },
  create: (number) => {
    const sessionPath = sessionManager.getSessionPath(number);
    safeMkdir(sessionPath);
    return sessionPath;
  },
  count: () => sessionManager.getAll().length,
  isConnected: (number, activeSockets) => activeSockets.has(number.replace(/[^0-9]/g,'')),
};

module.exports = sessionManager;