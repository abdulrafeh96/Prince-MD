// ============================================
//      Prince Md â€” COMMANDS/CHATBOT.JS
//      Chatbot System with Groq AI (LID Based)
// ============================================

'use strict';

const axios  = require('axios');
const path   = require('path');
const fs     = require('fs');
const db     = require('../database/db');
const { toSmallCaps } = require('../utils/fonts');
const { authMiddleware } = require('../middleware/auth');

// Bot names â€” whatsapp.js se set hoga
const botNames = new Map();
const setBotName = (botNum, name) => botNames.set(botNum.replace(/[^0-9]/g,''), name);
const getBotName = (botNum) => botNames.get(botNum.replace(/[^0-9]/g,'')) || 'Prince Md';

// Pending setup state
const pendingSetup = new Map();

// Chatbot config â€” naam aur topic store
const chatbotConfig = new Map();

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_URL     = 'https://api.groq.com/openai/v1/chat/completions';

const getSystemPrompt = (botName, topic) =>
`Tumhara naam "${botName}" hai.

Tumhari zabaan sirf Roman Urdu hai. Matlab:
- Har jawab Roman Urdu haroof mein likho jaise "Aap ka swagat hai", "Kya haal hai", "Bilkul sahi kaha"
- Hindi script (Devanagari) bilkul istemal mat karo
- Pure English mein jawab mat do â€” agar English word zaroor ho toh Roman Urdu mein likhte waqt shamil kar sakte ho
- Insanon ki tarah qudrati aur friendly andaaz mein baat karo

Busy Logic:
- Agar user message mein "busy" ka zikr ho, toh hamesha ye jawab do: "I am currently busy, will respond in 3 to 4 hours. Please wait."

Jab baat shuru ho toh hamesha "Assalamualaikum" se shuru karo.

Tumhara kaam sirf is topic ke baare mein baat karna hai: "${topic}"

Agar koi is topic se alag baat kare toh inka jawab yeh do:
"Assalamualaikum! Maafi chahta hoon, main sirf '${topic}' ke baare mein aapki madad kar sakta hoon. Koi aur sawaal ho is topic se mutalliq toh zaroor poochein!"

Kabhi mat kaho ke tum bot ho â€” hamesha insaan ki tarah baat karo.
Kabhi bhi doosre mazhab ke alfaz istemal mat karo.

Jab koi developer ya contact pooche toh sirf yeh do:
${toSmallCaps('developer name')}: Abdul Rafeh
${toSmallCaps('contact')}: +923051056536
${toSmallCaps('channel')}: https://whatsapp.com/channel/0029Vb6sfZ6LikgCe1as3o21`;

const groqReply = async (userMessage, botName, topic) => {
  // Busy keyword check - Highest Priority
  if (userMessage.toLowerCase().includes('busy')) {
    return "I am currently busy, will respond in 3 to 4 hours. Please wait.";
  }

  const systemPrompt = getSystemPrompt(botName, topic);

  try {
    const res = await axios.post(GROQ_URL, {
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  }
      ],
      max_tokens: 200,
      temperature: 0.7,
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type':  'application/json',
      },
      timeout: 15000,
    });
    const reply = res.data?.choices?.[0]?.message?.content?.trim();
    if (reply) return reply;
  } catch (e) {
    console.log('[CHATBOT] Model 1 failed:', e.message);
  }

  try {
    const res = await axios.post(GROQ_URL, {
      model: 'gemma2-9b-it',
      messages: [
        { role: 'user', content: systemPrompt + '\n\nUser: ' + userMessage }
      ],
      max_tokens: 200,
      temperature: 0.7,
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type':  'application/json',
      },
      timeout: 15000,
    });
    const reply = res.data?.choices?.[0]?.message?.content?.trim();
    if (reply) return reply;
  } catch (e) {
    console.log('[CHATBOT] Model 2 failed:', e.message);
  }

  const fallbacks = [
    `Assalamualaikum! Yaar abhi thoda busy hoon, thodi der baad baat karte hain!`,
    `Assalamualaikum! Hmm, samajh nahi aaya â€” dobara likho!`,
    `Assalamualaikum! Abhi thoda masla hai connection ka, baad mein batata hoon.`,
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
};

// â”€â”€â”€ .chatbotgc on/off â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const chatbotgroup = async (ctx) => {
  const { botNum, react } = ctx;
  const auth = authMiddleware(ctx);
  if (!await auth.requireOwner()) return;

  const cleanBot = botNum.replace(/[^0-9]/g, '');
  const val = ctx.args[0]?.toLowerCase();

  if (!val || !['on','off'].includes(val)) {
    const current = db.getBotChatbot(cleanBot, 'group');
    return ctx.reply(`ðŸ¤– *${toSmallCaps('group chatbot')}:* ${current ? 'âœ… ON' : 'âŒ OFF'}\n${toSmallCaps('use')}: \`.chatbotgc on/off\``);
  }

  if (val === 'off') {
    db.setBotChatbot(cleanBot, 'group', false);
    pendingSetup.delete(`${cleanBot}_group`);
    await ctx.reply(`âŒ *${toSmallCaps('group chatbot off!')}*`);
    await react('âœ…');
    return;
  }

  // ON kiya â€” pehle naam poochna hai
  pendingSetup.set(`${cleanBot}_group`, { step: 'name', name: '', topic: '', from: ctx.from });
  await ctx.reply(`ðŸ¤– *${toSmallCaps('group chatbot setup')}*\n\nPlease enter the *name* you want to give this chatbot:`);
  await react('âœ…');
};

// â”€â”€â”€ .chatbotdm on/off â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const chatbotdm = async (ctx) => {
  const { botNum, react } = ctx;
  const auth = authMiddleware(ctx);
  if (!await auth.requireOwner()) return;

  const cleanBot = botNum.replace(/[^0-9]/g, '');
  const val = ctx.args[0]?.toLowerCase();

  if (!val || !['on','off'].includes(val)) {
    const current = db.getBotChatbot(cleanBot, 'dm');
    return ctx.reply(`ðŸ¤– *${toSmallCaps('dm chatbot')}:* ${current ? 'âœ… ON' : 'âŒ OFF'}\n${toSmallCaps('use')}: \`.chatbotdm on/off\``);
  }

  if (val === 'off') {
    db.setBotChatbot(cleanBot, 'dm', false);
    pendingSetup.delete(`${cleanBot}_dm`);
    await ctx.reply(`âŒ *${toSmallCaps('dm chatbot off!')}*`);
    await react('âœ…');
    return;
  }

  // ON kiya â€” pehle naam poochna hai
  pendingSetup.set(`${cleanBot}_dm`, { step: 'name', name: '', topic: '', from: ctx.from });
  await ctx.reply(`ðŸ¤– *${toSmallCaps('dm chatbot setup')}*\n\nPlease enter the *name* you want to give this chatbot:`);
  await react('âœ…');
};

// â”€â”€â”€ Setup flow handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const handleSetupFlow = async (sock, msg, from, sender, body, cleanBot, type, isOwner) => {
  const key = `${cleanBot}_${type}`;
  const setup = pendingSetup.get(key);
  if (!setup) return false;

  // Sirf owner ka message accept karo â€” baaki sab ke liye khamosh raho
  if (!isOwner) return true;

  if (setup.step === 'name') {
    setup.name = body.trim();
    setup.step = 'topic';
    pendingSetup.set(key, setup);
    await sock.sendMessage(from, {
      text: `âœ… *Name set:* ${setup.name}\n\nNow please enter the *topic* â€” what should this chatbot talk about?\n_(e.g. "Mobile phones", "Cooking recipes", "Islamic knowledge")_`
    }, { quoted: msg });
    return true;
  }

  if (setup.step === 'topic') {
    setup.topic = body.trim();
    chatbotConfig.set(key, { name: setup.name, topic: setup.topic });
    pendingSetup.delete(key);
    db.setBotChatbot(cleanBot, type, true);
    await sock.sendMessage(from, {
      text: `âœ… *${toSmallCaps('chatbot activated!')}*\n\nðŸ¤– *Name:* ${setup.name}\nðŸ“Œ *Topic:* ${setup.topic}\n\nChatbot is now ON and will only reply about this topic.`
    }, { quoted: msg });
    return true;
  }

  return false;
};

// â”€â”€â”€ Main handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const handleChatbot = async (sock, msg, from, sender, body, botNum, isGroup, isOwner) => {
  if (!body || !body.trim()) return;
  if (body.startsWith('.')) return;

  const cleanBot = botNum.replace(/[^0-9]/g, '');
  const type     = isGroup ? 'group' : 'dm';
  const key      = `${cleanBot}_${type}`;

  // Setup flow check â€” agar pending setup hai toh pehle woh complete karo
  if (pendingSetup.has(key)) {
    const handled = await handleSetupFlow(sock, msg, from, sender, body, cleanBot, type, isOwner);
    if (handled) return;
  }

  const getLid = (jid) => (jid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

  const botRawId = sock.user?.id || botNum;
  const botLid   = getLid(botRawId);
  const botPhone = cleanBot;

  // creds.json se LID bhi lo
  let botCredsLid = '';
  try {
    const folders = [
      path.join(process.cwd(), 'sessions', 'session_' + botPhone),
      path.join(process.cwd(), 'sessions', botPhone),
    ];
    for (const folder of folders) {
      const credsPath = path.join(folder, 'creds.json');
      if (fs.existsSync(credsPath)) {
        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
        botCredsLid = (creds?.me?.lid || '').split(':')[0].replace(/[^0-9]/g, '');
        break;
      }
    }
  } catch (e) {}

  const botIds = new Set([botLid, botPhone, botCredsLid].filter(Boolean));

  // Config lo â€” naam aur topic (Setup flow se aaye hue data ko priority do)
  const config  = chatbotConfig.get(key) || { name: getBotName(cleanBot), topic: 'General' };
  const botName = config.name;
  const topic   = config.topic;

  if (isGroup) {
    if (!db.getBotChatbot(cleanBot, 'group')) return;

    // Bot khud na reply kare
    const senderLid = getLid(sender);
    if ([...botIds].some(id => senderLid === id || senderLid.includes(id))) return;

    const ctxInfo           = msg.message?.extendedTextMessage?.contextInfo || {};
    const mentioned         = ctxInfo?.mentionedJid || [];
    const quotedParticipant = getLid(ctxInfo?.participant || '');
    const quotedSenderJid   = ctxInfo?.participant || '';

    // Tag check
    const isTagged = mentioned.some(j => {
      const jLid = getLid(j);
      return [...botIds].some(id => jLid === id || j.includes(id));
    });

    // Reply check
    const isReply = [...botIds].some(id =>
      quotedParticipant === id ||
      quotedParticipant.includes(id) ||
      quotedSenderJid.includes(id)
    );

    // Text mein mention
    const isMentionedInText = [...botIds].some(id =>
      body.includes(id) || body.includes('@' + id)
    );

    if (!isTagged && !isReply && !isMentionedInText) return;

    try {
      await sock.sendPresenceUpdate('composing', from);
      await new Promise(r => setTimeout(r, 4000));
      const reply = await groqReply(body, botName, topic);
      await sock.sendPresenceUpdate('paused', from);
      await sock.sendMessage(from, { text: reply }, { quoted: msg });
    } catch (e) {
      console.log('[CHATBOT ERROR]', e.message);
    }

  } else {
    if (msg.key.fromMe) return;
    if (!db.getBotChatbot(cleanBot, 'dm')) return;
    if (from.endsWith('@broadcast')) return;

    const senderLid = getLid(sender);
    if ([...botIds].some(id => senderLid === id)) return;

    try {
      await sock.sendPresenceUpdate('composing', from);
      await new Promise(r => setTimeout(r, 4000));
      const reply = await groqReply(body, botName, topic);
      await sock.sendPresenceUpdate('paused', from);
      await sock.sendMessage(from, { text: reply }, { quoted: msg });
    } catch (e) {
      console.log('[CHATBOT ERROR]', e.message);
    }
  }
};

module.exports = { chatbotgc: chatbotgroup, chatbotdm, handleChatbot, setBotName };
