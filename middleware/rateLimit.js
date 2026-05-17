// ============================================
//    Prince Md — MIDDLEWARE/RATELIMIT.JS
//    Rate Limiting Middleware (standalone)
// ============================================

'use strict';

const config = require('../config/config');
const logger = require('../utils/logger');

// ─── Rate Store ───────────────────────────────
const store = new Map();

/**
 * Rate limit check — returns { allowed, remaining, resetIn }
 * @param {string} key - unique identifier (userId or jid)
 * @param {number} max - max requests allowed
 * @param {number} windowMs - time window in ms
 */
const rateLimit = (key, max = config.rateLimit.maxCommands, windowMs = config.rateLimit.windowMs) => {
  const now     = Date.now();
  const current = store.get(key);

  if (!current || now > current.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, resetIn: windowMs };
  }

  if (current.count >= max) {
    const resetIn = current.resetAt - now;
    return { allowed: false, remaining: 0, resetIn };
  }

  current.count++;
  return { allowed: true, remaining: max - current.count, resetIn: current.resetAt - now };
};

/**
 * Reset rate limit for a key
 * @param {string} key
 */
const resetLimit = (key) => store.delete(key);

/**
 * Get current rate limit info
 * @param {string} key
 */
const getLimitInfo = (key) => {
  const current = store.get(key);
  if (!current) return { count: 0, remaining: config.rateLimit.maxCommands };
  return {
    count:     current.count,
    remaining: Math.max(0, config.rateLimit.maxCommands - current.count),
    resetAt:   current.resetAt,
  };
};

// ─── Cleanup expired entries every 5 mins ─────
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of store.entries()) {
    if (now > val.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

module.exports = { rateLimit, resetLimit, getLimitInfo };
