#!/usr/bin/env node

const jwt = require('jsonwebtoken');

const token = process.argv[2];
if (!token) {
  console.error('Usage: node test-jwt-validation.js <token>');
  process.exit(1);
}

// Тестируем с разными секретами
const secrets = [
  { name: 'from_env', value: process.env.NEXTAUTH_SECRET },
  { name: 'hardcoded', value: 'rFbhMWHvRfv9AacQlVquu9JnY1jCoioNdpaPfIkAK9U=' },
  { name: 'default', value: 'your-secret-key' },
  { name: 'not-set', value: 'not-set' }
];

console.log('🔍 Testing JWT token validation\n');

// Декодируем токен без проверки
const decoded = jwt.decode(token);
console.log('📋 Token payload:');
console.log(JSON.stringify(decoded, null, 2));
console.log();

// Пробуем разные секреты
console.log('🔐 Testing with different secrets:\n');
secrets.forEach(({ name, value }) => {
  if (!value) {
    console.log(`❌ ${name}: No value`);
    return;
  }
  
  try {
    const verified = jwt.verify(token, value, {
      audience: 'fonana-websocket',
      issuer: 'fonana.me'
    });
    console.log(`✅ ${name}: VALID (secret length: ${value.length})`);
  } catch (error) {
    console.log(`❌ ${name}: ${error.message} (secret length: ${value.length})`);
  }
}); 