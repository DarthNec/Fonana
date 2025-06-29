#!/usr/bin/env node

// Альтернативный подход - прямая передача переменных в командной строке

const { execSync } = require('child_process');

// Проверяем что переменные загружены из PM2
console.log('🔐 Environment check from PM2:');
console.log('NEXTAUTH_SECRET exists:', !!process.env.NEXTAUTH_SECRET);
console.log('NEXTAUTH_SECRET length:', process.env.NEXTAUTH_SECRET?.length || 0);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Проверяем критические переменные
if (!process.env.NEXTAUTH_SECRET) {
  console.error('❌ CRITICAL: NEXTAUTH_SECRET not found in environment!');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('❌ CRITICAL: DATABASE_URL not found in environment!');
  process.exit(1);
}

console.log('\n🚀 Starting Next.js with explicit environment variables...');

try {
  // Передаем переменные явно в командной строке
  execSync('npx next start', {
    stdio: 'inherit',
    env: {
      ...process.env,
      // Убеждаемся, что критические переменные точно передаются
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      DATABASE_URL: process.env.DATABASE_URL,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'https://fonana.me',
      NODE_ENV: 'production',
      PORT: process.env.PORT || '3000'
    }
  });
} catch (error) {
  console.error('❌ Failed to start Next.js:', error.message);
  process.exit(1);
} 