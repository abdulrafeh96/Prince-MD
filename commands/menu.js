// ============================================
//      Prince Md — COMMANDS/MENU.JS
//      .menu Command — Full Command List
// ============================================

'use strict';

const fs      = require('fs');
const path    = require('path');
const config  = require('../config/config');
const { toSmallCaps } = require('../utils/fonts');
const db            = require('../database/db'); 

const run = async (ctx) => {
  const { sock, msg, from, botNum, isGroup, react } = ctx;

  await react('⏳');

  // ─── Animation ────
  if (isGroup) {
    const { key } = await sock.sendMessage(from, { text: '✨ Prince Md ɪs sᴛᴀʀᴛɪɴɢ...' }, { quoted: msg });
    const frames = [
      { p: '25%',  b: '▰▱▱▱▱▱▱▱▱▱', s: '🔌 ᴄᴏɴɴᴇᴄᴛɪɴɢ...' },
      { p: '50%',  b: '▰▰▰▰▰▱▱▱▱▱', s: '📥 ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ ᴅᴀᴛᴀ...' },
      { p: '75%',  b: '▰▰▰▰▰▰▰▰▱▱', s: '⚙️ ᴘʀᴏᴄᴇssɪɴɢ...' },
      { p: '100%', b: '▰▰▰▰▰▰▰▰▰▰', s: '✅ ᴅᴏɴᴇ!' }
    ];

    for (const frame of frames) {
      let loadingText = `╭━━〔 ⌬ © 𓆩 Prince Md 𓆪 〕━━┈⊷\n┃✮│ ${frame.b} ${frame.p}\n┃✮│ ${frame.s}\n╰━━━━━━━━━━━━━━┈⊷`;
      await sock.sendMessage(from, { edit: key, text: loadingText });
      await new Promise(resolve => setTimeout(resolve, 250)); 
    }
  }

  const prefix = config.prefix;
  const time = new Date().toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi', hour12: true });
  const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const user = msg.pushName || 'User';
  const botMode = db.getBotMode(botNum.replace(/[^0-9]/g,''));

  const menuText =
`╭━━〔𓆩 Prince Md 𓆪〕━━┈⊷
┃✮╭────────────────
┃✮│ ʙᴏᴛ ɴᴀᴍᴇ : *Prince Md*
┃✮│ ᴜsᴇʀ : *${user}*
┃✮│ ᴅᴇᴠ : *ᴀʙᴅᴜʟ ʀᴀғᴇʜ*
┃✮│ ᴍᴏᴅᴇ : *${botMode === 'public' ? 'ᴘᴜʙʟɪᴄ' : 'ᴘʀɪᴠᴀᴛᴇ'}*
┃✮│ ᴘʀᴇғɪx : *[ ${prefix} ]*
┃✮│ ᴛɪᴍᴇ : *${time}*
┃✮│ ᴅᴀᴛᴇ : *${date}*
┃✮╰────────────────
╰━━━━━━━━━━━━━━━┈⊷
          ʜᴇʏ ${user}
  𓆩 Prince Md 𓆪 ᴀᴛ ʏᴏᴜʀ sᴇʀᴠɪᴄᴇ

*┏━━〔 💠 𝐌𝐀𝐈𝐍 〕*
┃ ❍ .${toSmallCaps('menu')}
┃ ❍ .${toSmallCaps('ping')}
┃ ❍ .${toSmallCaps('alive')}
┃ ❍ .${toSmallCaps('info')}
┃ ❍ .${toSmallCaps('uptime')}
┃ ❍ .${toSmallCaps('speed')}
┃ ❍ .${toSmallCaps('owner')}
┃ ❍ .${toSmallCaps('pair')}
┗━━━━━━━━━━━━┛

*┏━━〔 👥 𝐆𝐑𝐎𝐔𝐏 〕*
┃ ❍ .${toSmallCaps('kick')}
┃ ❍ .${toSmallCaps('add')}
┃ ❍ .${toSmallCaps('promote')}
┃ ❍ .${toSmallCaps('demote')}
┃ ❍ .${toSmallCaps('mute')}
┃ ❍ .${toSmallCaps('unmute')}
┃ ❍ .${toSmallCaps('tagall')}
┃ ❍ .${toSmallCaps('hidetag')}
┃ ❍ .${toSmallCaps('groupinfo')}
┃ ❍ .${toSmallCaps('setname')}
┃ ❍ .${toSmallCaps('setdesc')}
┃ ❍ .${toSmallCaps('setppgc')}
┃ ❍ .${toSmallCaps('linkgc')}
┃ ❍ .${toSmallCaps('revokegc')}
┃ ❍ .${toSmallCaps('antilink')}
┃ ❍ .${toSmallCaps('antisticker')}
┃ ❍ .${toSmallCaps('antigroup')}
┃ ❍ .${toSmallCaps('groupstatus')}
┃ ❍ .${toSmallCaps('warn')}
┃ ❍ .${toSmallCaps('resetwarn')}
┃ ❍ .${toSmallCaps('welcome')}
┃ ❍ .${toSmallCaps('bye')}
┃ ❍ .${toSmallCaps('lockchat')}
┃ ❍ .${toSmallCaps('unlockchat')}
┃ ❍ .${toSmallCaps('lockedusers')}
┗━━━━━━━━━━━━┛

*┏━━〔 🤖 𝐀𝐈 𝐓𝐎𝐎𝐋𝐒 〕*
┃ ❍ .${toSmallCaps('wormgpt')} / .${toSmallCaps('wgpt')}
┃ ❍ .${toSmallCaps('cursorai')} / .${toSmallCaps('cursor')}
┃ ❍ .${toSmallCaps('claude')}
┃ ❍ .${toSmallCaps('grok')}
┃ ❍ .${toSmallCaps('devin')}
┃ ❍ .${toSmallCaps('windsurf')}
┃ ❍ .${toSmallCaps('codex')}
┃ ❍ .${toSmallCaps('gpt5.4')}
┃ ❍ .${toSmallCaps('bolt')}
┃ ❍ .${toSmallCaps('kiro')}
┃ ❍ .${toSmallCaps('bbc')}
┃ ❍ .${toSmallCaps('chatbotdm')}
┃ ❍ .${toSmallCaps('chatbotgc')}
┃ ❍ .${toSmallCaps('chatgpt')} / .${toSmallCaps('gpt')}
┃ ❍ .${toSmallCaps('aiimage')} / .${toSmallCaps('aiimg')} / .${toSmallCaps('dalle')}
┗━━━━━━━━━━━━┛

*┏━━〔 📥 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃 〕*
┃ ❍ .${toSmallCaps('play')}
┃ ❍ .${toSmallCaps('video')}
┃ ❍ .${toSmallCaps('song')}
┃ ❍ .${toSmallCaps('gif')}
┃ ❍ .${toSmallCaps('tomp3')}
┃ ❍ .${toSmallCaps('ytmp3')}
┃ ❍ .${toSmallCaps('ytmp4')}
┃ ❍ .${toSmallCaps('tiktok')} (search, stalk & download)
┃ ❍ .${toSmallCaps('instagram')}
┃ ❍ .${toSmallCaps('facebook')}
┃ ❍ .${toSmallCaps('pinterest')}
┃ ❍ .${toSmallCaps('pin')}
┃ ❍ .${toSmallCaps('pindl')}
┃ ❍ .${toSmallCaps('pinterestdl')}
┗━━━━━━━━━━━━┛


*┏━━〔 📚 𝐄𝐃𝐔𝐂𝐀𝐓𝐈𝐎𝐍 〕*
┃ ❍ *${toSmallCaps('handouts')}* (No prefix needed)
┃ ❍ *${toSmallCaps('pastpapers')}* - ${toSmallCaps('cs101 midterm papers')} (No prefix needed)
┃ ❍ *${toSmallCaps('midterm')}* (No prefix needed)
┃ ❍ *${toSmallCaps('finalterm')}* (No prefix needed)
┗━━━━━━━━━━━━┛

*┏━━〔 ⚙️ 𝐔𝐓𝐈𝐋𝐈𝐓𝐘 〕*
┃ ❍ .${toSmallCaps('weather')}
┃ ❍ .${toSmallCaps('translate')}
┃ ❍ .${toSmallCaps('calc')}
┃ ❍ .${toSmallCaps('qr')}
┃ ❍ .${toSmallCaps('google')}
┃ ❍ .${toSmallCaps('web')}
┃ ❍ .${toSmallCaps('jid')}
┃ ❍ .${toSmallCaps('tts')}
┃ ❍ .${toSmallCaps('shorturl')}
┃ ❍ .${toSmallCaps('reverse')}
┃ ❍ .${toSmallCaps('fancy')}
┃ ❍ .${toSmallCaps('viewonce')}
┃ ❍ .${toSmallCaps('react')}
┃ ❍ .${toSmallCaps('totalchat')}
┃ ❍ .${toSmallCaps('wastalk')}
┃ ❍ .${toSmallCaps('getpp')}
┃ ❍ .${toSmallCaps('wastatus')}
┗━━━━━━━━━━━━┛

*┏━━〔 🔒 𝐒𝐄𝐂𝐔𝐑𝐈𝐓𝐘 & 𝐏𝐑𝐈𝐕𝐀𝐂𝐘 〕*
┃ ❍ .${toSmallCaps('numbertracker')}
┃ ❍ .${toSmallCaps('numtrack')}
┃ ❍ .${toSmallCaps('iptracker')}
┃ ❍ .${toSmallCaps('iptrack')}
┃ ❍ .${toSmallCaps('fakenumber')}
┃ ❍ .${toSmallCaps('fakenum')}
┃ ❍ .${toSmallCaps('checknumber')}
┃ ❍ .${toSmallCaps('checknum')}
┃ ❍ .${toSmallCaps('otp')}
┃ ❍ .${toSmallCaps('otpstatus')}
┗━━━━━━━━━━━━┛

*┏━━〔 ⚙️ 𝐎𝐖𝐍𝐄𝐑 〕*
┃ ❍ .${toSmallCaps('mode')}
┃ ❍ .${toSmallCaps('addowner')}
┃ ❍ .${toSmallCaps('removeowner')}
┃ ❍ .${toSmallCaps('antidelete')}
┃ ❍ .${toSmallCaps('broadcast')}
┃ ❍ .${toSmallCaps('restart')}
┃ ❍ .${toSmallCaps('delete')}
┃ ❍ .${toSmallCaps('getpp')}
┃ ❍ .${toSmallCaps('afk')}
┃ ❍ .${toSmallCaps('pnotify')}
┃ ❍ .${toSmallCaps('dnotify')}
┃ ❍ .${toSmallCaps('restrict')}
┃ ❍ .${toSmallCaps('unrestrict')}
┃ ❍ .${toSmallCaps('siminfo')}
┃ ❍ .${toSmallCaps('cnicinfo')}
┗━━━━━━━━━━━━┛

*┏━━〔 🎮 𝐅𝐔𝐍 & 𝐆𝐀𝐌𝐄𝐒 〕*
┃ ❍ .${toSmallCaps('joke')}
┃ ❍ .${toSmallCaps('quote')}
┃ ❍ .${toSmallCaps('fact')}
┃ ❍ .${toSmallCaps('8ball')}
┃ ❍ .${toSmallCaps('dare')}
┃ ❍ .${toSmallCaps('truth')}
┃ ❍ .${toSmallCaps('ship')}
┃ ❍ .${toSmallCaps('rate')}
┃ ❍ .${toSmallCaps('tic')}
┃ ❍ .${toSmallCaps('daughter')}
┃ ❍ .${toSmallCaps('wife')}
┃ ❍ .${toSmallCaps('hangman')}
┗━━━━━━━━━━━━┛

> ${toSmallCaps('powered by Prince Md')}`;

  const contextInfo = {
    forwardingScore: 999,
    isForwarded: true
  };

  const menuImagePath = path.resolve(config.assets.menuImage);
  const menuAudioPath = path.resolve(config.assets.menuAudio);

  if (fs.existsSync(menuImagePath)) {
    await sock.sendMessage(from, {
      image: fs.readFileSync(menuImagePath),
      caption: menuText,
      contextInfo: contextInfo
    }, { quoted: msg });
  } else {
    await sock.sendMessage(from, { 
      text: menuText,
      contextInfo: contextInfo
    }, { quoted: msg });
  }

  if (fs.existsSync(menuAudioPath)) {
    await sock.sendMessage(from, {
      audio: fs.readFileSync(menuAudioPath),
      mimetype: 'audio/mp4',
      ptt: false,
    }, { quoted: msg });
  }

  await react('✅');
};

module.exports = { run };