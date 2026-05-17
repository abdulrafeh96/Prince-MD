// ============================================
//      Prince Md — UTILS/PINTERESTTEST.JS
//      Pinterest Downloader Test
// ============================================

'use strict';

const axios = require('axios');

// Test Pinterest URL validation
const testPinterestUrlValidation = () => {
  console.log('🧪 Testing Pinterest URL Validation...\n');

  const testUrls = [
    { url: 'https://pinterest.com/pin/123456789', valid: true },
    { url: 'https://www.pinterest.com/pin/123456789', valid: true },
    { url: 'https://pin.it/abc123', valid: true },
    { url: 'https://youtube.com/watch?v=123', valid: false },
    { url: 'https://instagram.com/p/abc123', valid: false },
    { url: 'not-a-url', valid: false }
  ];

  testUrls.forEach(({ url, valid }) => {
    const isValid = url.includes('pinterest.com') || url.includes('pin.it');
    const status = isValid === valid ? '✅' : '❌';
    console.log(`${status} ${url} - Expected: ${valid}, Got: ${isValid}`);
  });
};

// Test Pinterest API endpoints
const testPinterestApis = async () => {
  console.log('\n🌐 Testing Pinterest API Endpoints...\n');

  const testUrl = 'https://pinterest.com/pin/123456789';
  const apis = [
    {
      name: 'Pinterest Downloader API',
      url: 'https://api.pinterestdownloader.com/api/download',
      method: 'POST'
    },
    {
      name: 'Pinterest Downloader Vercel',
      url: 'https://pinterest-downloader-api.vercel.app/api/download',
      method: 'POST'
    },
    {
      name: 'Pinterest Scraper API',
      url: 'https://pinterest-scraper-api.onrender.com/api/v1/download',
      method: 'POST'
    }
  ];

  for (const api of apis) {
    try {
      console.log(`🔍 Testing ${api.name}...`);
      
      const response = await axios.post(api.url, { url: testUrl }, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });

      console.log(`✅ ${api.name} - Status: ${response.status}`);
      console.log(`📄 Response: ${JSON.stringify(response.data, null, 2).substring(0, 200)}...\n`);
      
    } catch (error) {
      console.log(`❌ ${api.name} - Error: ${error.message}\n`);
    }
  }
};

// Test HTML parsing fallback
const testHtmlParsing = () => {
  console.log('📄 Testing HTML Parsing Fallback...\n');

  const mockHtml = `
    <html>
      <head><title>Test Pin</title></head>
      <body>
        <script data-test="video">var video_url = "https://v1.pinimg.com/videos/example.mp4";</script>
        <script>var title = "Amazing Video Pin";</script>
        <img src="https://i.pinimg.com/originals/example.jpg" />
      </body>
    </html>
  `;

  // Test video extraction
  const videoMatch = mockHtml.match(/"video_url":"([^"]+)"/);
  const hasVideo = videoMatch && videoMatch[1];
  console.log(`${hasVideo ? '✅' : '❌'} Video extraction: ${hasVideo ? 'Found' : 'Not found'}`);

  // Test image extraction
  const imageMatch = mockHtml.match(/"url":"([^"]+\.(jpg|jpeg|png))"/);
  const hasImage = imageMatch && imageMatch[1];
  console.log(`${hasImage ? '✅' : '❌'} Image extraction: ${hasImage ? 'Found' : 'Not found'}`);

  // Test title extraction
  const titleMatch = mockHtml.match(/"title":"([^"]+)"/);
  const hasTitle = titleMatch && titleMatch[1];
  console.log(`${hasTitle ? '✅' : '❌'} Title extraction: ${hasTitle ? 'Found' : 'Not found'}`);
};

// Test media type detection
const testMediaTypeDetection = () => {
  console.log('\n🎥 Testing Media Type Detection...\n');

  const testCases = [
    { url: 'https://example.com/video.mp4', expected: 'video' },
    { url: 'https://example.com/image.jpg', expected: 'image' },
    { url: 'https://example.com/photo.png', expected: 'image' },
    { url: 'https://example.com/clip.mp4', expected: 'video' },
    { url: 'https://example.com/file.gif', expected: 'image' }
  ];

  testCases.forEach(({ url, expected }) => {
    const isVideo = url.includes('.mp4');
    const detected = isVideo ? 'video' : 'image';
    const status = detected === expected ? '✅' : '❌';
    console.log(`${status} ${url} - Expected: ${expected}, Got: ${detected}`);
  });
};

// Run all tests
const runAllTests = async () => {
  console.log('🚀 Starting Pinterest Downloader Tests...\n');
  
  testPinterestUrlValidation();
  await testPinterestApis();
  testHtmlParsing();
  testMediaTypeDetection();
  
  console.log('\n🎉 Pinterest Downloader Tests Completed!');
  console.log('\n📝 Usage Instructions:');
  console.log('  .pinterest https://pinterest.com/pin/123456789');
  console.log('  .pin https://pin.it/abc123');
  console.log('\n✨ Features:');
  console.log('  • Downloads both images and videos');
  console.log('  • Multiple API fallbacks');
  console.log('  • HTML parsing fallback');
  console.log('  • Automatic media type detection');
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, testPinterestUrlValidation, testPinterestApis };
