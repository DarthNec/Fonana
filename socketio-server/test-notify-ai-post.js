#!/usr/bin/env node

/**
 * Тестовый скрипт для проверки POST /notify-ai-post/ эндпоинта
 * 
 * Использование:
 *   node test-notify-ai-post.js <userId> [postId] [status]
 * 
 * Примеры:
 *   node test-notify-ai-post.js cmfetoamd001spzkowc5pdygf
 *   node test-notify-ai-post.js cmfetoamd001spzkowc5pdygf cm1234567890 completed
 */

const http = require('http');

// Параметры из командной строки
const userId = process.argv[2];
const postId = process.argv[3] || 'test_post_' + Date.now();
const status = process.argv[4] || 'processing';

if (!userId) {
  console.error('❌ Usage: node test-notify-ai-post.js <userId> [postId] [status]');
  console.error('   Example: node test-notify-ai-post.js cmfetoamd001spzkowc5pdygf');
  process.exit(1);
}

const data = JSON.stringify({
  userId,
  postId,
  status
});

const options = {
  hostname: 'localhost',
  port: 3004,
  path: '/notify-ai-post/',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('📤 Sending notification to Socket.IO server...');
console.log('   User ID:', userId);
console.log('   Post ID:', postId);
console.log('   Status:', status);
console.log('');

const req = http.request(options, (res) => {
  let responseBody = '';

  res.on('data', (chunk) => {
    responseBody += chunk;
  });

  res.on('end', () => {
    console.log('📥 Response:', res.statusCode);
    console.log('');

    try {
      const result = JSON.parse(responseBody);
      
      if (res.statusCode === 200) {
        console.log('✅ Success!');
        console.log('   Message:', result.message);
        console.log('   Socket ID:', result.socketId);
      } else {
        console.log('⚠️  Error:', result.error);
        
        if (res.statusCode === 404) {
          console.log('');
          console.log('💡 Tip: Make sure user is connected to Socket.IO server');
          console.log('   Check server logs for: 🔌 User ' + userId + ' connected');
        }
      }
    } catch (error) {
      console.error('❌ Failed to parse response:', responseBody);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  console.log('');
  console.log('💡 Make sure Socket.IO server is running on port 3004');
  console.log('   Start it with: cd socketio-server && node index.js');
});

req.write(data);
req.end();


