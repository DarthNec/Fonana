const WebSocket = require('ws');
const { createToken } = require('./src/auth');

// Тестовые данные
const TEST_USER_ID = 'cmcceumg7001iyjleslvczux6'; // Реальный ID из БД
const WS_URL = 'ws://localhost:3002';

async function testWebSocketServer() {
  console.log('🧪 Starting WebSocket test...\n');
  
  // Создаем тестовый токен
  const token = createToken(TEST_USER_ID);
  console.log(`🔑 Generated test token for user ${TEST_USER_ID}`);
  
  // Подключаемся к серверу
  const ws = new WebSocket(`${WS_URL}?token=${token}`);
  
  ws.on('open', () => {
    console.log('✅ Connected to WebSocket server\n');
    
    // Тест 1: Подписка на уведомления
    console.log('📝 Test 1: Subscribe to notifications');
    ws.send(JSON.stringify({
      type: 'subscribe',
      channel: {
        type: 'notifications',
        userId: TEST_USER_ID
      }
    }));
    
    // Тест 2: Подписка на ленту
    setTimeout(() => {
      console.log('\n📝 Test 2: Subscribe to feed');
      ws.send(JSON.stringify({
        type: 'subscribe',
        channel: {
          type: 'feed',
          userId: TEST_USER_ID
        }
      }));
    }, 1000);
    
    // Тест 3: Ping-pong
    setTimeout(() => {
      console.log('\n📝 Test 3: Ping-pong');
      ws.send(JSON.stringify({ type: 'ping' }));
    }, 2000);
    
    // Тест 4: Неправильная подписка
    setTimeout(() => {
      console.log('\n📝 Test 4: Invalid subscription (wrong user)');
      ws.send(JSON.stringify({
        type: 'subscribe',
        channel: {
          type: 'notifications',
          userId: 'wrong-user-id'
        }
      }));
    }, 3000);
    
    // Закрываем соединение через 5 секунд
    setTimeout(() => {
      console.log('\n🔌 Closing connection...');
      ws.close();
    }, 5000);
  });
  
  ws.on('message', (data) => {
    const message = JSON.parse(data);
    console.log('📨 Received:', JSON.stringify(message, null, 2));
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
  
  ws.on('close', (code, reason) => {
    console.log(`\n🔌 Connection closed. Code: ${code}, Reason: ${reason}`);
    process.exit(0);
  });
}

// Запуск теста
testWebSocketServer().catch(console.error); 