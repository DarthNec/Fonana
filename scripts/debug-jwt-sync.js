#!/usr/bin/env node

const jwt = require('jsonwebtoken');
const path = require('path');

// Загружаем переменные окружения
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

console.log('🔍 JWT Token Sync Diagnostic\n');

// Секреты для проверки
const secrets = {
  fromEnv: process.env.NEXTAUTH_SECRET,
  hardcoded: 'rFbhMWHvRfv9AacQlVquu9JnY1jCoioNdpaPfIkAK9U=',
  default: 'your-secret-key'
};

console.log('📋 Available secrets:');
Object.entries(secrets).forEach(([name, secret]) => {
  console.log(`  ${name}: ${secret ? `${secret.substring(0, 10)}... (${secret.length} chars)` : 'NOT SET'}`);
});

// Создаем токены с разными секретами
console.log('\n🔨 Creating test tokens:');
const payload = {
  userId: 'test123',
  wallet: 'testWallet',
  sub: 'test123'
};

const tokens = {};
Object.entries(secrets).forEach(([name, secret]) => {
  if (secret) {
    try {
      tokens[name] = jwt.sign(payload, secret, { expiresIn: '30d' });
      console.log(`  ${name}: ${tokens[name].substring(0, 50)}... (${tokens[name].length} chars)`);
    } catch (error) {
      console.log(`  ${name}: Failed - ${error.message}`);
    }
  }
});

// Проверяем валидацию
console.log('\n🔐 Cross-validation matrix:');
console.log('  Token \\ Secret | fromEnv | hardcoded | default');
console.log('  --------------|---------|-----------|--------');

Object.entries(tokens).forEach(([tokenName, token]) => {
  let row = `  ${tokenName.padEnd(13)} |`;
  
  Object.entries(secrets).forEach(([secretName, secret]) => {
    if (secret) {
      try {
        jwt.verify(token, secret);
        row += '    ✅   |';
      } catch (error) {
        row += '    ❌   |';
      }
    } else {
      row += '    -    |';
    }
  });
  
  console.log(row);
});

// Тестовый токен с клиента (если передан)
const clientToken = process.argv[2];
if (clientToken) {
  console.log('\n🔍 Verifying client token:');
  console.log(`  Token: ${clientToken.substring(0, 50)}...`);
  console.log(`  Length: ${clientToken.length}`);
  
  // Декодируем без проверки
  try {
    const decoded = jwt.decode(clientToken);
    console.log('  Decoded:', JSON.stringify(decoded, null, 2));
  } catch (error) {
    console.log('  Failed to decode:', error.message);
  }
  
  // Проверяем с разными секретами
  console.log('\n  Verification results:');
  Object.entries(secrets).forEach(([name, secret]) => {
    if (secret) {
      try {
        const verified = jwt.verify(clientToken, secret);
        console.log(`    ${name}: ✅ VALID`);
      } catch (error) {
        console.log(`    ${name}: ❌ ${error.message}`);
      }
    }
  });
}

console.log('\n✅ Diagnostic complete'); 