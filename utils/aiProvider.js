'use strict';

const axios = require('axios');

function extractText(data) {
  return (
    data?.choices?.[0]?.message?.content ||
    data?.result ||
    data?.answer ||
    data?.text ||
    data?.response ||
    data?.reply ||
    data?.message ||
    (typeof data === 'string' ? data : '')
  )?.toString().trim();
}

async function askApiKeith(prompt, endpoint = 'chatgpt') {
  const finalPrompt = systemJoin(prompt);
  const res = await axios.get(`https://apiskeith.top/ai/${endpoint}`, {
    params: { q: finalPrompt },
    timeout: 30000,
  });
  if (res.data?.status === false) {
    throw new Error(res.data?.error || `${endpoint} returned status false`);
  }
  return extractText(res.data);
}

function systemJoin(prompt, systemPrompt = '') {
  return systemPrompt
    ? `${systemPrompt}\n\nUser: ${prompt}`
    : prompt;
}

function endpointFallbacks(endpoint) {
  const normalized = String(endpoint || '').toLowerCase();
  const map = {
    chatgpt: ['gpt4', 'gpt', 'claudeai', 'wormgpt'],
    gpt: ['gpt', 'gpt4', 'claudeai', 'wormgpt'],
    grok: ['grok', 'gpt4', 'gpt', 'claudeai'],
    claudeai: ['claudeai', 'gpt4', 'gpt'],
    claude: ['claudeai', 'gpt4', 'gpt'],
    cursorai: ['gpt4', 'gpt', 'wormgpt'],
    gpt54: ['gpt4', 'gpt', 'claudeai'],
    devin: ['gpt4', 'gpt', 'claudeai'],
    windsurf: ['gpt4', 'gpt', 'claudeai'],
    codex: ['gpt4', 'gpt', 'claudeai'],
    bolt: ['gpt4', 'gpt', 'claudeai'],
    kiro: ['gpt4', 'gpt', 'claudeai'],
  };
  return map[normalized] || [normalized, 'gpt4', 'gpt', 'claudeai', 'wormgpt'].filter(Boolean);
}

async function askAi(prompt, options = {}) {
  const {
    systemPrompt = '',
    endpoint = 'chatgpt',
  } = options;

  const attempts = [];
  for (const ep of endpointFallbacks(endpoint)) {
    attempts.push(() => askApiKeith(systemJoin(prompt, systemPrompt), ep));
  }

  let lastError;
  for (const attempt of attempts) {
    try {
      const reply = await attempt();
      if (reply) return reply;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('No AI response');
}

module.exports = { askAi, askApiKeith };
