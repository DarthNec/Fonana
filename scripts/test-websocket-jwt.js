#!/usr/bin/env node

const WebSocket = require('ws');
const fetch = require('node-fetch');

const API_URL = 'https://fonana.me/api';
const WS_URL = 'wss://fonana.me/ws';

// Test wallet - используйте реальный кошелек из базы
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
      throw new Error(`Failed to get JWT: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ JWT obtained:', {
      userId: data.user.id,
      nickname: data.user.nickname,
      expiresIn: data.expiresIn
    });
    
    return data.token;
  } catch (error) {
    console.error('❌ Failed to get JWT:', error);
    throw error;
  }
}

async function testWebSocketConnection() {
  console.log('\n🚀 Testing WebSocket Connection with JWT\n');
  
  try {
    // Step 1: Get JWT token
    const token = await getJWTToken(TEST_WALLET);
    
    // Step 2: Connect to WebSocket with token
    console.log('\n📡 Connecting to WebSocket...');
    
    const ws = new WebSocket(WS_URL, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Handle connection open
    ws.on('open', () => {
      console.log('✅ WebSocket connected successfully!\n');
      
      // Test subscribing to a channel
      console.log('📨 Subscribing to notifications channel...');
      ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'notifications'
      }));
      
      // Test ping
      setTimeout(() => {
        console.log('📨 Sending ping...');
        ws.send(JSON.stringify({
          type: 'ping'
        }));
      }, 1000);
      
      // Close after 5 seconds
      setTimeout(() => {
        console.log('\n🔌 Closing connection...');
        ws.close();
      }, 5000);
    });
    
    // Handle messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        console.log('📩 Received:', message);
        
        if (message.type === 'post-purchased') {
          console.log('🎉 POST PURCHASE EVENT RECEIVED!');
        }
      } catch (e) {
        console.log('📩 Raw message:', data.toString());
      }
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
    });
    
    // Handle close
    ws.on('close', (code, reason) => {
      console.log(`\n🔌 WebSocket closed - Code: ${code}, Reason: ${reason || 'No reason'}`);
      
      // Analyze close codes
      switch(code) {
        case 1000:
          console.log('✅ Normal closure');
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
      
      process.exit(0);
    });
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Test negative scenario
async function testInvalidToken() {
  console.log('\n\n🧪 Testing invalid token scenario...\n');
  
  const ws = new WebSocket(WS_URL, {
    headers: {
      'Authorization': 'Bearer invalid-token-123'
    }
  });
  
  ws.on('open', () => {
    console.log('⚠️  Connected with invalid token (shouldn\'t happen)');
  });
  
  ws.on('error', (error) => {
    console.log('✅ Correctly rejected invalid token');
  });
  
  ws.on('close', (code, reason) => {
    console.log(`✅ Connection closed - Code: ${code}`);
    if (code === 1008) {
      console.log('✅ Correct close code for auth failure');
    }
  });
}

// Main execution
async function main() {
  console.log('🔍 Fonana WebSocket JWT Test Suite\n');
  
  // Test valid connection
  await testWebSocketConnection();
  
  // Wait a bit before testing invalid token
  setTimeout(async () => {
    await testInvalidToken();
  }, 7000);
}

main().catch(console.error); 