'use strict';
const config         = require('../config/config');
const logger         = require('../utils/logger');
const { checkRateLimit } = require('../middleware/auth');

// ===== COMMAND IMPORTS =====
const adminCmd        = require('../commands/admin');
const downloaderCmd   = require('../commands/downloader');
const funCmd          = require('../commands/fun');
const generalCmd      = require('../commands/general');
const groupCmd        = require('../commands/group');
const jidCmd          = require('../commands/jid');
const lockchatCmd     = require('../commands/lockchat');
const mediaCmd        = require('../commands/media');
const menuCmd         = require('../commands/menu');
const pinterestCmd    = require('../commands/pinterest');
const reactCmd        = require('../commands/react');
const restrictCmd     = require('../commands/restrict');
const searchCmd       = require('../commands/search');
const setppCmd        = require('../commands/setpp');
const setppgcCmd      = require('../commands/setppgc');
const stickerCmd      = require('../commands/sticker');
const stickercmdCmd   = require('../commands/stickercmd');
const teraboxCmd      = require('../commands/terabox');
const ticCmd          = require('../commands/tic');
const totalchatCmd    = require('../commands/totalchat');
const utilityCmd      = require('../commands/utility');
const videoDownloadCmd = require('../commands/videoDownload');
const viewonceCmd     = require('../commands/viewonce');
const wastalkCmd      = require('../commands/wastalk');
const wallpaperCmd    = require('../commands/wallpaper');
const webCmd          = require('../commands/web');
const wormgptCmd      = require('../commands/wormgpt');
const daughterCmd     = require('../commands/daughter');
const hdCmd           = require('../commands/hd');
const sstatusCmd      = require('../commands/sstatus');
const getppCmd        = require('../commands/getpp');
const ccgenCmd        = require('../commands/ccgen');
const chatbotCmd      = require('../commands/chatbot');
const claudeCmd       = require('../commands/claude');
const hangmanCmd      = require('../commands/hangman');
const wifeCmd         = require('../commands/wife');
const aiimageCmd      = require('../commands/aiimage');
const aiExtrasCmd     = require('../commands/aiExtras');
const numbertrackerCmd = require('../commands/numbertracker');
const iptrackerCmd    = require('../commands/iptracker');
const fakenumberCmd   = require('../commands/fakenumber');
const otpCmd          = require('../commands/otp');
const adultCmd        = require('../commands/adult');
const bbcCmd          = require('../commands/bbc');
const chatgptCmd      = require('../commands/chatgpt');
const grokCmd         = require('../commands/grok');
const antidelete      = require('../commands/antidelete').antidelete;

// ===== STICKER COMMAND FUNCTIONS =====
const { setStickerCommand, getStickerCommand, deleteStickerCommand } = require('../commands/stickercmd');

// ===== OWNER & STATE MANAGEMENT =====
let owner = '';
let secondOwnerLIDs = [];
let botName = '';

function setOwner(num) { owner = num; }
function addOwnerLID(lid) { secondOwnerLIDs.push(lid); }
function removeSecondOwner(lid) { secondOwnerLIDs = secondOwnerLIDs.filter(id => id !== lid); }
function setBotName(name) { botName = name; }
function getBotName() { return botName; }

// ===== AUTO-STICKER & ANTI-CHANNEL FUNCTIONS =====
const { autoStickerDelete, autoChannelDelete } = require('../commands/sticker');

// ===== MAIN MESSAGE HANDLER =====
const handleMessage = async (sock, msg) => {
  try {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const senderDigits = sender.replace(/[^0-9]/g, '');
    const botNum = sock.user.id.split(':')[0];
    const cleanBotNum = botNum.replace(/[^0-9]/g, '');
    const { body } = msg.message || {};
    
    // Skip bot's own messages
    if (msg.key.fromMe) return;

    // ===== AUTO-DELETE FEATURES =====
    const ctx = {
      sock, msg, from, sender, senderDigits,
      isGroup: from.endsWith('@g.us'),
      isOwner: owner === senderDigits || secondOwnerLIDs.includes(senderDigits),
      body, botNum, cleanBotNum,
      type: Object.keys(msg.message || {})[0],
      args: body?.slice(config.prefix.length).trim().split(/\s+/) || [],
      reply: (text, opts) => sock.sendMessage(from, { text }, from.endsWith('@g.us') ? { quoted: msg, ...opts } : { ...opts }),
      react: (emoji) => sock.sendMessage(from, { react: { text: emoji, key: msg.key } }),
    };

    // Auto sticker delete
    await autoStickerDelete(ctx);
    
    // Auto channel delete
    await autoChannelDelete(ctx);

    // Only process commands with prefix
    if (!body || !body.startsWith(config.prefix)) return;
    
    const args = body.slice(config.prefix.length).trim().split(/\s+/);
    const command = args.shift()?.toLowerCase();
    if (!command) return;

    // ===== AUTHENTICATION & ACCESS CONTROL =====
    const db = require('../database/db');
    const mode = db.getBotMode(cleanBotNum);
    const finalIsOwner = owner === senderDigits || secondOwnerLIDs.includes(senderDigits);
    const isRestricted = db.isRestricted(senderDigits, cleanBotNum);

    if (mode === 'private' && !finalIsOwner) return;
    if (isRestricted && !finalIsOwner) return;

    // ===== RATE LIMITING =====
    if (!finalIsOwner && !checkRateLimit(senderDigits)) {
      await ctx.reply('⚠️ *Rate limit exceeded!* Please wait before using commands again.');
      return;
    }

    // ===== COMMAND EXECUTION =====
    try {
      switch (command) {
        case 'menu': await menuCmd.run(ctx); break;
        case 'ping': await generalCmd.ping(ctx); break;
        case 'alive': await generalCmd.alive(ctx); break;
        case 'info': await generalCmd.info(ctx); break;
        case 'uptime': await generalCmd.uptime(ctx); break;
        case 'speed': await generalCmd.speed(ctx); break;
        case 'owner': await generalCmd.owner(ctx); break;
        case 'pair': await generalCmd.pair(ctx); break;
        
        // Group Commands
        case 'kick': await groupCmd.kick(ctx); break;
        case 'add': await groupCmd.add(ctx); break;
        case 'promote': await groupCmd.promote(ctx); break;
        case 'demote': await groupCmd.demote(ctx); break;
        case 'mute': await groupCmd.mute(ctx); break;
        case 'unmute': await groupCmd.unmute(ctx); break;
        case 'tagall': await groupCmd.tagall(ctx); break;
        case 'hidetag': await groupCmd.hidetag(ctx); break;
        case 'groupinfo': await groupCmd.groupinfo(ctx); break;
        case 'setname': await groupCmd.setname(ctx); break;
        case 'setdesc': await groupCmd.setdesc(ctx); break;
        case 'linkgc': await groupCmd.linkgc(ctx); break;
        case 'revokegc': await groupCmd.revokegc(ctx); break;
        case 'antilink': await groupCmd.antilink(ctx); break;
        case 'antichannel': await groupCmd.antichannel(ctx); break;
        
        // Sticker Commands
        case 'sticker': case 's': await stickerCmd.sticker(ctx); break;
        case 'toimg': await stickerCmd.toimg(ctx); break;
        case 'stickerinfo': await stickerCmd.stickerinfo(ctx); break;
        case 'emojimix': await stickerCmd.emojimix(ctx); break;
        case 'antisticker': await groupCmd.antisticker(ctx); break;
        
        // Download Commands
        case 'play': case 'song': await mediaCmd.play(ctx); break;
        case 'video': await mediaCmd.video(ctx); break;
        case 'gif': await mediaCmd.gif(ctx); break;
        case 'tomp3': await mediaCmd.tomp3(ctx); break;
        case 'ytmp3': await downloaderCmd.ytmp3(ctx); break;
        case 'ytmp4': await downloaderCmd.ytmp4(ctx); break;
        case 'tiktok': await downloaderCmd.tiktok(ctx); break;
        case 'instagram': case 'ig': await downloaderCmd.instagram(ctx); break;
        case 'facebook': case 'fb': await downloaderCmd.facebook(ctx); break;
        case 'twitter': case 'tw': await downloaderCmd.twitter(ctx); break;
        case 'pinterest': case 'pin': await downloaderCmd.pinterest(ctx); break;
        case 'terabox': case 'tb': await teraboxCmd.terabox(ctx); break;
        case 'sstatus': await sstatusCmd.sstatus(ctx); break;
        
        // Fun Commands
        case 'son': case 'beta': await funCmd.son(ctx); break;
        case 'joke': await funCmd.joke(ctx); break;
        case 'quote': await funCmd.quote(ctx); break;
        case 'fact': await funCmd.fact(ctx); break;
        case '8ball': await funCmd.eightball(ctx); break;
        case 'dare': await funCmd.dare(ctx); break;
        case 'truth': await funCmd.truth(ctx); break;
        case 'ship': await funCmd.ship(ctx); break;
        case 'rate': await funCmd.rate(ctx); break;
        case 'daughter': case 'beti': await daughterCmd.daughter(ctx); break;
        case 'hangman': await hangmanCmd.hangman(ctx); break;
        case 'wife': await wifeCmd.wife(ctx); break;
        
        // AI Commands
        case 'wormgpt': case 'wgpt': await wormgptCmd.wormgpt(ctx); break;
        case 'cursorai': case 'cursor': await wormgptCmd.cursorai(ctx); break;
        case 'claude': await claudeCmd.claude(ctx); break;
        case 'devin': await aiExtrasCmd.devin(ctx); break;
        case 'windsurf': await aiExtrasCmd.windsurf(ctx); break;
        case 'codex': await aiExtrasCmd.codex(ctx); break;
        case 'gpt5.4': case 'gpt54': await aiExtrasCmd.gpt54(ctx); break;
        case 'bolt': await aiExtrasCmd.bolt(ctx); break;
        case 'kiro': await aiExtrasCmd.kiro(ctx); break;
        case 'grok': await grokCmd.grok(ctx); break;
        case 'bbc': await bbcCmd.bbc(ctx); break;
        case 'chatbotgc': await chatbotCmd.chatbotgc(ctx); break;
        case 'chatbotdm': await chatbotCmd.chatbotdm(ctx); break;
        case 'chatgpt': case 'gpt': await chatgptCmd.chatgpt(ctx); break;
        case 'aiimage': case 'aiimg': case 'dalle': await aiimageCmd.aiimage(ctx); break;
        case 'hd': await hdCmd.hd(ctx); break;
        
        // Utility Commands
        case 'tts': await utilityCmd.tts(ctx); break;
        case 'translate': case 'tr': await utilityCmd.translate(ctx); break;
        case 'qr': await utilityCmd.qr(ctx); break;
        case 'calc': await utilityCmd.calc(ctx); break;
        case 'shorturl': await utilityCmd.shorturl(ctx); break;
        case 'reverse': await utilityCmd.reverse(ctx); break;
        case 'fancy': await utilityCmd.fancy(ctx); break;
        case 'wiki': await utilityCmd.wiki(ctx); break;
        case 'google': case 'search': await searchCmd.google(ctx); break;
        case 'image': case 'img': await searchCmd.image(ctx); break;
        case 'lyrics': await searchCmd.lyrics(ctx); break;
        case 'weather': await searchCmd.weather(ctx); break;
        case 'jid': await jidCmd.jid(ctx); break;
        case 'web': await webCmd.web(ctx); break;
        case 'totalchat': case 'rank': await totalchatCmd.totalchat(ctx); break;
        case 'wallpaper': case 'wp': await wallpaperCmd.wallpaper(ctx); break;
        case 'pindl': case 'pinterestdl': await pinterestCmd.pindl(ctx); break;
        case 'wastalk': await wastalkCmd.wastalk(ctx); break;
        case 'getpp': await getppCmd.getpp(ctx); break;
        case 'wastatus': await wastalkCmd.wastatus(ctx); break;
        
        // Security & Privacy Commands
        case 'numbertracker': case 'numtrack': await numbertrackerCmd.numbertracker(ctx); break;
        case 'iptracker': case 'iptrack': await iptrackerCmd.iptracker(ctx); break;
        case 'fakenumber': case 'fakenum': await fakenumberCmd.fakenumber(ctx); break;
        case 'checknumber': case 'checknum': await fakenumberCmd.checknumber(ctx); break;
        case 'otp': await otpCmd.otp(ctx); break;
        case 'otpstatus': await otpCmd.otpstatus(ctx); break;
        case 'nsfw': case 'hentai': case 'porn': case 'xxx': case 'xvideos': case 'boobs': case 'ass': case 'pussy': case 'milf': await adultCmd.run(ctx); break;
        
        // Owner Commands
        case 'broadcast': case 'bc': await adminCmd.broadcast(ctx); break;
        case 'restart': await adminCmd.restart(ctx); break;
        case 'setppgc': await setppgcCmd.setppgc(ctx); break;
        case 'delete': case 'del': await adminCmd.del(ctx); break;
        case 'warn': await adminCmd.warn(ctx); break;
        case 'resetwarn': await adminCmd.resetwarn(ctx); break;
        case 'afk': await adminCmd.afk(ctx); break;
        case 'mode': await adminCmd.mode(ctx); break;
        case 'gen': await ccgenCmd.ccgen(ctx); break;
        case 'addowner': await adminCmd.addowner(ctx); break;
        case 'removeowner': await adminCmd.removeowner(ctx); break;
        case 'welcome': await adminCmd.welcome(ctx); break;
        case 'bye': await adminCmd.bye(ctx); break;
        case 'pnotify': await adminCmd.pnotify(ctx); break;
        case 'dnotify': await adminCmd.dnotify(ctx); break;
        case 'siminfo': await adminCmd.siminfo(ctx); break;
        case 'cnicinfo': await adminCmd.cnicinfo(ctx); break;
        case 'restrict': await restrictCmd.restrict(ctx); break;
        case 'unrestrict': await restrictCmd.unrestrict(ctx); break;
        case 'vv': case 'viewonce': await viewonceCmd.viewonce(ctx); break;
        case 'antidelete': case 'ad': await antidelete(ctx); break;
        case 'react': await reactCmd.reactCommand(ctx); break;
        case 'setpp': await setppCmd.setpp(ctx); break;
        case 'lockchat': await lockchatCmd.lockchat(ctx); break;
        case 'unlockchat': await lockchatCmd.unlockchat(ctx); break;
        case 'lockedusers': await lockchatCmd.lockedusers(ctx); break;
        case 'setcmd': await setStickerCommand(sock, msg, args); break;
        case 'getcmd': await getStickerCommand(sock, msg, args); break;
        case 'delcmd': await deleteStickerCommand(sock, msg, args); break;
        
        default: break;
      }
    } catch (err) {
      if (err.message && (err.message.includes('Bad MAC') || err.message.includes('decryption'))) {
        logger.error('Session Error: Decryption failed. Please re-scan QR.');
        return;
      }
      if (err.message?.includes('not-acceptable')) return;
      logger.error(`Command error [${command}]:`, err.message);
      await ctx.reply(`❌ *Error!*\n\n${err.message}`);
    }
  } catch (err) {
    logger.error('Message Handler Error:', err);
  }
};

module.exports = { handleMessage, setOwner, addOwnerLID, removeSecondOwner, setBotName, getBotName };
