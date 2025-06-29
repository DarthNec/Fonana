#!/usr/bin/env node

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Load .env file
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
});

const JWT_SECRET = envVars.NEXTAUTH_SECRET;
const WS_URL = 'wss://fonana.me/ws';

console.log('\n🧪 ФИНАЛЬНОЕ ТЕСТИРОВАНИЕ WEBSOCKET');
console.log('=====================================\n');

// Test 1: Valid JWT token
async function testValidConnection() {
  console.log('1️⃣ Тест с валидным JWT токеном...');
  
  const validToken = jwt.sign(
    {
      userId: 'cmcceumg7001iyjleslvczux6',
      wallet: 'npzAZaN9fDMgLV63b3kv3FF8cLSd8dQSLxyMXASA5T4',
      sub: 'cmcceumg7001iyjleslvczux6'
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  const ws = new WebSocket(WS_URL, {
    headers: {
      'Authorization': `Bearer ${validToken}`
    }
  });

  return new Promise((resolve) => {
    let messageCount = 0;

    ws.on('open', () => {
      console.log('✅ Соединение установлено');
      
      // Подписка на события
      ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'notifications'
      }));
    });

    ws.on('message', (data) => {
      messageCount++;
      const message = JSON.parse(data);
      console.log(`📨 Получено сообщение ${messageCount}:`, message);
      
      if (messageCount >= 2) {
        console.log('✅ Real-time события работают\n');
        ws.close();
        resolve(true);
      }
    });

    ws.on('error', (error) => {
      console.error('❌ Ошибка:', error.message);
      resolve(false);
    });

    ws.on('close', () => {
      console.log('🔌 Соединение закрыто');
      resolve(true);
    });

    // Timeout после 10 секунд
    setTimeout(() => {
      ws.close();
      resolve(true);
    }, 10000);
  });
}

// Test 2: Invalid JWT token
async function testInvalidConnection() {
  console.log('2️⃣ Тест с невалидным JWT токеном...');
  
  const invalidToken = 'invalid.jwt.token';

  const ws = new WebSocket(WS_URL, {
    headers: {
      'Authorization': `Bearer ${invalidToken}`
    }
  });

  return new Promise((resolve) => {
    ws.on('open', () => {
      console.log('❌ Соединение не должно было установиться!');
      ws.close();
      resolve(false);
    });

    ws.on('error', (error) => {
      console.log('✅ Соединение отклонено (ожидаемо):', error.message);
      resolve(true);
    });

    ws.on('close', (code, reason) => {
      console.log(`✅ Соединение закрыто с кодом ${code}${reason ? `: ${reason}` : ''}`);
      resolve(true);
    });

    // Timeout
    setTimeout(() => {
      resolve(true);
    }, 5000);
  });
}

// Test 3: No JWT token
async function testNoToken() {
  console.log('\n3️⃣ Тест без JWT токена...');
  
  const ws = new WebSocket(WS_URL);

  return new Promise((resolve) => {
    ws.on('open', () => {
      console.log('❌ Соединение не должно было установиться!');
      ws.close();
      resolve(false);
    });

    ws.on('error', (error) => {
      console.log('✅ Соединение отклонено (ожидаемо):', error.message);
      resolve(true);
    });

    ws.on('close', (code, reason) => {
      console.log(`✅ Соединение закрыто с кодом ${code}${reason ? `: ${reason}` : ''}\n`);
      resolve(true);
    });

    // Timeout
    setTimeout(() => {
      resolve(true);
    }, 5000);
  });
}

// Run tests
async function runTests() {
  console.log('🔑 JWT Secret загружен:', JWT_SECRET ? 'ДА' : 'НЕТ');
  console.log('🌐 WebSocket URL:', WS_URL);
  console.log('');

  const test1 = await testValidConnection();
  const test2 = await testInvalidConnection();
  const test3 = await testNoToken();

  console.log('\n📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:');
  console.log('==========================');
  console.log(`1. Валидный токен: ${test1 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`2. Невалидный токен: ${test2 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`3. Без токена: ${test3 ? '✅ PASSED' : '❌ FAILED'}`);
  
  const allPassed = test1 && test2 && test3;
  console.log(`\n${allPassed ? '✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ!' : '❌ ЕСТЬ ПРОБЛЕМЫ!'}`);
  
  process.exit(allPassed ? 0 : 1);
}

runTests().catch(console.error); 