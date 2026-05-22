'use strict';
const config         = require('../config/config');
const logger         = require('../utils/logger');
const { checkRateLimit, isGroupAdmin } = require('../middleware/auth');
const menuCmd       = require('../commands/menu');
const generalCmd    = require('../commands/general');
const groupCmd      = require('../commands/group');
const stickerCmd    = require('../commands/sticker');
const downloaderCmd = require('../commands/downloader');
const funCmd        = require('../commands/fun');
const ccgenCmd      = require('../commands/ccgen');
const utilityCmd    = require('../commands/utility');
const searchCmd     = require('../commands/search');
const mediaCmd      = require('../commands/media');
const adminCmd      = require('../commands/admin');
const restrictCmd   = require('../commands/restrict');
const teraboxCmd    = require('../commands/terabox');
const wormgptCmd    = require('../commands/wormgpt');
const chatbotCmd    = require('../commands/chatbot');
const wallpaperCmd  = require('../commands/wallpaper');
const claudeCmd     = require('../commands/claude');
const jidCmd        = require('../commands/jid');
const hdCmd         = require('../commands/hd');
const sstatusCmd = require('../commands/sstatus');
const { checkAntiLink }    = require('../utils/antilink');
const { checkAntiKeyword } = require('../utils/antikeyword');
const { checkAntiChannel } = require('../utils/antichannel');
const { checkAntiSticker } = require('../utils/antisticker');
const { checkAntiSpam }    = require('../utils/antispam');
const { handleChatbot }    = require('../commands/chatbot');
const antikeywordCmd = require('../commands/antikeyword');
const db             = require('../database/db');
const ownerManager   = require('../core/owner');
const { storeMessageForAntidelete, handleDeletedMessage, antidelete } = require('../commands/antidelete');
const { vv, handleViewOnceAutoReply } = require('../commands/viewonce');
const hangmanCmd = require('../commands/hangman');
const setppCmd = require('../commands/setpp');
const { setStickerCommand, getStickerCommand, deleteStickerCommand, executeStickerCommand } = require('../commands/stickercmd');
const webCmd = require('../commands/web');
const grokCmd = require('../commands/grok');
const bbcCmd = require('../commands/bbc');
const ticCmd = require('../commands/tic');
const daughterCmd = require('../commands/daughter');
const totalchatCmd = require('../commands/totalchat');
const wifeCmd = require('../commands/wife');
const reactCmd = require('../commands/react');
const setppgcCmd = require('../commands/setppgc');
const getppCmd = require('../commands/getpp');
const lockchatCmd = require('../commands/lockchat');
const antigroupCmd = require('../commands/antigroup');
const groupstatusCmd = require('../commands/groupstatus');
const pinterestCmd = require('../commands/pinterest');
const wastalkCmd = require('../commands/wastalk');
const chatgptCmd = require('../commands/chatgpt');
const aiimageCmd = require('../commands/aiimage');
const aiExtrasCmd = require('../commands/aiExtras');
const otpCmd = require('../commands/otp');
const videoDownloadCmd = require('../commands/videoDownload');

const safeText = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const sendSafeText = async (sock, jid, text, opts) => {
  const cleanText = safeText(text);
  if (!cleanText) return false;
  await sock.sendMessage(jid, { text: cleanText }, opts);
  return true;
};

// ID Tracking: Ab har bot ki alag tracking hogi
const botProcessedIds = new Map(); 
const MAX_PROCESSED = 2000;
const BOT_START_TIME = Math.floor(Date.now() / 1000) - 30;
const GROUP_ADMIN_COMMANDS = new Set([
  'kick',
  'add',
  'promote',
  'demote',
  'mute',
  'unmute',
  'tagall',
  'hidetag',
  'groupinfo',
  'setname',
  'setdesc',
  'setppgc',
  'linkgc',
  'revokegc',
  'antilink',
  'antikeyword',
  'antiword',
  'antiwords',
  'antichannel',
  'antisticker',
  'antispam',
  'antigroup',
  'groupstatus',
  'autoopen',
  'autoclose',
  'autostatus',
  'warn',
  'resetwarn',
  'welcome',
  'bye',
  'pnotify',
  'dnotify',
  'lockchat',
  'unlockchat',
  'lockedusers',
  'setcmd',
  'getcmd',
  'delcmd',
]);

const ownerMap  = new Map();
const botNames  = new Map();

const setBotName = (botNum, name) => botNames.set(botNum.replace(/[^0-9]/g,''), name);
const getBotName = (botNum)       => botNames.get(botNum.replace(/[^0-9]/g,'')) || 'Prince Md';

const addOwner = (botNum, identifier) => {
  const b = botNum.replace(/[^0-9]/g,'');
  const i = identifier.replace(/[^0-9]/g,'');
  if (!b || !i) return;
  if (!ownerMap.has(b)) ownerMap.set(b, new Set());
  ownerMap.get(b).add(i);
};
const setOwner          = (botNum, ownerNum) => addOwner(botNum, ownerNum);
const addOwnerLID       = (botNum, lid)      => addOwner(botNum, lid);
const removeSecondOwner = (botNum, identifier) => {
  const b = botNum.replace(/[^0-9]/g,'');
  const i = identifier.replace(/[^0-9]/g,'');
  if (ownerMap.has(b)) ownerMap.get(b).delete(i);
};

const handleMessage = async (sock, m, botNum) => {
  const msg = m.messages?.[0];
  if (!msg || !msg.message) return;

  // ─── FIX: Har bot ka apna alag processed list ───
  if (!botProcessedIds.has(botNum)) botProcessedIds.set(botNum, new Set());
  const processedMsgIds = botProcessedIds.get(botNum);
  
  const msgId = msg.key?.id;
  const remoteJid = msg.key?.remoteJid;
  const uniqueKey = `${remoteJid}:${msgId}`; 
  if (uniqueKey) {
    if (processedMsgIds.has(uniqueKey)) return;
    processedMsgIds.add(uniqueKey);
    if (processedMsgIds.size > MAX_PROCESSED) {
      const first = processedMsgIds.values().next().value;
      processedMsgIds.delete(first);
    }
  }

  // ─── Purane message ignore karo ───
  const msgTimestamp = msg.messageTimestamp
    ? (typeof msg.messageTimestamp === 'object' ? msg.messageTimestamp.low : msg.messageTimestamp)
    : null;
  if (msgTimestamp && msgTimestamp < BOT_START_TIME) return;

  const type = Object.keys(msg.message)[0];
  if (['senderKeyDistributionMessage', 'reactionMessage', 'ephemeralSettingControl'].includes(type)) return;
  if (type === 'protocolMessage') {
    const subType = msg.message.protocolMessage?.type;
    if (subType === 0 || subType === 5) {
      await handleDeletedMessage(sock, msg, botNum).catch(() => {});
    }
    return;
  }

  const from    = msg.key.remoteJid;
  const isGroup = from?.endsWith('@g.us');

  if (isGroup && msg.key.fromMe) return;
  if (!isGroup && msg.key.fromMe) {
    const rb = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    if (!rb.startsWith(config.prefix)) return;
  }

  const body =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    msg.message?.documentMessage?.caption ||
    msg.message?.buttonsResponseMessage?.selectedDisplayText ||
    msg.message?.listResponseMessage?.title || '';

  if (!body && !['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage', 'newsletterAdminInviteMessage'].includes(type)) return;

  let sender;
  if (isGroup) {
    sender = msg.key.participant || msg.key.remoteJid;
  } else {
    sender = msg.key.fromMe ? `${botNum}@s.whatsapp.net` : msg.key.remoteJid;
  }

  const cleanBotNum = botNum.replace(/[^0-9]/g,'');
  const toDigits    = (val) => (val || '').toString().replace(/[^0-9]/g, '');

  const senderDigits      = toDigits(sender);
  const participantDigits = toDigits(msg.key.participant);
  const fromDigits        = toDigits(from);

  const mainOwner    = toDigits(db.getMainOwner(cleanBotNum));
  const secondOwners = (db.getSecondOwners(cleanBotNum) || []).map(toDigits);

  const ownerMapEntries = ownerMap.get(cleanBotNum) || new Set();
  const isMapOwner = [...ownerMapEntries].some(o => {
    const d = toDigits(o);
    return d === senderDigits || d === participantDigits;
  });

  const isOwner = msg.key.fromMe === true || senderDigits === mainOwner || participantDigits === mainOwner || fromDigits === mainOwner || secondOwners.includes(senderDigits) || secondOwners.includes(participantDigits) || secondOwners.includes(fromDigits) || isMapOwner;

  let isContactOwner = false;
  if (!isOwner && isGroup && msg.key.participant) {
    try {
      const meta = await sock.groupMetadata(from).catch(() => null);
      if (meta?.participants) {
        for (const p of meta.participants) {
          const pDigits = toDigits(p.id);
          const pLid    = toDigits(p.lid || '');
          if ((pDigits === senderDigits || pLid === senderDigits) && (pDigits === mainOwner || pLid === mainOwner || secondOwners.includes(pDigits) || secondOwners.includes(pLid))) {
            isContactOwner = true; break;
          }
        }
      }
    } catch {}
  }

  const finalIsOwner = isOwner || isContactOwner;
  const isRestricted = db.isRestricted(sender, cleanBotNum) || db.isRestricted(senderDigits, cleanBotNum);
  const mode         = db.getBotMode(cleanBotNum);
  let senderIsGroupAdmin = false;

  storeMessageForAntidelete(sock, msg, botNum).catch(() => {});
  
  if (isGroup) {
      totalchatCmd.trackMessage(from, sender, botNum);
      senderIsGroupAdmin = await isGroupAdmin(sock, from, sender).catch(() => false);
  }

  const protectedSender = finalIsOwner || senderIsGroupAdmin;

  const lockedChatHandled = await lockchatCmd.checkLockedChat(sock, msg, from, sender, botNum, protectedSender).catch(() => false);
  if (lockedChatHandled) return;

  if (isGroup) {
    const antiStickerHandled = await checkAntiSticker(sock, msg, from, sender, botNum, finalIsOwner, senderIsGroupAdmin).catch(() => false);
    if (antiStickerHandled) return;

    const antiSpamHandled = await checkAntiSpam(sock, msg, from, sender, botNum, protectedSender).catch(() => false);
    if (antiSpamHandled) return;

    const antiChannelHandled = await checkAntiChannel(sock, msg, from, sender, body, botNum, protectedSender).catch(() => false);
    if (antiChannelHandled) return;
  }

  if (!body.startsWith(config.prefix)) {
    // 🎯 Check for ViewOnce auto-reply
    if (type === 'viewOnceMessageV2' || type === 'viewOnceMessage' || type === 'ephemeralMessage') {
      const ctx = { sock, msg, from, sender, isGroup, body, text: body, botNum };
      await handleViewOnceAutoReply(ctx).catch(() => {});
      return;
    }
    
    // Check for sticker commands first
    if (isGroup && type === 'stickerMessage') {
      await executeStickerCommand(sock, msg).catch(() => {});
      return;
    }
    
            
    if (isGroup && body) {
      await checkAntiLink(sock, msg, from, sender, body, botNum, protectedSender).catch(() => {});
      await checkAntiKeyword(sock, msg, from, sender, body, botNum, protectedSender).catch(() => {});
    }
    if (body.trim()) {
      await handleChatbot(sock, msg, from, sender, body, botNum, isGroup, finalIsOwner).catch(() => {});
    }
    return;
  }

  
    
  const args    = body.slice(config.prefix.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();
  if (!command) return;

  const isGroupAdminCommand = GROUP_ADMIN_COMMANDS.has(command);

  if (isGroupAdminCommand) {
    if (!isGroup) {
      return sendSafeText(sock, from, 'This command can only be used in groups.', { quoted: msg });
    }

    senderIsGroupAdmin = await isGroupAdmin(sock, from, sender).catch(() => false);
    if (!senderIsGroupAdmin) {
      return sendSafeText(sock, from, 'Only group admins can use this command.', { quoted: msg });
    }
  }

  if (mode === 'private' && !finalIsOwner) {
    const adminAllowed = isGroupAdminCommand && senderIsGroupAdmin;

    if (!adminAllowed) return;
  }
  if (isRestricted && !finalIsOwner)       return;

  const ctx = {
    sock, msg, from, sender, senderDigits,
    isGroup, isOwner: finalIsOwner, body, botNum, cleanBotNum, type, args,
    reply: (text, opts) => sendSafeText(sock, from, text, isGroup ? { quoted: msg, ...opts } : { ...opts }),
    react: (emoji) => sock.sendMessage(from, { react: { text: emoji, key: msg.key } }),
  };

  if (!finalIsOwner && !checkRateLimit(senderDigits)) {
    return ctx.reply('⏳ Too many commands. Wait a moment.');
  }

  logger.cmd(senderDigits, command, args);

  try {
    switch (command) {
      case 'menu': case 'help': case 'start': await menuCmd.run(ctx);           break;
      case 'ping':      await generalCmd.ping(ctx);    break;
      case 'info':      await generalCmd.info(ctx);    break;
      case 'alive':     await generalCmd.alive(ctx);   break;
      case 'speed':     await generalCmd.speed(ctx);   break;
      case 'uptime':    await generalCmd.uptime(ctx);  break;
      case 'owner':     await generalCmd.owner(ctx);   break;
      case 'pair':      await generalCmd.pair(ctx);    break;
      case 'kick':      await groupCmd.kick(ctx);      break;
      case 'add':       await groupCmd.add(ctx);       break;
      case 'promote':   await groupCmd.promote(ctx);   break;
      case 'demote':    await groupCmd.demote(ctx);    break;
      case 'mute':      await groupCmd.mute(ctx);      break;
      case 'unmute':    await groupCmd.unmute(ctx);    break;
      case 'tagall':    await groupCmd.tagall(ctx);    break;
      case 'hidetag':   await groupCmd.hidetag(ctx);   break;
      case 'groupinfo': await groupCmd.groupinfo(ctx); break;
      case 'setname':   await groupCmd.setname(ctx);   break;
      case 'setdesc':   await groupCmd.setdesc(ctx);   break;
      case 'linkgc':      await groupCmd.linkgc(ctx);      break;
      case 'revokegc':    await groupCmd.revokegc(ctx);    break;
      case 'antilink':    await groupCmd.antilink(ctx);    break;
      case 'antichannel': await groupCmd.antichannel(ctx); break;
      case 'antisticker': await groupCmd.antisticker(ctx); break;
      case 'antispam':    await groupCmd.antispam(ctx);    break;
      case 'autoopen':    await groupCmd.autoopen(ctx);    break;
      case 'autoclose':   await groupCmd.autoclose(ctx);   break;
      case 'autostatus':  await groupCmd.autostatus(ctx);  break;
      case 'antikeyword': case 'antiword': case 'antiwords': await antikeywordCmd.antikeyword(ctx); break;
      case 'sticker': case 's': await stickerCmd.sticker(ctx);    break;
      case 'toimg':             await stickerCmd.toimg(ctx);       break;
      case 'stickerinfo':       await stickerCmd.stickerinfo(ctx); break;
      case 'emojimix':          await stickerCmd.emojimix(ctx);    break;
      case 'ytmp3':                await downloaderCmd.ytmp3(ctx);     break;
      case 'ytmp4':                await downloaderCmd.ytmp4(ctx);     break;
      case 'tiktok': case 'tt':    await downloaderCmd.tiktok(ctx);    break;
      case 'instagram': case 'ig': await downloaderCmd.instagram(ctx); break;
      case 'facebook': case 'fb':  await downloaderCmd.facebook(ctx);  break;
      case 'twitter':  case 'tw':  await downloaderCmd.twitter(ctx);   break;
      case 'pinterest': case 'pin': await downloaderCmd.pinterest(ctx); break;
      case 'terabox': case 'tb':   await teraboxCmd.terabox(ctx);      break;
      case 'sstatus': await sstatusCmd.sstatus(ctx); break;
      case 'son': case 'beta':     await funCmd.son(ctx);               break;
      case 'play': case 'song':    await mediaCmd.play(ctx);            break;
      case 'video':                await mediaCmd.video(ctx);           break;
      case 'gif':                  await mediaCmd.gif(ctx);             break;
      case 'tomp3':                await mediaCmd.tomp3(ctx);           break;
      case 'wormgpt': case 'wgpt': await wormgptCmd.wormgpt(ctx);      break;
      case 'cursorai': case 'cursor': await wormgptCmd.cursorai(ctx);  break;
      case 'devin':                   await aiExtrasCmd.devin(ctx);      break;
      case 'windsurf':                await aiExtrasCmd.windsurf(ctx);   break;
      case 'codex':                   await aiExtrasCmd.codex(ctx);      break;
      case 'gpt5.4': case 'gpt54':    await aiExtrasCmd.gpt54(ctx);      break;
      case 'bolt':                    await aiExtrasCmd.bolt(ctx);       break;
      case 'kiro':                    await aiExtrasCmd.kiro(ctx);       break;
      case 'hd':                   await hdCmd.hd(ctx);                break;
      case 'joke':   await funCmd.joke(ctx);      break;
      case 'quote':  await funCmd.quote(ctx);     break;
      case 'fact':   await funCmd.fact(ctx);      break;
      case '8ball':  await funCmd.eightball(ctx); break;
      case 'dare':   await funCmd.dare(ctx);      break;
      case 'truth':  await funCmd.truth(ctx);     break;
      case 'ship':   await funCmd.ship(ctx);      break;
      case 'rate':   await funCmd.rate(ctx);      break;
      case 'tts':                  await utilityCmd.tts(ctx);       break;
      case 'translate': case 'tr': await utilityCmd.translate(ctx); break;
      case 'qr':                   await utilityCmd.qr(ctx);        break;
      case 'calc':                 await utilityCmd.calc(ctx);      break;
      case 'shorturl':             await utilityCmd.shorturl(ctx);  break;
      case 'reverse':              await utilityCmd.reverse(ctx);   break;
      case 'fancy':                await utilityCmd.fancy(ctx);     break;
      case 'wiki':                 await utilityCmd.wiki(ctx);      break;
      case 'google': case 'search': await searchCmd.google(ctx);   break;
      case 'image':  case 'img':    await searchCmd.image(ctx);    break;
      case 'lyrics':                await searchCmd.lyrics(ctx);    break;
      case 'weather':               await searchCmd.weather(ctx);   break;
      case 'jid':                   await jidCmd.jid(ctx);          break;
      case 'web': await webCmd.web(ctx); break;
      case 'grok': await grokCmd.grok(ctx); break;
      case 'bbc': await bbcCmd.bbc(ctx); break;
      case 'tic': await ticCmd.tic(ctx); break;
      case 'totalchat': case 'rank': await totalchatCmd.totalchat(ctx); break;
      case 'daughter': case 'beti': await daughterCmd.daughter(ctx); break;
      case 'broadcast': case 'bc': await adminCmd.broadcast(ctx);  break;
      case 'restart':              await adminCmd.restart(ctx);     break;
      case 'setppgc': await setppgcCmd.setppgc(ctx); break;
      case 'delete': case 'del':   await adminCmd.del(ctx);        break;
      case 'getpp': await getppCmd.getpp(ctx); break;
      case 'warn':                 await adminCmd.warn(ctx);        break;
      case 'resetwarn':            await adminCmd.resetwarn(ctx);   break;
      case 'afk':                  await adminCmd.afk(ctx);         break;
      case 'mode':                 await adminCmd.mode(ctx);        break;
      case 'gen':                  await ccgenCmd.ccgen(ctx);       break;
      case 'addowner':             await adminCmd.addowner(ctx);    break;
      case 'removeowner':          await adminCmd.removeowner(ctx); break;
      case 'welcome':              await adminCmd.welcome(ctx);     break;
      case 'bye':                  await adminCmd.bye(ctx);         break;
      case 'pnotify':              await adminCmd.pnotify(ctx);     break;
      case 'dnotify':              await adminCmd.dnotify(ctx);    break;
      case 'siminfo':              await adminCmd.siminfo(ctx);     break;
      case 'cnicinfo':             await adminCmd.cnicinfo(ctx);    break;
      case 'restrict':             await restrictCmd.restrict(ctx);   break;
      case 'unrestrict':           await restrictCmd.unrestrict(ctx); break;
      case 'vv': case 'viewonce':  await vv(ctx);                   break;
      case 'antidelete': case 'ad': await antidelete(ctx);          break;
      case 'chatbotgc':            await chatbotCmd.chatbotgc(ctx); break;
      case 'chatbotdm':            await chatbotCmd.chatbotdm(ctx); break;
      case 'wallpaper': case 'wp': await wallpaperCmd.wallpaper(ctx); break;
      case 'claude':               await claudeCmd.claude(ctx);       break;
      case 'hangman': await hangmanCmd.hangman(ctx); break;
      case 'wife': await wifeCmd.wife(ctx); break;
      case 'react': await reactCmd.reactCommand(ctx); break;
      case 'setpp': await setppCmd.setpp(ctx); break;
      case 'lockchat': await lockchatCmd.lockchat(ctx); break;
      case 'unlockchat': await lockchatCmd.unlockchat(ctx); break;
      case 'lockedusers': await lockchatCmd.lockedusers(ctx); break;
      case 'antigroup': await antigroupCmd.antigroup(ctx); break;
      case 'groupstatus': await groupstatusCmd.groupstatus(ctx); break;
      case 'pinterest': case 'pin': await pinterestCmd.pinterest(ctx); break;
      case 'pindl': case 'pinterestdl': await pinterestCmd.pindl(ctx); break;
      case 'wastalk': await wastalkCmd.wastalk(ctx); break;
      case 'getpp': await wastalkCmd.getpp(ctx); break;
      case 'wastatus': await wastalkCmd.wastatus(ctx); break;
      case 'chatgpt': case 'gpt': await chatgptCmd.chatgpt(ctx); break;
      case 'aiimage': case 'aiimg': case 'dalle': await aiimageCmd.aiimage(ctx); break;
      case 'numbertracker': case 'numtrack': await numbertrackerCmd.numbertracker(ctx); break;
      case 'iptracker': case 'iptrack': await iptrackerCmd.iptracker(ctx); break;
      case 'otp': await otpCmd.otp(ctx); break;
      case 'otpstatus': await otpCmd.otpstatus(ctx); break;
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
};



module.exports = { handleMessage, setOwner, addOwnerLID, removeSecondOwner, setBotName, getBotName };
