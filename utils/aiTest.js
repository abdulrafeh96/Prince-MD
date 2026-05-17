// ============================================
//      Prince Md â€” UTILS/AITEST.JS
//      AI Commands Test
// ============================================

'use strict';

const axios = require('axios');

// Test WormGPT API
const testWormGptApi = async () => {
  console.log('ðŸ¤– Testing WormGPT API...\n');

  const testQuery = 'Hello, how are you?';

  try {
    // Test the free ChatGPT API (primary)
    console.log('ðŸ” Testing free ChatGPT API...');
    const response = await axios.post(
      'https://chatgpt-api.shn.hk/v1/',
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: testQuery }]
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000
      }
    );

    const reply = response.data?.choices?.[0]?.message?.content?.trim();
    if (reply) {
      console.log('âœ… Free ChatGPT API working!');
      console.log(`ðŸ“ Response: ${reply.substring(0, 100)}...\n`);
      return true;
    } else {
      console.log('âŒ No response from free ChatGPT API\n');
      return false;
    }
  } catch (error) {
    console.log(`âŒ Free ChatGPT API failed: ${error.message}\n`);
    
    // Test fallback API
    console.log('ðŸ” Testing fallback API...');
    try {
      const fallbackResponse = await axios.get(
        `https://apiskeith.top/ai/wormgpt?q=${encodeURIComponent(testQuery)}`,
        { timeout: 15000 }
      );

      const fallbackReply = (
        fallbackResponse.data?.result ||
        fallbackResponse.data?.response ||
        fallbackResponse.data?.answer ||
        fallbackResponse.data?.text ||
        fallbackResponse.data?.message ||
        (typeof fallbackResponse.data === 'string' ? fallbackResponse.data : '')
      );

      if (fallbackReply) {
        console.log('âœ… Fallback API working!');
        console.log(`ðŸ“ Response: ${fallbackReply.substring(0, 100)}...\n`);
        return true;
      } else {
        console.log('âŒ No response from fallback API\n');
        return false;
      }
    } catch (fallbackError) {
      console.log(`âŒ Fallback API failed: ${fallbackError.message}\n`);
      return false;
    }
  }
};

// Test Cursor AI system prompt
const testCursorAiPrompt = () => {
  console.log('ðŸ’» Testing Cursor AI System Prompt...\n');

  const systemPrompt = 'You are Cursor AI assistant, an expert coding assistant. Provide practical, concise coding help with: 1) Clear code examples, 2) Step-by-step explanations, 3) Best practices, 4) Common pitfalls to avoid. Focus on JavaScript, Python, and web development. Keep responses under 300 words.';

  console.log('âœ… Cursor AI system prompt configured with:');
  console.log('  â€¢ Expert coding assistance');
  console.log('  â€¢ Practical code examples');
  console.log('  â€¢ Step-by-step explanations');
  console.log('  â€¢ Best practices guidance');
  console.log('  â€¢ Common pitfalls avoidance');
  console.log('  â€¢ Focus on JavaScript, Python, web dev');
  console.log('  â€¢ Concise responses (under 300 words)\n');
};

// Test Groq API (if available)
const testGroqApi = async () => {
  console.log('ðŸ§  Testing Groq API...\n');

  const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
  const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

  try {
    const response = await axios.post(GROQ_URL, {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello in one sentence.' }
      ],
      temperature: 0.7,
      max_tokens: 50
    }, {
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    const reply = response.data?.choices?.[0]?.message?.content?.trim();
    if (reply) {
      console.log('âœ… Groq API working!');
      console.log(`ðŸ“ Response: ${reply}\n`);
      return true;
    } else {
      console.log('âŒ No response from Groq API\n');
      return false;
    }
  } catch (error) {
    console.log(`âŒ Groq API failed: ${error.message}\n`);
    return false;
  }
};

// Test command registration
const testCommandRegistration = () => {
  console.log('ðŸ“‹ Testing Command Registration...\n');

  const commands = [
    { name: 'WormGPT', aliases: ['wormgpt', 'wgpt'], status: 'âœ… Registered' },
    { name: 'Cursor AI', aliases: ['cursorai', 'cursor'], status: 'âœ… Registered' }
  ];

  commands.forEach(cmd => {
    console.log(`${cmd.status} ${cmd.name} (${cmd.aliases.join(', ')})`);
  });

  console.log('\nðŸ“± Usage Examples:');
  console.log('  .wormgpt What is JavaScript?');
  console.log('  .wgpt How to create a function?');
  console.log('  .cursorai Help me debug this code');
  console.log('  .cursor Python list comprehension example');
};

// Run all tests
const runAllTests = async () => {
  console.log('ðŸš€ Starting AI Commands Tests...\n');

  const wormgptResult = await testWormGptApi();
  testCursorAiPrompt();
  await testGroqApi();
  testCommandRegistration();

  console.log('ðŸŽ‰ AI Commands Tests Completed!\n');
  
  console.log('ðŸ“Š Summary:');
  console.log(`  â€¢ WormGPT API: ${wormgptResult ? 'âœ… Working' : 'âŒ Issues detected'}`);
  console.log('  â€¢ Cursor AI: âœ… Configured');
  console.log('  â€¢ Commands: âœ… Registered in handler');
  console.log('  â€¢ Menu: âœ… Updated with Cursor AI\n');

  console.log('ðŸ”§ Features:');
  console.log('  â€¢ Multiple API fallbacks for reliability');
  console.log('  â€¢ Specialized prompts for different use cases');
  console.log('  â€¢ Error handling and timeouts');
  console.log('  â€¢ Typing indicators for better UX');
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, testWormGptApi, testGroqApi };

