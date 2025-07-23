#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 ДИАГНОСТИКА КОНФИГУРАЦИИ ПЕРЕМЕННЫХ ОКРУЖЕНИЯ\n');
console.log('=' .repeat(50));

// 1. Проверка .env файлов
console.log('\n📄 Проверка .env файлов:');
const envFiles = ['.env', '.env.local', '.env.production', 'websocket-server/.env'];

envFiles.forEach(file => {
  const filePath = path.join('/var/www/Fonana', file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const hasNextAuthSecret = content.includes('NEXTAUTH_SECRET=');
    const nextAuthLine = content.split('\n').find(line => line.startsWith('NEXTAUTH_SECRET='));
    
    console.log(`\n✅ ${file}:`);
    console.log(`   - Файл существует`);
    console.log(`   - NEXTAUTH_SECRET: ${hasNextAuthSecret ? 'есть' : 'отсутствует'}`);
    if (nextAuthLine) {
      const hasQuotes = nextAuthLine.includes('"');
      console.log(`   - Кавычки: ${hasQuotes ? 'ЕСТЬ ⚠️' : 'нет ✅'}`);
      console.log(`   - Длина значения: ${nextAuthLine.split('=')[1].length}`);
    }
  } else {
    console.log(`\n❌ ${file}: НЕ НАЙДЕН`);
  }
});

// 2. Проверка PM2 конфигурации
console.log('\n\n📋 Проверка PM2 конфигурации:');
try {
  const ecosystemPath = '/var/www/Fonana/ecosystem.config.js';
  const ecosystemContent = fs.readFileSync(ecosystemPath, 'utf8');
  
  console.log('✅ ecosystem.config.js найден');
  console.log(`   - env_file для fonana: ${ecosystemContent.includes("env_file: './.env'") ? 'есть ✅' : 'отсутствует ❌'}`);
  console.log(`   - env_file для fonana-ws: ${ecosystemContent.match(/fonana-ws[\s\S]*?env_file/) ? 'есть ✅' : 'отсутствует ❌'}`);
} catch (error) {
  console.log('❌ Ошибка чтения ecosystem.config.js:', error.message);
}

// 3. Проверка процессов PM2
console.log('\n\n🚀 Проверка запущенных процессов:');
try {
  const pm2Status = execSync('pm2 status', { encoding: 'utf8' });
  console.log(pm2Status);
} catch (error) {
  console.log('❌ Ошибка получения статуса PM2:', error.message);
}

// 4. Проверка переменных в процессах
console.log('\n\n🔐 Проверка переменных в процессах:');

// Проверка fonana
console.log('\n📦 Процесс fonana:');
try {
  const fonanaEnv = execSync('pm2 env 2 | grep -E "NEXTAUTH_SECRET|DATABASE_URL|NODE_ENV" | head -5', { encoding: 'utf8' });
  if (fonanaEnv) {
    console.log(fonanaEnv);
  } else {
    console.log('⚠️  Переменные не найдены в процессе fonana');
  }
} catch (error) {
  console.log('❌ Ошибка получения переменных fonana:', error.message);
}

// Проверка fonana-ws
console.log('\n📦 Процесс fonana-ws:');
try {
  const wsEnv = execSync('pm2 env 1 | grep -E "NEXTAUTH_SECRET|DATABASE_URL|NODE_ENV" | head -5', { encoding: 'utf8' });
  if (wsEnv) {
    console.log(wsEnv);
  } else {
    console.log('⚠️  Переменные не найдены в процессе fonana-ws');
  }
} catch (error) {
  console.log('❌ Ошибка получения переменных fonana-ws:', error.message);
}

// 5. Проверка API endpoint
console.log('\n\n🌐 Проверка API endpoint:');
try {
  const jwtDebugResponse = execSync('curl -s http://localhost:3000/api/test/jwt-debug', { encoding: 'utf8' });
  const jwtDebug = JSON.parse(jwtDebugResponse);
  
  console.log('JWT Debug Response:');
  console.log(`   - Secret настроен: ${jwtDebug.secretConfigured ? 'да ✅' : 'НЕТ ❌'}`);
  console.log(`   - Длина secret: ${jwtDebug.secretLength}`);
  console.log(`   - Префикс: ${jwtDebug.secretPrefix}`);
  console.log(`   - Дефолтный: ${jwtDebug.isDefaultSecret ? 'ДА ⚠️' : 'нет'}`);
  console.log(`   - NODE_ENV: ${jwtDebug.nodeEnv}`);
} catch (error) {
  console.log('❌ Ошибка проверки JWT endpoint:', error.message);
}

// 6. Тест создания JWT токена
console.log('\n\n🔑 Тест создания JWT токена:');
try {
  const tokenResponse = execSync('curl -s -X POST http://localhost:3000/api/auth/wallet -H "Content-Type: application/json" -d \'{"wallet": "DUxkXhMWuo76ofUMtFRZtL8zmVqQnb8twLeB5NcaM4cG"}\'', { encoding: 'utf8' });
  const tokenData = JSON.parse(tokenResponse);
  
  if (tokenData.token) {
    console.log('✅ Токен создан успешно');
    
    // Декодируем header и payload
    const [header, payload] = tokenData.token.split('.').slice(0, 2).map(part => 
      JSON.parse(Buffer.from(part, 'base64').toString())
    );
    
    console.log('   - Алгоритм:', header.alg);
    console.log('   - User ID:', payload.userId);
    console.log('   - Audience:', payload.aud);
    console.log('   - Issuer:', payload.iss);
  } else {
    console.log('❌ Ошибка создания токена:', tokenData.error);
  }
} catch (error) {
  console.log('❌ Ошибка теста JWT:', error.message);
}

// 7. Проверка WebSocket сервера
console.log('\n\n🌐 Проверка WebSocket сервера:');
try {
  const wsLogs = execSync('pm2 logs fonana-ws --lines 5 --nostream | grep -E "JWT_SECRET|Using default|loaded from"', { encoding: 'utf8' });
  if (wsLogs) {
    console.log('Последние логи WebSocket:');
    console.log(wsLogs);
  }
} catch (error) {
  // Игнорируем ошибку если логи пустые
}

console.log('\n' + '=' .repeat(50));
console.log('📊 ДИАГНОСТИКА ЗАВЕРШЕНА\n'); 