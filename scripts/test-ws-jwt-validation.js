// Эмулируем WebSocket сервер
const jwt = require('jsonwebtoken');
const path = require('path');

// Загружаем переменные окружения как в WebSocket сервере
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key';
console.log('🔑 JWT_SECRET configured:', JWT_SECRET ? `${JWT_SECRET.substring(0, 10)}...` : 'NOT SET');
console.log('🔑 Using default key:', JWT_SECRET === 'your-secret-key');

// Пример токена из логов (длина 297)
// Это токен который пытается отправить клиент
const sampleToken = process.argv[2];

if (!sampleToken) {
  console.log('\nUsage: node test-ws-jwt-validation.js <JWT_TOKEN>');
  console.log('\nTesting with generated token...');
  
  // Создаем токен как в основном приложении
  const ENV = {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'rFbhMWHvRfv9AacQlVquu9JnY1jCoioNdpaPfIkAK9U='
  };
  
  const testToken = jwt.sign(
    {
      userId: 'test-user-id',
      wallet: 'test-wallet-address',
      sub: 'test-user-id'
    },
    ENV.NEXTAUTH_SECRET,
    { 
      expiresIn: '30d'
    }
  );
  
  console.log('\nGenerated token:', testToken);
  console.log('Token length:', testToken.length);
  
  // Пробуем проверить как в WebSocket
  try {
    const decoded = jwt.verify(testToken, JWT_SECRET);
    console.log('\n✅ Token verified successfully!');
    console.log('Decoded:', decoded);
  } catch (error) {
    console.log('\n❌ Verification failed:', error.message);
  }
} else {
  console.log('\nToken to verify:', sampleToken);
  console.log('Token length:', sampleToken.length);
  
  // Пробуем декодировать без проверки
  try {
    const decoded = jwt.decode(sampleToken);
    console.log('\nDecoded without verification:', decoded);
  } catch (error) {
    console.log('\nFailed to decode:', error.message);
  }
  
  // Пробуем проверить с секретом
  try {
    const decoded = jwt.verify(sampleToken, JWT_SECRET);
    console.log('\n✅ Token verified with WebSocket secret!');
    console.log('Decoded:', decoded);
  } catch (error) {
    console.log('\n❌ Verification failed:', error.message);
  }
} 