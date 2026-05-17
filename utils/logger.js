// ============================================
//       Prince Md — LOGGER (No Dependencies)
// ============================================

'use strict';

// ─── Simple colored logger without chalk/moment
const colors = {
  reset:   '\x1b[0m',
  cyan:    '\x1b[36m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  red:     '\x1b[31m',
  magenta: '\x1b[35m',
  blue:    '\x1b[34m',
  white:   '\x1b[37m',
};

const getTime = () => {
  const now = new Date();
  return now.toLocaleTimeString('en-GB') + ' ' + now.toLocaleDateString('en-GB');
};

const logger = {
  info: (msg, ...args) => console.log(`${colors.cyan}[${getTime()}]${colors.reset}${colors.blue} [INFO] ${colors.reset}${msg}`, ...args),
  success: (msg, ...args) => console.log(`${colors.cyan}[${getTime()}]${colors.reset}${colors.green} [SUCCESS] ${colors.reset}${msg}`, ...args),
  warn: (msg, ...args) => console.log(`${colors.cyan}[${getTime()}]${colors.reset}${colors.yellow} [WARN] ${colors.reset}${msg}`, ...args),
  error: (msg, ...args) => console.log(`${colors.cyan}[${getTime()}]${colors.reset}${colors.red} [ERROR] ${colors.reset}${msg}`, ...args),
  // DEBUG method ko khali kar diya taake terminal saaf rahe
  debug: (msg, ...args) => {}, 
  // Trace method bhi add kar diya taake crash na ho
  trace: (msg, ...args) => {},
  // Fatal method bhi add kar diya
  fatal: (msg, ...args) => console.log(`${colors.cyan}[${getTime()}]${colors.reset}${colors.red} [FATAL] ${colors.reset}${msg}`, ...args),
  
  cmd: (user, command, args = []) => console.log(`${colors.cyan}[${getTime()}]${colors.reset}${colors.magenta} [CMD] ${colors.yellow}${user}${colors.white} → ${colors.green}.${command}${colors.reset}${args.length ? ' [' + args.join(', ') + ']' : ''}`),
  connect: (number, status) => console.log(`${colors.cyan}[${getTime()}]${colors.reset}${colors.blue} [CONNECTION] ${status === 'connected' ? colors.green : colors.red}${number} → ${status.toUpperCase()}${colors.reset}`),
  banner: () => console.log(`${colors.cyan}
╔═══════════════════════════════════════════╗
║                                           ║
║        ᴘʀɪɴᴄᴇ ᴍᴅ  —  WhatsApp Bot         ║
║                                           ║
║   Developer  :  ᴀʙᴅᴜʟ ʀᴀꜰᴇʜ               ║
║   Version    :  v2.0.0                    ║
║   Platform   :  WhatsApp Multi-Device     ║
║                                           ║
╚═══════════════════════════════════════════╝
${colors.reset}`),
};

module.exports = logger;