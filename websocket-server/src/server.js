const WebSocket = require('ws');
const { verifyToken } = require('./auth');
const { handleSubscribe, handleUnsubscribe, getChannelKey } = require('./channels');
const { publishToChannel, subscribeToChannel, isAvailable: isRedisAvailable } = require('./redis');
const { logEvent } = require('./monitoring');

// Хранилище активных соединений
const connections = new Map();

function createWebSocketServer(port) {
  const wss = new WebSocket.Server({ port });
  
  // Инициализируем Redis подписки для получения событий от других серверов
  if (isRedisAvailable()) {
    initRedisSubscriptions();
  }
  
  wss.on('connection', async (ws, req) => {
    console.log('🔌 New connection attempt');
    
    // Извлекаем токен из query параметров или заголовков
    const token = extractToken(req);
    
    if (!token) {
      console.log('❌ No token provided');
      logEvent('auth_failure', { reason: 'no_token', ip: req.socket.remoteAddress });
      ws.close(1008, 'Unauthorized');
      return;
    }
    
    // Проверяем токен
    const user = await verifyToken(token);
    
    if (!user) {
      console.log('❌ Invalid token');
      logEvent('auth_failure', { reason: 'invalid_token', ip: req.socket.remoteAddress });
      ws.close(1008, 'Unauthorized');
      return;
    }
    
    console.log(`✅ User ${user.id} authenticated`);
    
    // Сохраняем информацию о подключении
    ws.userId = user.id;
    ws.user = user;
    ws.subscriptions = new Set();
    ws.isAlive = true;
    
    // Добавляем в map активных соединений
    connections.set(user.id, ws);
    
    // Логируем успешное подключение
    logEvent('connection', {
      userId: user.id,
      nickname: user.nickname,
      isCreator: user.isCreator,
      ip: req.socket.remoteAddress
    });
    
    // Отправляем приветственное сообщение
    ws.send(JSON.stringify({
      type: 'connected',
      data: {
        userId: user.id,
        message: 'Successfully connected to WebSocket server'
      }
    }));
    
    // Обработка входящих сообщений
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        console.log(`📨 Received from ${user.id}:`, data.type);
        
        // Логируем сообщение
        logEvent('message', {
          userId: user.id,
          messageType: data.type
        });
        
        switch(data.type) {
          case 'subscribe':
            await handleSubscribe(ws, data.channel);
            logEvent('channel_subscribe', {
              userId: user.id,
              channel: getChannelKey(data.channel)
            });
            break;
            
          case 'unsubscribe':
            handleUnsubscribe(ws, data.channel);
            logEvent('channel_unsubscribe', {
              userId: user.id,
              channel: getChannelKey(data.channel)
            });
            break;
            
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
            
          default:
            console.log(`⚠️  Unknown message type: ${data.type}`);
        }
      } catch (error) {
        console.error('❌ Error processing message:', error);
        logEvent('error', {
          userId: user.id,
          error: error.message,
          type: 'message_processing'
        });
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Invalid message format' }
        }));
      }
    });
    
    // Обработка закрытия соединения
    ws.on('close', () => {
      console.log(`🔌 User ${user.id} disconnected`);
      
      // Логируем отключение
      logEvent('disconnect', {
        userId: user.id,
        nickname: user.nickname
      });
      
      // Удаляем из активных соединений
      connections.delete(user.id);
      
      // Очищаем подписки
      ws.subscriptions.clear();
    });
    
    // Обработка ошибок
    ws.on('error', (error) => {
      console.error(`❌ WebSocket error for user ${user.id}:`, error);
    });
    
    // Heartbeat для проверки соединения
    ws.on('pong', () => {
      ws.isAlive = true;
    });
  });
  
  // Периодическая проверка живых соединений
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        console.log(`💔 Terminating dead connection for user ${ws.userId}`);
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  
  wss.on('close', () => {
    clearInterval(interval);
  });
  
  return wss;
}

// Инициализация Redis подписок
function initRedisSubscriptions() {
  // Подписываемся на все WebSocket каналы
  subscribeToChannel('ws:*', (event) => {
    // Получаем название канала из Redis события
    const channel = event.channel || event.type;
    
    // Отправляем событие локальным подписчикам
    let count = 0;
    connections.forEach((ws) => {
      if (ws.subscriptions && ws.readyState === WebSocket.OPEN) {
        // Проверяем, подписан ли клиент на этот канал
        for (const subscription of ws.subscriptions) {
          if (subscription.includes(channel)) {
            ws.send(JSON.stringify(event));
            count++;
            break;
          }
        }
      }
    });
    
    if (count > 0) {
      console.log(`📨 Relayed Redis event to ${count} local clients`);
    }
  });
  
  console.log('📡 Redis subscriptions initialized');
}

// Извлечение токена из запроса
function extractToken(req) {
  // Проверяем query параметр
  const url = new URL(req.url, `http://${req.headers.host}`);
  const queryToken = url.searchParams.get('token');
  if (queryToken) return queryToken;
  
  // Проверяем заголовок Authorization
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}

// Отправка события конкретному пользователю
function sendToUser(userId, event) {
  const ws = connections.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(event));
    return true;
  }
  return false;
}

// Отправка события всем подписчикам канала
function broadcastToSubscribers(channel, event) {
  let count = 0;
  const channelKey = getChannelKey(channel);
  
  // Если Redis доступен, публикуем событие для других серверов
  if (isRedisAvailable()) {
    publishToChannel(`ws:${channelKey}`, event);
  }
  
  // Отправляем событие локальным подписчикам
  connections.forEach((ws) => {
    if (ws.subscriptions.has(channelKey) && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
      count++;
    }
  });
  
  console.log(`📢 Broadcasted to ${count} local subscribers of ${channelKey}`);
  return count;
}

module.exports = {
  createWebSocketServer,
  sendToUser,
  broadcastToSubscribers,
  connections
}; 