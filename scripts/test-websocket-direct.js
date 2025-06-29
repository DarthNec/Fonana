#!/usr/bin/env node

const WebSocket = require('ws');

// Direct connection to WebSocket server
const WS_URL = 'ws://localhost:3002';

async function testDirectConnection() {
  console.log('🔌 Testing direct WebSocket connection (bypassing nginx)...\n');
  
  // Test without token
  console.log('1. Testing without token...');
  const ws1 = new WebSocket(WS_URL);
  
  ws1.on('open', () => {
    console.log('⚠️  Connected without token (shouldn\'t happen)');
    ws1.close();
  });
  
  ws1.on('error', (error) => {
    console.log('✅ Connection error (expected):', error.message);
  });
  
  ws1.on('close', (code, reason) => {
    console.log(`✅ Closed with code ${code}: ${reason || 'No reason'}\n`);
    
    // Now test with invalid token
    testWithInvalidToken();
  });
}

function testWithInvalidToken() {
  console.log('2. Testing with invalid token...');
  const ws2 = new WebSocket(WS_URL, {
    headers: {
      'Authorization': 'Bearer invalid-token'
    }
  });
  
  ws2.on('open', () => {
    console.log('⚠️  Connected with invalid token');
    ws2.close();
  });
  
  ws2.on('error', (error) => {
    console.log('✅ Connection error:', error.message);
  });
  
  ws2.on('close', (code, reason) => {
    console.log(`✅ Closed with code ${code}: ${reason || 'No reason'}\n`);
    
    // Test with valid-looking token
    testWithMockToken();
  });
}

function testWithMockToken() {
  console.log('3. Testing with mock JWT token...');
  
  // Create a mock JWT (not cryptographically valid, but structurally correct)
  const header = Buffer.from(JSON.stringify({alg: 'HS256', typ: 'JWT'})).toString('base64');
  const payload = Buffer.from(JSON.stringify({
    userId: 'test123',
    sub: 'test123',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    iss: 'fonana.me',
    aud: 'fonana-websocket'
  })).toString('base64');
  const signature = 'fake-signature';
  
  const mockToken = `${header}.${payload}.${signature}`;
  
  const ws3 = new WebSocket(WS_URL, {
    headers: {
      'Authorization': `Bearer ${mockToken}`
    }
  });
  
  ws3.on('open', () => {
    console.log('✅ WebSocket opened! Server accepted connection');
    console.log('📨 Sending test message...');
    ws3.send(JSON.stringify({ type: 'ping' }));
    
    setTimeout(() => {
      ws3.close();
    }, 2000);
  });
  
  ws3.on('message', (data) => {
    console.log('📩 Received:', data.toString());
  });
  
  ws3.on('error', (error) => {
    console.log('❌ Connection error:', error.message);
  });
  
  ws3.on('close', (code, reason) => {
    console.log(`\nConnection closed - Code: ${code}, Reason: ${reason || 'No reason'}`);
    process.exit(0);
  });
}

// Start test
testDirectConnection(); 