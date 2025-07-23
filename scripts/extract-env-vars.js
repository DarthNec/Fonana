#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔐 Извлечение переменных окружения\n');

const envPath = path.join('/var/www/Fonana', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

// Парсим переменные
const variables = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').trim();
    // Убираем кавычки если есть
    variables[key.trim()] = value.replace(/^["']|["']$/g, '');
  }
});

// Список критических переменных
const criticalVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'GITHUB_ID', 
  'GITHUB_SECRET'
];

console.log('Критические переменные для ecosystem.config.js:\n');
console.log('```javascript');
console.log('env: {');
console.log('  NODE_ENV: \'production\',');
console.log('  PORT: 3000,');

criticalVars.forEach(varName => {
  if (variables[varName]) {
    const value = variables[varName];
    // Маскируем чувствительные данные для отчета
    let displayValue = value;
    if (varName.includes('SECRET') || varName.includes('PASSWORD')) {
      displayValue = value.substring(0, 10) + '...' + value.substring(value.length - 5);
    }
    console.log(`  ${varName}: '${value}',`);
  }
});

console.log('}');
console.log('```\n');

// Проверяем наличие всех критических переменных
console.log('Статус переменных:');
criticalVars.forEach(varName => {
  const status = variables[varName] ? '✅' : '❌';
  const length = variables[varName] ? variables[varName].length : 0;
  console.log(`${status} ${varName}: ${length} символов`);
});

// Создаем конфигурацию для WebSocket
console.log('\n\nДля WebSocket сервера:');
console.log('```javascript');
console.log('env: {');
console.log('  NODE_ENV: \'production\',');
console.log('  PORT: 3002,');
console.log('  WS_PORT: 3002,');

['DATABASE_URL', 'NEXTAUTH_SECRET'].forEach(varName => {
  if (variables[varName]) {
    console.log(`  ${varName}: '${variables[varName]}',`);
  }
});

console.log('}');
console.log('```'); 