#!/usr/bin/env node

const WebSocket = require('ws');

const WS_URL = 'wss://fonana.me/ws';
const token = process.argv[2] || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWJ2NTNiN2gwMDAwcW9lMHZ5NHF3a2FwIiwid2FsbGV0IjoibnB6QVphTjlmRE1nTFY2M2Iza3YzRkY4Y0xTZDhkUVNMeHlNWEFTQTVUNCIsInN1YiI6ImNtYnY1M2I3aDAwMDBxb2Uwdnk0cXdrYXAiLCJpYXQiOjE3NTEyNjA1MzcsImV4cCI6MTc1Mzg1MjUzN30.OpwXHee1aEDfHMuuQuQPg7sNTWsY0hUqnvRI7LPXkkY';

console.log('🔌 Testing WebSocket connection with token...');
console.log(`Token length: ${token.length}`);
console.log(`Token: ${token.substring(0, 50)}...`);

const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);

ws.on('open', () => {
  console.log('✅ WebSocket connected successfully!');
  
  // Try to subscribe to notifications
  const userId = 'cmbv53b7h0000qoe0vy4qwkap';
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: { type: 'notifications', userId }
  }));
  console.log('📮 Sent subscription request');
});

ws.on('message', (data) => {
  console.log('📨 Received:', data.toString());
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
  console.log(`🔌 WebSocket closed: ${code} - ${reason || 'No reason'}`);
  process.exit(0);
});

// Keep the script running
setTimeout(() => {
  console.log('⏰ Timeout reached, closing connection');
  ws.close();
}, 10000); 