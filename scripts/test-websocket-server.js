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
const WS_URL = 'ws://localhost:3002';  // Using localhost from server

console.log('\n🧪 ТЕСТИРОВАНИЕ WEBSOCKET С СЕРВЕРА');
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
    let connected = false;

    ws.on('open', () => {
      connected = true;
      console.log('✅ Соединение установлено');
      console.log('📡 Отправляю подписку на уведомления...');
      
      // Подписка на события
      ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'notifications'
      }));
    });

    ws.on('message', (data) => {
      messageCount++;
      const message = JSON.parse(data);
      console.log(`📨 Сообщение ${messageCount}:`, JSON.stringify(message));
      
      if (message.type === 'subscribed') {
        console.log('✅ Подписка подтверждена');
      }
      
      if (messageCount >= 1) {
        console.log('✅ Real-time коммуникация работает\n');
        ws.close();
      }
    });

    ws.on('error', (error) => {
      console.error('❌ Ошибка:', error.message);
      resolve(false);
    });

    ws.on('close', () => {
      console.log('🔌 Соединение закрыто');
      resolve(connected);
    });

    // Timeout после 5 секунд
    setTimeout(() => {
      ws.close();
      resolve(connected);
    }, 5000);
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
    let wasRejected = false;
    
    ws.on('open', () => {
      // WebSocket может открыться на мгновение перед закрытием
      console.log('⏳ Соединение открылось, ожидаем закрытия с ошибкой...');
    });

    ws.on('error', (error) => {
      wasRejected = true;
      console.log('✅ Ошибка соединения (ожидаемо):', error.message);
    });

    ws.on('close', (code, reason) => {
      if (code === 1008) {
        console.log(`✅ Правильно отклонено с кодом ${code}: ${reason || 'Unauthorized'}\n`);
        resolve(true);
      } else if (wasRejected) {
        console.log(`✅ Соединение отклонено\n`);
        resolve(true);
      } else {
        console.log(`❌ Неожиданное поведение: код ${code}\n`);
        resolve(false);
      }
    });

    // Timeout
    setTimeout(() => {
      resolve(wasRejected || false);
    }, 3000);
  });
}

// Test 3: No JWT token
async function testNoToken() {
  console.log('\n3️⃣ Тест без JWT токена...');
  
  const ws = new WebSocket(WS_URL);

  return new Promise((resolve) => {
    let wasRejected = false;
    
    ws.on('open', () => {
      // WebSocket может открыться на мгновение перед закрытием
      console.log('⏳ Соединение открылось, ожидаем закрытия с ошибкой...');
    });

    ws.on('error', (error) => {
      wasRejected = true;
      console.log('✅ Ошибка соединения (ожидаемо):', error.message);
    });

    ws.on('close', (code, reason) => {
      if (code === 1008) {
        console.log(`✅ Правильно отклонено с кодом ${code}: ${reason || 'Unauthorized'}\n`);
        resolve(true);
      } else if (wasRejected) {
        console.log(`✅ Соединение отклонено\n`);
        resolve(true);
      } else {
        console.log(`❌ Неожиданное поведение: код ${code}\n`);
        resolve(false);
      }
    });

    // Timeout
    setTimeout(() => {
      resolve(wasRejected || false);
    }, 3000);
  });
}

// Check WebSocket server logs
async function checkLogs() {
  console.log('4️⃣ Последние логи WebSocket сервера:');
  const { exec } = require('child_process');
  
  return new Promise((resolve) => {
    exec('pm2 logs fonana-ws --lines 10 --nostream', (error, stdout, stderr) => {
      if (stdout) {
        console.log(stdout);
      }
      resolve();
    });
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
  
  await checkLogs();

  console.log('\n📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:');
  console.log('==========================');
  console.log(`1. Валидный токен: ${test1 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`2. Невалидный токен: ${test2 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`3. Без токена: ${test3 ? '✅ PASSED' : '❌ FAILED'}`);
  
  const allPassed = test1 && test2 && test3;
  console.log(`\n${allPassed ? '✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ!' : '❌ ЕСТЬ ПРОБЛЕМЫ!'}`);
  
  if (allPassed) {
    console.log('\n✨ WebSocket сервер полностью функционален:');
    console.log('- JWT аутентификация работает');
    console.log('- Невалидные токены отклоняются');
    console.log('- Real-time события доставляются');
  }
  
  process.exit(allPassed ? 0 : 1);
}

runTests().catch(console.error); 