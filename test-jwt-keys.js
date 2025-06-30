const jwt = require('jsonwebtoken');

// Создаем токен с ключом из API
const apiSecret = process.env.NEXTAUTH_SECRET || 'your-secret-key';
const token = jwt.sign({ userId: 'test123', sub: 'test123' }, apiSecret);

console.log('=== JWT Key Test ===');
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? process.env.NEXTAUTH_SECRET.substring(0, 20) + '...' : 'NOT SET');
console.log('API Default:', apiSecret === 'your-secret-key' ? 'USING DEFAULT' : 'USING ENV');
console.log('Generated token:', token.substring(0, 50) + '...');

// Проверяем с тем же ключом
try {
  const decoded1 = jwt.verify(token, apiSecret);
  console.log('✅ Verified with API key');
} catch (e) {
  console.log('❌ Failed with API key:', e.message);
}

// Проверяем с ключом WebSocket
const wsSecret = process.env.NEXTAUTH_SECRET || 'your-secret-key';
try {
  const decoded2 = jwt.verify(token, wsSecret);
  console.log('✅ Verified with WS key');
} catch (e) {
  console.log('❌ Failed with WS key:', e.message);
}

// Проверяем реальный ключ из .env
const realSecret = 'rFbhMWHvRfv9AacQlVquu9JnY1jCoioNdpaPfIkAK9U=';
try {
  const decoded3 = jwt.verify(token, realSecret);
  console.log('✅ Verified with real .env key');
} catch (e) {
  console.log('❌ Failed with real .env key:', e.message);
} 