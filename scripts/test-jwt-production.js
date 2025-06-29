#!/usr/bin/env node

const jwt = require('jsonwebtoken');

const token = process.argv[2];
if (!token) {
  console.error('Usage: node test-jwt-production.js <token>');
  process.exit(1);
}

// Тестируем с разными ключами
const secrets = {
  'default': 'your-secret-key',
  'from_env': process.env.NEXTAUTH_SECRET,
  'real_secret': 'rFbhMWHvRfv9AacQlVquu9JnY1jCoioNdpaPfIkAK9U='
};

console.log('🔍 Testing JWT token verification\n');
console.log('Token:', token.substring(0, 50) + '...\n');

for (const [name, secret] of Object.entries(secrets)) {
  if (!secret) {
    console.log(`❌ ${name}: No secret available`);
    continue;
  }
  
  try {
    const decoded = jwt.verify(token, secret, {
      audience: 'fonana-websocket',
      issuer: 'fonana.me'
    });
    console.log(`✅ ${name}: Token verified successfully!`);
    console.log(`   User ID: ${decoded.userId}`);
    console.log(`   Wallet: ${decoded.wallet}`);
    console.log(`   Nickname: ${decoded.nickname}\n`);
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
  }
} 