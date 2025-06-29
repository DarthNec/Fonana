#!/usr/bin/env node

const jwt = require('jsonwebtoken');

// Исходный секрет из .env файла (с кавычками и = в конце)
const secretFromEnv = 'rFbhMWHvRfv9AacQlVquu9JnY1jCoioNdpaPfIkAK9U=';

// Возможные варианты обработки
const secrets = {
  'raw': secretFromEnv,
  'base64_decoded': Buffer.from(secretFromEnv, 'base64').toString('utf8'),
  'base64_buffer': Buffer.from(secretFromEnv, 'base64'),
  'no_equals': secretFromEnv.replace(/=$/, ''),
  'nextauth_default': 'your-secret-key'
};

// Тестовые данные для токена
const payload = {
  userId: 'test123',
  wallet: 'testWallet',
  nickname: 'TestUser'
};

console.log('🔐 JWT Signature Testing\n');
console.log('Original secret:', secretFromEnv);
console.log('Secret length:', secretFromEnv.length);
console.log('\n--- Testing different secret formats ---\n');

// Создаем токен с каждым вариантом секрета
const tokens = {};
Object.entries(secrets).forEach(([name, secret]) => {
  try {
    const token = jwt.sign(payload, secret, {
      expiresIn: '30m',
      issuer: 'fonana.me',
      audience: 'fonana-websocket'
    });
    tokens[name] = token;
    console.log(`✅ ${name}: Token created successfully`);
    if (typeof secret === 'string') {
      console.log(`   Secret preview: ${secret.substring(0, 20)}...`);
      console.log(`   Secret length: ${secret.length}`);
    } else {
      console.log(`   Secret type: Buffer`);
      console.log(`   Buffer length: ${secret.length}`);
    }
  } catch (error) {
    console.log(`❌ ${name}: Failed to create token - ${error.message}`);
  }
});

console.log('\n--- Cross-verification matrix ---\n');

// Проверяем каждый токен с каждым секретом
Object.entries(tokens).forEach(([tokenName, token]) => {
  console.log(`\nToken created with "${tokenName}":`);
  Object.entries(secrets).forEach(([secretName, secret]) => {
    try {
      const decoded = jwt.verify(token, secret);
      console.log(`  ✅ Verified with "${secretName}"`);
    } catch (error) {
      if (error.message === 'invalid signature') {
        console.log(`  ❌ Invalid signature with "${secretName}"`);
      } else {
        console.log(`  ❌ Error with "${secretName}": ${error.message}`);
      }
    }
  });
});

console.log('\n--- Environment variable test ---\n');

// Проверяем как Node.js видит переменную окружения
const envSecret = process.env.NEXTAUTH_SECRET;
console.log('process.env.NEXTAUTH_SECRET exists:', !!envSecret);
if (envSecret) {
  console.log('Env secret length:', envSecret.length);
  console.log('Env secret preview:', envSecret.substring(0, 20) + '...');
  console.log('Matches raw secret:', envSecret === secretFromEnv);
  console.log('Has quotes:', envSecret.startsWith('"') && envSecret.endsWith('"'));
}

console.log('\n--- Recommendation ---\n');
console.log('Based on the tests above, identify which format works for cross-verification.');
console.log('The correct format should verify tokens created with the same format.'); 