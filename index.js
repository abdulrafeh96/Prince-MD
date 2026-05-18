'use strict';

const fs     = require('fs');
const config = require('./config/config');
const logger = require('./utils/logger');

logger.banner();

const dirs = ['./sessions', './database', './assets', './logs'];
dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});
logger.info('Directories verified.');

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason?.message || reason);
});
logger.info('Anti-crash handler enabled.');

if (!config.telegram.token || config.telegram.token === 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
  logger.error('Telegram bot token not set!');
  logger.error('Open config/config.js and set your token.');
  process.exit(1);
}

let telegramBot;
try {
  const TelegramBot = require('node-telegram-bot-api');
  telegramBot = new TelegramBot(config.telegram.token, {
    polling: {
      autoStart: true,
      interval: 3000,
      params: { timeout: 60 },
    },
  });
  logger.success('Telegram bot started successfully!');
} catch (err) {
  logger.error('Failed to start Telegram bot:', err.message);
  logger.warn('Continuing without Telegram bot...');
  telegramBot = null;
}

if (telegramBot) {
  try {
    const { initTelegram } = require('./telegram/bot');
    initTelegram(telegramBot);
    logger.success('Telegram handlers loaded.');
  } catch (err) {
    logger.error('Failed to load Telegram handlers:', err.message);
    logger.warn('Continuing without Telegram handlers...');
    telegramBot = null;
  }
}

const { restoreAllSessions } = require('./core/whatsapp');
(async () => {
  try {
    await restoreAllSessions(telegramBot);
    logger.success('All saved sessions restored.');
  } catch (err) {
    logger.error('Session restore error:', err.message);
  }
})();

try {
  const express = require('express');
  const app = express();

  app.get('/', (req, res) => {
    res.json({
      bot: 'Prince Md',
      developer: 'Abdul Rafeh',
      version: config.version,
      status: 'running',
      uptime: Math.floor(process.uptime()) + 's',
    });
  });

  app.get('/ping', (req, res) => res.send('pong'));

  const startWebServer = (port, retriesLeft = 5) => {
    const server = app.listen(port, () => {
      logger.success(`Web server running on port ${port}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE' && retriesLeft > 0) {
        const nextPort = Number(port) + 1;
        logger.warn(`Port ${port} in use, retrying on ${nextPort}...`);
        setTimeout(() => startWebServer(nextPort, retriesLeft - 1), 300);
        return;
      }
      logger.error('Web server failed to start:', err.message);
    });
  };

  startWebServer(config.port);
} catch (err) {
  logger.warn('Express server not started:', err.message);
}

process.on('SIGINT', () => {
  logger.warn('Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.warn('Shutting down...');
  process.exit(0);
});

logger.success('Prince Md is fully initialized and running!');
