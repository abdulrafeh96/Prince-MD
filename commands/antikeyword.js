'use strict';

const db = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

module.exports = {
  antikeyword: async (ctx) => {
    const { args, from, botNum, reply } = ctx;
    const auth = authMiddleware(ctx);
    if (!await auth.requireGroup()) return;
    if (!await auth.requireAdmin()) return;

    const action = args[0]?.toLowerCase();
    const keyword = args.slice(1).join(' ').trim();

    if (action === 'add' && keyword) {
      db.addAntiKeyword(from, keyword, botNum);
      return reply(`┏━━〔 *Anti-Word Added* 〕━━┓

*Word:* ${keyword}
Hun eh lafz group ch allowed nahi, paaji.

┗━━━━━━━━━━━━━━┛`);
    }

    if (action === 'remove' && keyword) {
      db.removeAntiKeyword(from, keyword, botNum);
      return reply(`┏━━〔 *Anti-Word Removed* 〕━━┓

*Word:* ${keyword}
Eh lafz hun blacklist ton nikal gaya.

┗━━━━━━━━━━━━━━┛`);
    }

    if (action === 'list') {
      const list = db.getAntiKeywords(from, botNum);
      return reply(`┏━━〔 *Anti-Words List* 〕━━┓

${list.length > 0 ? list.map((word, index) => `${index + 1}. ${word}`).join('\n') : 'No words set.'}

┗━━━━━━━━━━━━━━┛`);
    }

    return reply(`┏━━〔 *Anti-Word Usage* 〕━━┓

.antiword add [word]
.antiword remove [word]
.antiword list

Alias: .antikeyword
┗━━━━━━━━━━━━━━┛`);
  },
};
