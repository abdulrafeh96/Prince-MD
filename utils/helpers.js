// ============================================
//      Prince Md — UTILS/HELPERS.JS
//      Reusable Helper Functions (No external deps)
// ============================================

'use strict';

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024, sizes = ['B','KB','MB','GB','TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatDuration = (seconds) => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getTime = () => new Date().toLocaleTimeString('en-GB');
const getDate = () => new Date().toLocaleDateString('en-GB');

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5  && hour < 12) return '🌅 Good Morning';
  if (hour >= 12 && hour < 17) return '☀️ Good Afternoon';
  if (hour >= 17 && hour < 21) return '🌆 Good Evening';
  return '🌙 Good Night';
};

const isUrl = (str) => { try { new URL(str); return true; } catch { return false; } };
const extractUrls = (text) => text.match(/https?:\/\/[^\s]+/g) || [];
const cleanNumber = (number) => String(number).replace(/[^0-9]/g, '');
const jidToNumber = (jid) => jid?.split('@')[0]?.split(':')[0] || '';
const numberToJid = (number) => `${cleanNumber(number)}@s.whatsapp.net`;
const truncate = (text, max = 100) => text.length > max ? text.slice(0, max) + '...' : text;
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
const isEmpty = (val) => val === null || val === undefined || String(val).trim().length === 0;

const getMentions = (message) =>
  message?.extendedTextMessage?.contextInfo?.mentionedJid ||
  message?.contextInfo?.mentionedJid || [];

const getQuotedMsg = (msg) =>
  msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
  msg?.message?.imageMessage?.contextInfo?.quotedMessage || null;

module.exports = {
  formatBytes, formatDuration, sleep, getTime, getDate, getGreeting,
  isUrl, extractUrls, cleanNumber, jidToNumber, numberToJid,
  truncate, randomItem, randomInt, capitalize, isEmpty,
  getMentions, getQuotedMsg,
};
