// ============================================
//       Prince Md - UNICODE FONTS UTILITY
// ============================================

// ─── Small Caps Map ──────────────────────────
const smallCapsMap = {
  a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ',
  f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ',
  k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ',
  p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 'ꜱ', t: 'ᴛ',
  u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ',
  z: 'ᴢ',
};

// ─── Bold Unicode Map ─────────────────────────
const boldMap = {
  a: '𝗮', b: '𝗯', c: '𝗰', d: '𝗱', e: '𝗲',
  f: '𝗳', g: '𝗴', h: '𝗵', i: '𝗶', j: '𝗷',
  k: '𝗸', l: '𝗹', m: '𝗺', n: '𝗻', o: '𝗼',
  p: '𝗽', q: '𝗾', r: '𝗿', s: '𝘀', t: '𝘁',
  u: '𝘂', v: '𝘃', w: '𝘄', x: '𝘅', y: '𝘆',
  z: '𝘇',
  A: '𝗔', B: '𝗕', C: '𝗖', D: '𝗗', E: '𝗘',
  F: '𝗙', G: '𝗚', H: '𝗛', I: '𝗜', J: '𝗝',
  K: '𝗞', L: '𝗟', M: '𝗠', N: '𝗡', O: '𝗢',
  P: '𝗣', Q: '𝗤', R: '𝗥', S: '𝗦', T: '𝗧',
  U: '𝗨', V: '𝗩', W: '𝗪', X: '𝗫', Y: '𝗬',
  Z: '𝗭',
  '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰',
  '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵',
};

// ─── Italic Unicode Map ───────────────────────
const italicMap = {
  a: '𝘢', b: '𝘣', c: '𝘤', d: '𝘥', e: '𝘦',
  f: '𝘧', g: '𝘨', h: '𝘩', i: '𝘪', j: '𝘫',
  k: '𝘬', l: '𝘭', m: '𝘮', n: '𝘯', o: '𝘰',
  p: '𝘱', q: '𝘲', r: '𝘳', s: '𝘴', t: '𝘵',
  u: '𝘶', v: '𝘷', w: '𝘸', x: '𝘹', y: '𝘺',
  z: '𝘻',
};

// ─── Monospace Unicode Map ────────────────────
const monoMap = {
  a: '𝚊', b: '𝚋', c: '𝚌', d: '𝚍', e: '𝚎',
  f: '𝚏', g: '𝚐', h: '𝚑', i: '𝚒', j: '𝚓',
  k: '𝚔', l: '𝚕', m: '𝚖', n: '𝚗', o: '𝚘',
  p: '𝚙', q: '𝚚', r: '𝚛', s: '𝚜', t: '𝚝',
  u: '𝚞', v: '𝚟', w: '𝚠', x: '𝚡', y: '𝚢',
  z: '𝚣',
};

/**
 * Convert text to Unicode Small Caps
 * @param {string} text
 * @returns {string}
 */
const toSmallCaps = (text) => {
  return String(text).toLowerCase().split('').map(char => smallCapsMap[char] || char).join('');
};

/**
 * Convert text to Unicode Bold
 * @param {string} text
 * @returns {string}
 */
const toBold = (text) => {
  return String(text).split('').map(char => boldMap[char] || char).join('');
};

/**
 * Convert text to Unicode Italic
 * @param {string} text
 * @returns {string}
 */
const toItalic = (text) => {
  return String(text).toLowerCase().split('').map(char => italicMap[char] || char).join('');
};

/**
 * Convert text to Unicode Monospace
 * @param {string} text
 * @returns {string}
 */
const toMono = (text) => {
  return String(text).toLowerCase().split('').map(char => monoMap[char] || char).join('');
};

/**
 * Convert text to Fancy style (mixed)
 * @param {string} text
 * @returns {string}
 */
const toFancy = (text) => {
  return `✦ ${toSmallCaps(text)} ✦`;
};

/**
 * Create a styled header box
 * @param {string} title
 * @returns {string}
 */
const headerBox = (title) => {
  const sc = toSmallCaps(title);
  const line = '═'.repeat(sc.length + 4);
  return `╔${line}╗\n║  ${sc}  ║\n╚${line}╝`;
};

module.exports = {
  toSmallCaps,
  toBold,
  toItalic,
  toMono,
  toFancy,
  headerBox,
};
