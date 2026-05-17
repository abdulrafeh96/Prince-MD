// ============================================
//     Prince Md — UTILS/FSHELPER.JS
//     fs-extra replacement using built-in fs
// ============================================

'use strict';

const fs   = require('fs');
const path = require('path');

const ensureDirSync = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const removeSync = (targetPath) => {
  if (!fs.existsSync(targetPath)) return;
  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  } else {
    fs.unlinkSync(targetPath);
  }
};

const readJsonSync = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
};

const writeJsonSync = (filePath, data, options = {}) => {
  const spaces = options.spaces || 2;
  fs.writeFileSync(filePath, JSON.stringify(data, null, spaces), 'utf8');
};

const copySync = (src, dest) => {
  fs.copyFileSync(src, dest);
};

const readdirSync = (dirPath) => {
  return fs.readdirSync(dirPath);
};

const existsSync = (p) => fs.existsSync(p);
const readFileSync = (p) => fs.readFileSync(p);
const writeFileSync = (p, d) => fs.writeFileSync(p, d);
const statSync = (p) => fs.statSync(p);

module.exports = {
  ensureDirSync,
  removeSync,
  readJsonSync,
  writeJsonSync,
  copySync,
  readdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
  statSync,
};
