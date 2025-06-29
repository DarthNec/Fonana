#!/usr/bin/env node

const WebSocket = require('ws');
const fetch = require('node-fetch');

console.log('🔍 Local WebSocket JWT Test\n');

// Тестовый кошелек
const testWallet = 'DUxkXhMWuo76ofUMtFRZtL8zmVqQnb8twLeB5NcaM4cG';

async function testWebSocket() {
  try {
    // 1. Получаем JWT токен через localhost
    console.log('🔑 Getting JWT token...');
    const tokenResponse = await fetch('http://localhost:3000/api/auth/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: testWallet })
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`API error: ${tokenResponse.status} - ${error}`);
    }
    
    const { token, user } = await tokenResponse.json();
    console.log('✅ JWT token received');
    console.log(`   User: ${user.nickname || user.id}`);
    console.log(`   Token: ${token.substring(0, 50)}...`);
    
    // 2. Подключаемся к WebSocket с токеном
    console.log('\n🔌 Connecting to WebSocket...');
    const ws = new WebSocket('ws://localhost:3002', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Обработчики событий
    ws.on('open', () => {
      console.log('✅ WebSocket connected successfully!');
      
      // Подписываемся на канал пользователя
      const subscribeMsg = JSON.stringify({
        type: 'subscribe',
        channel: `user:${user.id}`
      });
      ws.send(subscribeMsg);
      console.log('📤 Subscribed to user channel');
      
      // Отправляем тестовое сообщение
      setTimeout(() => {
        const testMsg = JSON.stringify({
          type: 'ping',
          timestamp: new Date().toISOString()
        });
        ws.send(testMsg);
        console.log('📤 Sent test ping');
      }, 1000);
    });
    
    ws.on('message', (data) => {
      console.log('📥 Received:', data.toString());
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
    });
    
    ws.on('close', (code, reason) => {
      console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
      if (code === 1008) {
        console.log('❌ Authentication failed - JWT token rejected');
      }
    });
    
    // Закрываем через 5 секунд
    setTimeout(() => {
      console.log('\n🏁 Test completed, closing connection...');
      ws.close();
      process.exit(0);
    }, 5000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Запускаем тест
testWebSocket(); 