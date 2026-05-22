'use strict';

const { askAi } = require('./aiProvider');

async function run() {
  const tests = [
    ['chatgpt', 'chatgpt'],
    ['gpt4', 'gpt4'],
    ['gpt', 'gpt'],
    ['claude', 'claudeai'],
    ['wormgpt', 'wormgpt'],
    ['grok', 'grok'],
  ];

  for (const [name, endpoint] of tests) {
    try {
      const reply = await askAi('Reply OK only', { endpoint });
      console.log(`${name}: OK - ${String(reply).slice(0, 80)}`);
    } catch (err) {
      console.log(`${name}: FAILED - ${err.message}`);
    }
  }
}

if (require.main === module) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { run };
