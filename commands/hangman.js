'use strict';

const { toSmallCaps } = require('../utils/fonts');
const games = new Map();

const words = ['whatsapp', 'eddy', 'coding', 'javascript', 'developer', 'telegram', 'python', 'internet', 'computer'];

const hangman = async (ctx) => {
  const { sock, from, msg, args, botNum } = ctx;
  if (!ctx.isGroup) return sock.sendMessage(from, { text: `❌ *${toSmallCaps('only for groups')}*` }, { quoted: msg });

  const action = args[0]?.toLowerCase();
  const gameKey = `${botNum}:${from}`;
  const sender = ctx.sender;

  if (action === 'start') {
    if (games.has(gameKey)) return sock.sendMessage(from, { text: `⚠️ *${toSmallCaps('game already running')}*` }, { quoted: msg });
    
    const word = words[Math.floor(Math.random() * words.length)];
    games.set(gameKey, {
      word: word,
      guessed: new Set(),
      lives: 6,
      players: [sender]
    });

    return sock.sendMessage(from, { 
      text: `🎮 *${toSmallCaps('hangman started!')}*\n\n*${toSmallCaps('word')}:* ${'_ '.repeat(word.length)}\n*${toSmallCaps('lives')}:* 6\n\n*${toSmallCaps('use .hangman guess [letter] to play')}*` 
    }, { quoted: msg });
  }

  if (action === 'guess') {
    const game = games.get(gameKey);
    if (!game) return sock.sendMessage(from, { text: `❌ *${toSmallCaps('no active game. type .hangman start')}*` }, { quoted: msg });

    const char = args[1]?.toLowerCase();
    if (!char || char.length !== 1) return sock.sendMessage(from, { text: `❌ *${toSmallCaps('guess a single letter')}*` }, { quoted: msg });
    if (game.guessed.has(char)) return sock.sendMessage(from, { text: `⚠️ *${toSmallCaps('already guessed')}*` }, { quoted: msg });

    game.guessed.add(char);
    if (!game.word.includes(char)) game.lives -= 1;

    let display = game.word.split('').map(c => game.guessed.has(c) ? c : '_').join(' ');
    
    if (game.lives <= 0) {
      sock.sendMessage(from, { text: `💀 *${toSmallCaps('game over! word was')}*: ${game.word}` }, { quoted: msg });
      return games.delete(gameKey);
    }

    if (!display.includes('_')) {
      sock.sendMessage(from, { text: `🎉 *${toSmallCaps('you won! word was')}*: ${game.word}` }, { quoted: msg });
      return games.delete(gameKey);
    }

    sock.sendMessage(from, { 
      text: `*${toSmallCaps('progress')}*: ${display}\n*${toSmallCaps('lives')}:* ${game.lives}\n*${toSmallCaps('guessed')}:* ${[...game.guessed].join(', ')}` 
    }, { quoted: msg });
  }

  if (action === 'end') {
    games.delete(gameKey);
    sock.sendMessage(from, { text: `⏹️ *${toSmallCaps('game stopped')}*` }, { quoted: msg });
  }
};

module.exports = { hangman };