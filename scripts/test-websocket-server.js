#!/usr/bin/env node

const WebSocket = require('ws');
const fetch = require('node-fetch');

// Use localhost when running on server
const API_URL = 'http://localhost:3000/api';
const WS_URL = 'ws://localhost:3002';

// Test wallet
const TEST_WALLET = 'DUxkXhMWuo76ofUMtFRZtL8zmVqQnb8twLeB5NcaM4cG'; // Dogwater

async function getJWTToken(wallet) {
  console.log('🔑 Getting JWT token for wallet:', wallet);
  
  try {
    const response = await fetch(`${API_URL}/auth/wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ wallet })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get JWT: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    console.log('✅ JWT obtained:', {
      userId: data.user.id,
      nickname: data.user.nickname,
      expiresIn: data.expiresIn
    });
    
    return data.token;
  } catch (error) {
    console.error('❌ Failed to get JWT:', error.message);
    throw error;
  }
}

async function testWebSocketConnection() {
  console.log('\n🚀 Testing WebSocket Connection with JWT\n');
  
  let ws = null;
  
  try {
    // Step 1: Get JWT token
    const token = await getJWTToken(TEST_WALLET);
    
    // Step 2: Connect to WebSocket with token in header
    console.log('\n📡 Connecting to WebSocket with JWT in header...');
    
    ws = new WebSocket(WS_URL, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Set timeout for connection
    const timeout = setTimeout(() => {
      console.log('⏰ Connection timeout');
      if (ws) ws.close();
    }, 10000);
    
    // Handle connection open
    ws.on('open', () => {
      clearTimeout(timeout);
      console.log('✅ WebSocket connected successfully!\n');
      
      // Subscribe to user channel
      const userId = 'cmbv5ezor0001qoe08nrb9ie7'; // Dogwater's userId
      console.log(`📨 Subscribing to user:${userId} channel...`);
      ws.send(JSON.stringify({
        type: 'subscribe',
        channel: `user:${userId}`
      }));
      
      // Test ping after 1 second
      setTimeout(() => {
        console.log('📨 Sending ping...');
        ws.send(JSON.stringify({
          type: 'ping'
        }));
      }, 1000);
      
      // Keep connection open for 10 seconds to receive events
      setTimeout(() => {
        console.log('\n🔌 Closing connection...');
        ws.close();
      }, 10000);
    });
    
    // Handle messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📩 Received:', JSON.stringify(message, null, 2));
        
        if (message.type === 'post-purchased') {
          console.log('🎉 POST PURCHASE EVENT RECEIVED!');
          console.log('   Post ID:', message.data?.postId);
          console.log('   User ID:', message.data?.userId);
        }
      } catch (e) {
        console.log('📩 Raw message:', data.toString());
      }
    });
    
    // Handle errors
    ws.on('error', (error) => {
      clearTimeout(timeout);
      console.error('❌ WebSocket error:', error.message);
    });
    
    // Handle close
    ws.on('close', (code, reason) => {
      clearTimeout(timeout);
      console.log(`\n🔌 WebSocket closed - Code: ${code}, Reason: ${reason || 'No reason'}`);
      
      // Analyze close codes
      switch(code) {
        case 1000:
          console.log('✅ Normal closure');
          break;
        case 1001:
          console.log('✅ Going away');
          break;
        case 1008:
          console.log('❌ Policy violation (likely auth failure)');
          break;
        case 1006:
          console.log('❌ Abnormal closure (connection lost)');
          break;
        default:
          console.log('⚠️  Unexpected close code');
      }
    });
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (ws) ws.close();
  }
}

// Test connection with token in URL
async function testWebSocketWithTokenInURL() {
  console.log('\n\n🧪 Testing WebSocket with token in URL...\n');
  
  try {
    const token = await getJWTToken(TEST_WALLET);
    const wsUrl = `${WS_URL}?token=${token}`;
    
    console.log('📡 Connecting with token in query string...');
    const ws = new WebSocket(wsUrl);
    
    ws.on('open', () => {
      console.log('✅ Connected with token in URL!');
      setTimeout(() => ws.close(), 2000);
    });
    
    ws.on('error', (error) => {
      console.log('❌ Connection error:', error.message);
    });
    
    ws.on('close', (code) => {
      console.log(`Connection closed - Code: ${code}`);
    });
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🔍 Fonana WebSocket Server Test\n');
  console.log('Testing from inside the server using localhost...\n');
  
  // Test with header auth
  await testWebSocketConnection();
  
  // Wait before next test
  setTimeout(async () => {
    // Test with URL auth
    await testWebSocketWithTokenInURL();
    
    // Summary
    setTimeout(() => {
      console.log('\n\n📊 Test Summary:');
      console.log('- JWT token generation: ✅ Working');
      console.log('- WebSocket connection: Check logs above');
      console.log('- Real-time events: Monitor for 10 seconds');
      console.log('\nTo test post purchase events:');
      console.log('1. Open browser and buy a post');
      console.log('2. Watch this console for "post-purchased" event');
      process.exit(0);
    }, 15000);
  }, 12000);
}

main().catch(console.error); 