#!/usr/bin/env node

const jwt = require('jsonwebtoken');

console.log('🔍 PM2 Environment Variable Testing\n');

// Проверяем загруженное значение
const envSecret = process.env.NEXTAUTH_SECRET;
console.log('NEXTAUTH_SECRET exists:', !!envSecret);

if (envSecret) {
  console.log('Length:', envSecret.length);
  console.log('First 20 chars:', envSecret.substring(0, 20));
  console.log('Last 5 chars:', envSecret.substring(envSecret.length - 5));
  console.log('Has quotes:', envSecret.startsWith('"') && envSecret.endsWith('"'));
  console.log('Starts with quote:', envSecret[0] === '"');
  console.log('Ends with quote:', envSecret[envSecret.length - 1] === '"');
  console.log('Raw value (JSON stringified):', JSON.stringify(envSecret));
  
  // Проверяем разные варианты
  const testSecret = 'rFbhMWHvRfv9AacQlVquu9JnY1jCoioNdpaPfIkAK9U=';
  console.log('\nComparison with expected value:');
  console.log('Matches expected:', envSecret === testSecret);
  console.log('Matches with quotes:', envSecret === `"${testSecret}"`);
  
  // Если есть кавычки, пробуем их убрать
  if (envSecret.startsWith('"') && envSecret.endsWith('"')) {
    const cleanSecret = envSecret.slice(1, -1);
    console.log('\nCleaned secret (quotes removed):');
    console.log('Length:', cleanSecret.length);
    console.log('Matches expected:', cleanSecret === testSecret);
  }
  
  // Тестируем создание и проверку токена
  console.log('\n--- JWT Token Test ---');
  
  const payload = {
    userId: 'test123',
    wallet: 'testWallet'
  };
  
  try {
    // Создаем токен с загруженным секретом
    const token = jwt.sign(payload, envSecret, {
      expiresIn: '30m',
      issuer: 'fonana.me',
      audience: 'fonana-websocket'
    });
    console.log('✅ Token created with env secret');
    
    // Проверяем с тем же секретом
    const decoded = jwt.verify(token, envSecret);
    console.log('✅ Token verified with same secret');
    
    // Если есть кавычки, проверяем с очищенным секретом
    if (envSecret.startsWith('"') && envSecret.endsWith('"')) {
      const cleanSecret = envSecret.slice(1, -1);
      try {
        jwt.verify(token, cleanSecret);
        console.log('✅ Token verified with cleaned secret');
      } catch (e) {
        console.log('❌ Token NOT verified with cleaned secret');
      }
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
} else {
  console.log('❌ NEXTAUTH_SECRET not loaded!');
  console.log('All env vars:', Object.keys(process.env).filter(k => k.includes('NEXT')));
}

console.log('\n--- Process Info ---');
console.log('Script path:', __filename);
console.log('Working dir:', process.cwd());
console.log('PM2 env vars:', Object.keys(process.env).filter(k => k.startsWith('PM2_')).join(', ')); 