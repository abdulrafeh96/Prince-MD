// ============================================
//      Prince Md — COMMANDS/FUN.JS
//      Fun Commands
// ============================================

'use strict';

const axios  = require('axios');
const { toSmallCaps } = require('../utils/fonts');
const { randomItem, randomInt, getMentions, jidToNumber } = require('../utils/helpers');
const logger = require('../utils/logger');

// ─── .joke ────────────────────────────────────
const joke = async (ctx) => {
  const { react } = ctx;
  await react('😂');
  try {
    const res  = await axios.get('https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,racist,sexist&type=twopart', { timeout: 8000 });
    const data = res.data;
    const text = data.type === 'twopart'
      ? `😂 *Joke Time!*\n\n❓ ${data.setup}\n\n💡 ${data.delivery}`
      : `😂 *Joke Time!*\n\n${data.joke}`;
    await ctx.reply(text);
    await react('😂');
  } catch {
    const jokes = [
      'Why do programmers prefer dark mode?\nBecause light attracts bugs! 🐛',
      'Why did the bot go to school?\nTo improve its "neural" network! 🤖',
      'I told my computer I needed a break...\nNow it won\'t stop sending me Kit-Kat ads! 😂',
    ];
    await ctx.reply(`😂 *Joke Time!*\n\n${randomItem(jokes)}`);
    await react('😂');
  }
};

// ─── .quote ───────────────────────────────────
const quote = async (ctx) => {
  const { react } = ctx;
  await react('💬');
  try {
    const res  = await axios.get('https://api.quotable.io/random', { timeout: 8000 });
    const data = res.data;
    await ctx.reply(`💬 *Quote of the Day*\n\n_"${data.content}"_\n\n— *${data.author}*`);
    await react('✅');
  } catch {
    const quotes = [
      { text: 'The best way to predict the future is to invent it.', author: 'Alan Kay' },
      { text: 'Code is like humor. When you have to explain it, it\'s bad.', author: 'Cory House' },
      { text: 'First, solve the problem. Then, write the code.', author: 'John Johnson' },
    ];
    const q = randomItem(quotes);
    await ctx.reply(`💬 *Quote of the Day*\n\n_"${q.text}"_\n\n— *${q.author}*`);
    await react('✅');
  }
};

// ─── .fact ────────────────────────────────────
const fact = async (ctx) => {
  const { react } = ctx;
  await react('🧠');
  try {
    const res  = await axios.get('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en', { timeout: 8000 });
    await ctx.reply(`🧠 *Random Fact!*\n\n${res.data.text}`);
    await react('✅');
  } catch {
    const facts = [
      'A group of flamingos is called a "flamboyance".',
      'Honey never spoils. Archaeologists found 3000-year-old honey in Egyptian tombs.',
      'The first computer bug was an actual real bug — a moth found in a relay.',
    ];
    await ctx.reply(`🧠 *Random Fact!*\n\n${randomItem(facts)}`);
    await react('✅');
  }
};

// ─── .8ball ───────────────────────────────────
const eightball = async (ctx) => {
  const { args, react } = ctx;
  await react('🎱');

  const question = args.join(' ');
  if (!question) return ctx.reply('❌ *Ask a question!*\nUsage: `.8ball Will I be rich?`');

  const responses = [
    '✅ It is certain.',
    '✅ It is decidedly so.',
    '✅ Without a doubt.',
    '✅ Yes definitely.',
    '✅ You may rely on it.',
    '🟡 Reply hazy, try again.',
    '🟡 Ask again later.',
    '🟡 Better not tell you now.',
    '🟡 Cannot predict now.',
    '❌ Don\'t count on it.',
    '❌ My reply is no.',
    '❌ My sources say no.',
    '❌ Outlook not so good.',
    '❌ Very doubtful.',
  ];

  await ctx.reply(`🎱 *Magic 8 Ball*\n\n❓ *Q:* ${question}\n\n💬 *A:* ${randomItem(responses)}`);
  await react('🎱');
};

// ─── .dare ────────────────────────────────────
const dare = async (ctx) => {
  const { react } = ctx;
  await react('😈');

  const dares = [
    'Send a voice note saying "I am the best!" 3 times.',
    'Tag 3 people and tell them they are amazing!',
    'Change your status to "I love bots" for 10 minutes.',
    'Send your most embarrassing selfie in the chat.',
    'Type a paragraph with your eyes closed.',
    'Speak only in emojis for the next 5 messages.',
    'Tell a joke — if no one laughs, do another dare.',
    'Send a GIF that describes your personality.',
  ];

  await ctx.reply(`😈 *DARE!*\n\n${randomItem(dares)}`);
  await react('😈');
};

// ─── .truth ───────────────────────────────────
const truth = async (ctx) => {
  const { react } = ctx;
  await react('🤔');

  const truths = [
    'What is the most embarrassing thing you have ever done?',
    'What is your biggest fear in life?',
    'Have you ever lied to your best friend? What about?',
    'What is the worst thing you have ever said to someone?',
    'What is your biggest secret that you never told anyone?',
    'Who do you have a crush on right now?',
    'What is the most childish thing you still do?',
    'Have you ever pretended to be sick to avoid something?',
  ];

  await ctx.reply(`🤔 *TRUTH!*\n\n${randomItem(truths)}`);
  await react('🤔');
};

// ─── .ship ────────────────────────────────────
const ship = async (ctx) => {
  const { sock, from, msg, args, react } = ctx;
  await react('💕');

  try {
    const meta = await sock.groupMetadata(from);
    const members = meta.participants.map(p => p.id);
    const sender = msg.key.participant || msg.key.remoteJid;
    
    const person1 = sender;
    const person2 = randomItem(members.filter(m => m !== sender));

    const percentage = randomInt(1, 100);
    const hearts = percentage >= 80 ? '💖💖💖' : percentage >= 60 ? '💕💕' : percentage >= 40 ? '❤️' : '💔';

    const text = `💕 *${toSmallCaps('match found')}*\n\n@${person1.split('@')[0]} + @${person2.split('@')[0]}\n\n${'█'.repeat(Math.floor(percentage / 10))}${'░'.repeat(10 - Math.floor(percentage / 10))} ${percentage}%\n\n${hearts} *Compatibility: ${percentage}%*`;

    await sock.sendMessage(from, { text, mentions: [person1, person2] }, { quoted: msg });
    await react('💕');
  } catch { await react('❌'); }
};

// ─── .rate ────────────────────────────────────
const rate = async (ctx) => {
  const { msg, args, react, sock, from } = ctx;
  await react('⭐');

  const mentions = getMentions(msg.message);
  const tagged = mentions.length > 0 ? `@${mentions[0].split('@')[0]}` : '';
  const extraText = args.filter(a => !a.includes('@')).join(' ');
  const thing = tagged ? `${tagged} ${extraText}` : args.join(' ');
  
  if (!thing) return ctx.reply('❌ *Provide something or someone to rate!*');

  const rating = randomInt(1, 10);
  const stars  = '⭐'.repeat(rating) + '☆'.repeat(10 - rating);

  await sock.sendMessage(from, {
    text: `⭐ *Rating: ${thing}*\n\n${stars}\n\n*Score: ${rating}/10*`,
    mentions: mentions
  }, { quoted: msg });
  await react('⭐');
};

// ─── .son (Random Member Picker) ──────────────
const son = async (ctx) => {
  const { sock, from, msg } = ctx;
  try {
    const meta = await sock.groupMetadata(from);
    const members = meta.participants.map(p => p.id);
    const winner = randomItem(members);
    await sock.sendMessage(from, {
      text: `👦 *${toSmallCaps('son found')}!* 👦\n@${winner.split('@')[0]} ${toSmallCaps('is your son')}!\n🧒 *${toSmallCaps('take care of your child')}!*`,
      mentions: [winner]
    }, { quoted: msg });
  } catch {}
};

module.exports = { joke, quote, fact, eightball, dare, truth, ship, rate, son };