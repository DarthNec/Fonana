#!/usr/bin/env node

// Переменные теперь передаются через PM2 ecosystem.config.js
// require('dotenv').config(); - УДАЛЕНО

// Проверяем что переменные загружены
console.log('🔐 Environment check:');
console.log('NEXTAUTH_SECRET exists:', !!process.env.NEXTAUTH_SECRET);
console.log('NEXTAUTH_SECRET length:', process.env.NEXTAUTH_SECRET?.length || 0);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Дополнительная диагностика
console.log('\n📊 Все переменные окружения, связанные с приложением:');
Object.keys(process.env)
  .filter(key => 
    key.includes('NEXTAUTH') || 
    key.includes('DATABASE') || 
    key === 'NODE_ENV' ||
    key === 'PORT'
  )
  .forEach(key => {
    const value = process.env[key];
    if (key.includes('SECRET')) {
      console.log(`  ${key}: ${value ? '[УСТАНОВЛЕН]' : '[НЕ УСТАНОВЛЕН]'}`);
    } else {
      console.log(`  ${key}: ${value}`);
    }
  });

// Запускаем Next.js
const { spawn } = require('child_process');

console.log('\n🚀 Starting Next.js production server...');

// Явно создаем объект окружения для передачи в Next.js
const nextEnv = {
  ...process.env,
  NODE_ENV: 'production',
  // Явно добавляем критические переменные
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'https://fonana.me'
};

// Проверяем, что переменные точно есть в nextEnv
console.log('\n🔍 Проверка переменных для Next.js:');
console.log('  NEXTAUTH_SECRET в nextEnv:', !!nextEnv.NEXTAUTH_SECRET);
console.log('  DATABASE_URL в nextEnv:', !!nextEnv.DATABASE_URL);

// Используем spawn вместо execSync для лучшего контроля над процессом
const nextProcess = spawn('npx', ['next', 'start'], {
  stdio: 'inherit',
  env: nextEnv,
  shell: true
});

nextProcess.on('error', (error) => {
  console.error('❌ Failed to start Next.js:', error);
  process.exit(1);
});

nextProcess.on('exit', (code) => {
  console.log(`Next.js process exited with code ${code}`);
  process.exit(code || 0);
}); 