const jwt = require('jsonwebtoken');
require('dotenv').config();

// Проверяем значение NEXTAUTH_SECRET
const secret = process.env.NEXTAUTH_SECRET;
console.log('NEXTAUTH_SECRET from env:', secret);
console.log('Secret length:', secret ? secret.length : 0);

// Создаем токен как в основном приложении
const payload = {
  userId: 'test-user-id',
  wallet: 'test-wallet-address',
  sub: 'test-user-id'
};

const token = jwt.sign(payload, secret, { expiresIn: '30d' });
console.log('\nCreated token:', token);
console.log('Token length:', token.length);

// Пробуем декодировать токен
try {
  const decoded = jwt.verify(token, secret);
  console.log('\n✅ Token verified successfully!');
  console.log('Decoded payload:', decoded);
} catch (error) {
  console.log('\n❌ Token verification failed:', error.message);
}

// Пробуем декодировать без проверки подписи (для отладки)
try {
  const decoded = jwt.decode(token);
  console.log('\nDecoded without verification:', decoded);
} catch (error) {
  console.log('\nFailed to decode token:', error.message);
}

// Проверяем fallback значение из env.ts
const fallbackSecret = 'rFbhMWHvRfv9AacQlVquu9JnY1jCoioNdpaPfIkAK9U=';
console.log('\n\nChecking with fallback secret...');
try {
  const decoded = jwt.verify(token, fallbackSecret);
  console.log('✅ Token verified with fallback secret!');
} catch (error) {
  console.log('❌ Token verification failed with fallback:', error.message);
} 