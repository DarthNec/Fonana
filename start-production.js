#!/usr/bin/env node

// Загружаем переменные из .env файла
require('dotenv').config();

// Проверяем что переменные загружены
console.log('🔐 Environment check:');
console.log('NEXTAUTH_SECRET exists:', !!process.env.NEXTAUTH_SECRET);
console.log('NEXTAUTH_SECRET length:', process.env.NEXTAUTH_SECRET?.length || 0);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Запускаем Next.js
const { spawn } = require('child_process');

console.log('🚀 Starting Next.js production server...');

// Используем spawn вместо execSync для лучшего контроля над процессом
const nextProcess = spawn('npx', ['next', 'start'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production'
  },
  shell: true
});

nextProcess.on('error', (error) => {
  console.error('❌ Failed to start Next.js:', error);
  process.exit(1);
});

nextProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Next.js exited with code ${code}`);
    process.exit(code);
  }
}); 