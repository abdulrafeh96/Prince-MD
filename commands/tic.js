'use strict';

const { toSmallCaps } = require('../utils/fonts');
const games = new Map();

const tic = async (ctx) => {
  const { sock, from, msg, args, botNum } = ctx;
  if (!ctx.isGroup) {
    return sock.sendMessage(from, { text: `❌ *${toSmallCaps('this game is only for groups')}*` }, { quoted: msg });
  }

  const action = args[0]?.toLowerCase();
  const gameKey = `${botNum}:${from}`;
  const sender = ctx.sender;

  const getRealJid = async (jid) => {
    try {
      const meta = await sock.groupMetadata(from);
      const participant = meta.participants.find(p => p.id === jid || p.lid === jid);
      return participant ? participant.id : jid;
    } catch { return jid; }
  };

  const resetTimer = (game) => {
    if (game.timeout) clearTimeout(game.timeout);
    game.timeout = setTimeout(() => {
        if (games.has(gameKey)) {
            games.delete(gameKey);
            sock.sendMessage(from, { text: `⏹️ *${toSmallCaps('game ended due to inactivity')}*` }, { quoted: msg });
        }
    }, 60000); // 60 seconds
  };

  if (action === 'start') {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!mentioned) return sock.sendMessage(from, { text: `❌ *${toSmallCaps('mention a player to challenge')}!*` }, { quoted: msg });
    if (games.has(gameKey)) return sock.sendMessage(from, { text: `⚠️ *${toSmallCaps('a game is already running')}*` }, { quoted: msg });
    
    const p1 = await getRealJid(sender);
    const p2 = await getRealJid(mentioned);

    const game = {
      players: [p1, p2],
      board: Array(9).fill('⬜'),
      turn: Math.floor(Math.random() * 2),
      started: false,
      timeout: null
    };

    games.set(gameKey, game);
    return sock.sendMessage(from, {
      text: `🎮 *${toSmallCaps('tic tac toe invitation')}*\n\n@${p2.split('@')[0]}, *${toSmallCaps('you have been challenged by')}* @${p1.split('@')[0]}!\n\n*${toSmallCaps('reply with')}*:\n*1* 👉 *${toSmallCaps('to start')}*\n*2* 👉 *${toSmallCaps('to surrender')}*`,
      mentions: [p1, p2]
    }, { quoted: msg });
  }

  if ((action === '1' || action === '2') && games.has(gameKey)) {
    const game = games.get(gameKey);
    if (sender !== game.players[1]) return;

    if (action === '1') {
      game.started = true;
      resetTimer(game);
      const b = game.board;
      const boardStr = `\n┏━━━━━━┳━━━━━━┳━━━━━━┓\n┃  ${b[0]}   ┃  ${b[1]}   ┃  ${b[2]}   ┃\n┣━━━━━━╋━━━━━━╋━━━━━━┫\n┃  ${b[3]}   ┃  ${b[4]}   ┃  ${b[5]}   ┃\n┣━━━━━━╋━━━━━━╋━━━━━━┫\n┃  ${b[6]}   ┃  ${b[7]}   ┃  ${b[8]}   ┃\n┗━━━━━━┻━━━━━━┻━━━━━━┛`;
      return sock.sendMessage(from, {
        text: `✅ *${toSmallCaps('game started')}*${boardStr}\n\n*${toSmallCaps('next turn')}*: @${game.players[game.turn].split('@')[0]}\n⏱️ *${toSmallCaps('you have only one minute to play!')}*`,
        mentions: [game.players[game.turn]]
      }, { quoted: msg });
    } else {
      games.delete(gameKey);
      return sock.sendMessage(from, { text: `⏹️ *${toSmallCaps('game declined')}*` }, { quoted: msg });
    }
  }

  if (action === 'move') {
    const game = games.get(gameKey);
    if (!game || !game.started) return sock.sendMessage(from, { text: `❌ *${toSmallCaps('game not started yet')}*` }, { quoted: msg });
    if (game.players[game.turn] !== sender) return sock.sendMessage(from, { text: `⏳ *${toSmallCaps('it is not your turn')}*` }, { quoted: msg });

    const pos = parseInt(args[1]) - 1;
    if (isNaN(pos) || pos < 0 || pos > 8 || game.board[pos] !== '⬜') return sock.sendMessage(from, { text: `❌ *${toSmallCaps('invalid move')}*` }, { quoted: msg });

    game.board[pos] = game.turn === 0 ? '❌' : '⭕';
    const b = game.board;
    const boardStr = `\n┏━━━━━━┳━━━━━━┳━━━━━━┓\n┃  ${b[0]}   ┃  ${b[1]}   ┃  ${b[2]}   ┃\n┣━━━━━━╋━━━━━━╋━━━━━━┫\n┃  ${b[3]}   ┃  ${b[4]}   ┃  ${b[5]}   ┃\n┣━━━━━━╋━━━━━━╋━━━━━━┫\n┃  ${b[6]}   ┃  ${b[7]}   ┃  ${b[8]}   ┃\n┗━━━━━━┻━━━━━━┻━━━━━━┛`;

    const winPatterns = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    let winner = null;
    for (let p of winPatterns) {
      if (game.board[p[0]] !== '⬜' && game.board[p[0]] === game.board[p[1]] && game.board[p[0]] === game.board[p[2]]) winner = game.players[game.turn];
    }

    if (winner) {
      clearTimeout(game.timeout);
      await sock.sendMessage(from, { text: `🎉 *${toSmallCaps('winner is')}* @${winner.split('@')[0]}!${boardStr}`, mentions: [winner] }, { quoted: msg });
      return games.delete(gameKey);
    }

    if (!game.board.includes('⬜')) {
      clearTimeout(game.timeout);
      await sock.sendMessage(from, { text: `🤝 *${toSmallCaps('it is a draw')}*${boardStr}` }, { quoted: msg });
      return games.delete(gameKey);
    }

    game.turn = game.turn === 0 ? 1 : 0;
    resetTimer(game);
    const nextPlayer = game.players[game.turn];
    
    await sock.sendMessage(from, {
        text: `*${toSmallCaps('board')}*${boardStr}\n\n*${toSmallCaps('next turn')}*: @${nextPlayer.split('@')[0]}\n⏱️ *${toSmallCaps('you have only one minute to play!')}*`,
        mentions: [nextPlayer]
    }, { quoted: msg });
  }

  if (action === 'end') {
    const game = games.get(gameKey);
    if (!game) return sock.sendMessage(from, { text: `❌ *${toSmallCaps('no one is playing game right now')}*` }, { quoted: msg });
    if (sender !== game.players[0] && sender !== game.players[1]) return sock.sendMessage(from, { text: `❌ *${toSmallCaps('you are not in this game')}*` }, { quoted: msg });
    clearTimeout(game.timeout);
    games.delete(gameKey);
    sock.sendMessage(from, { text: `⏹️ *${toSmallCaps('game surrendered')}*` }, { quoted: msg });
  }

  if (!action || !['start', '1', '2', 'move', 'end'].includes(action)) {
    return sock.sendMessage(from, { text: `🎮 *${toSmallCaps('tic tac toe menu')}*

*${toSmallCaps('usage')}*:
1. *.tic start @user*
2. *.tic 1* (Accept)
3. *.tic 2* (Decline)
4. *.tic move [1-9]*
5. *.tic end*` }, { quoted: msg });
  }
};

module.exports = { tic };