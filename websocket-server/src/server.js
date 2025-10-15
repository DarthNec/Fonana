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
  try {
    // Проверяем query параметр
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const queryToken = url.searchParams.get('token');
    if (queryToken) {
      console.log('📎 Token found in query params');
      return queryToken;
    }
  } catch (error) {
    console.error('⚠️  Error parsing URL:', error.message);
  }
  
  // Проверяем заголовок Authorization
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    console.log('📎 Token found in Authorization header');
    return authHeader.substring(7);
  }
  
  console.log('⚠️  No token found in request');
  return null;
}

// Отправка события конкретному пользователю
function sendToUser(userId, event) {
  console.log(`👤 [sendToUser] Attempting to send to user: ${userId}`);
  console.log(`👤 [sendToUser] Event type: ${event.type}`);
  console.log(`👤 [sendToUser] Total connections: ${connections.size}`);
  
  const ws = connections.get(userId);
  
  if (!ws) {
    console.log(`❌ [sendToUser] User ${userId} not found in connections`);
    return false;
  }
  
  console.log(`👤 [sendToUser] User ${userId} connection found, readyState: ${ws.readyState}`);
  
  if (ws.readyState === WebSocket.OPEN) {
    const payload = JSON.stringify(event);
    console.log(`✅ [sendToUser] Sending to user ${userId}:`, payload.substring(0, 200) + '...');
    ws.send(payload);
    return true;
  }
  
  console.log(`❌ [sendToUser] Connection not open for user ${userId}, state: ${ws.readyState}`);
  return false;
}

// Отправка события всем подписчикам канала
function broadcastToSubscribers(channel, event) {
  let count = 0;
  const channelKey = getChannelKey(channel);
  
  console.log(`📢 [broadcastToSubscribers] Channel:`, channelKey);
  console.log(`📢 [broadcastToSubscribers] Event type:`, event.type);
  console.log(`📢 [broadcastToSubscribers] Total connections:`, connections.size);
  
  // Если Redis доступен, публикуем событие для других серверов
  if (isRedisAvailable()) {
    publishToChannel(`ws:${channelKey}`, event);
  }
  
  // Логируем все подключения и их подписки
  connections.forEach((ws, userId) => {
    const subscriptions = Array.from(ws.subscriptions || new Set());
    console.log(`  👥 User ${userId}: subscriptions =`, subscriptions);
    console.log(`  👥 Has channel ${channelKey}?`, ws.subscriptions?.has(channelKey));
    console.log(`  👥 ReadyState:`, ws.readyState);
    
    if (ws.subscriptions.has(channelKey) && ws.readyState === WebSocket.OPEN) {
      const payload = JSON.stringify(event);
      console.log(`  ✅ Sending to ${userId}:`, payload.substring(0, 150) + '...');
      ws.send(payload);
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