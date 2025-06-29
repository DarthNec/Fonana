#!/usr/bin/env node

// Загружаем переменные окружения из корневого .env файла
const path = require('path');
const fs = require('fs');

// Путь к .env файлу в корне проекта
const envPath = path.join(__dirname, '../.env');

console.log('🔍 Loading environment from:', envPath);

if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found at:', envPath);
  process.exit(1);
}

// Загружаем переменные окружения
require('dotenv').config({ path: envPath });

// Проверяем критические переменные
const requiredEnvVars = ['DATABASE_URL', 'NEXTAUTH_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

// Проверяем формат DATABASE_URL
if (!process.env.DATABASE_URL.startsWith('postgresql://') && !process.env.DATABASE_URL.startsWith('postgres://')) {
  console.error('❌ DATABASE_URL must start with postgresql:// or postgres://');
  console.error('Current value starts with:', process.env.DATABASE_URL.substring(0, 20) + '...');
  process.exit(1);
}

console.log('✅ Environment variables loaded successfully');
console.log('📊 DATABASE_URL format:', process.env.DATABASE_URL.substring(0, 15) + '...');
console.log('🔑 NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'Set' : 'Not set');

// Запускаем основной файл WebSocket сервера
require('./index.js'); 