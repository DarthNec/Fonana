const { Server } = require('socket.io');
const { createServer } = require('http');
const { createServer: createHttpsServer } = require('https');
const fs = require('fs');
const path = require('path');
const { publishToChannel, subscribeToChannel, isAvailable: isRedisAvailable } = require('./redis');

// Хранилище активных соединений
const connections = new Map();

function createSocketIOServer(port) {
  // Определяем тип сервера (HTTP или HTTPS)
  const isProduction = process.env.NODE_ENV === 'production';
  let httpServer;
  
  if (isProduction) {
    // В production пытаемся использовать HTTPS
    try {
      // Ищем SSL сертификаты
      const certPath = path.join(__dirname, '../../ssl/cert.pem');
      const keyPath = path.join(__dirname, '../../ssl/key.pem');
      
      if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        console.log('🔒 Using HTTPS server with SSL certificates');
        const options = {
          cert: fs.readFileSync(certPath),
          key: fs.readFileSync(keyPath)
        };
        httpServer = createHttpsServer(options, requestHandler);
      } else {
        console.log('⚠️  SSL certificates not found, falling back to HTTP');
        httpServer = createServer(requestHandler);
      }
    } catch (error) {
      console.log('⚠️  HTTPS setup failed, falling back to HTTP:', error.message);
      httpServer = createServer(requestHandler);
    }
  } else {
    // В development используем HTTP
    httpServer = createServer(requestHandler);
  }
  
  function requestHandler(req, res) {
    // Обработка POST /notify-ai-post/
    if (req.method === 'POST' && req.url === '/notify-ai-post/') {
      let body = '';
      
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', () => {
        try {
          const { userId, postId, status } = JSON.parse(body);
          
          if (!userId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: false, 
              error: 'userId is required' 
            }));
            return;
          }
          
          // Находим сокет пользователя
          const socket = connections.get(userId);
          
          if (socket && socket.connected) {
            // Отправляем событие на сокет
            socket.emit('ai-post-updated', {
              postId,
              status,
              timestamp: new Date().toISOString()
            });
            
            console.log(`✅ Sent ai-post-updated to user ${userId} (Socket: ${socket.id})`);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: true, 
              message: `Event sent to user ${userId}`,
              socketId: socket.id
            }));
          } else {
            console.log(`⚠️  User ${userId} not connected or socket closed`);
            
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: false, 
              error: `User ${userId} not connected` 
            }));
          }
        } catch (error) {
          console.error('❌ Error processing notify-ai-post:', error);
          
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: error.message 
          }));
        }
      });
      
      return;
    }
    
    // Для других запросов возвращаем 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
  
  // Создаем Socket.IO сервер с CORS настройками
  const io = new Server(httpServer, {
    cors: {
      origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://fonana.me',
        'https://www.fonana.me',
        'https://64.20.37.222:3004' // Добавляем IP для fallback
      ],
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
  });
  
  // Middleware для получения данных пользователя от клиента
  io.use(async (socket, next) => {
    try {
      // Получаем объект пользователя напрямую от клиента
      const userData = socket.handshake.auth.user || socket.handshake.query.user;
      
      // Если пользователь передан, парсим его (если это строка)
      let user = null;
      if (userData) {
        try {
          user = typeof userData === 'string' ? JSON.parse(userData) : userData;
        } catch (e) {
          console.error('⚠️  Failed to parse user data:', e.message);
        }
      }
      
      if (!user || !user.id) {
        console.log('❌ No user data provided - connection rejected');
        return next(new Error('Authentication required: user data must be provided'));
      }
      
      // Пользователь передан клиентом
      socket.userId = user.id;
      socket.user = user;
      
      console.log(`✅ User ${user.id} (${user.nickname || 'Unknown'}) connected`);
      
      next();
    } catch (error) {
      console.error('❌ Error in auth middleware, connection rejected:', error);
      return next(new Error('Authentication error: ' + error.message));
    }
  });
  
  // Обработка подключений
  io.on('connection', (socket) => {
    const userId = socket.userId;
    const user = socket.user;
    
    console.log(`🔌 User ${userId} connected (Socket ID: ${socket.id})`);
    
    // Сохраняем соединение
    connections.set(userId, socket);
    
    // Отправляем приветственное сообщение
    socket.emit('connected', {
      userId: userId,
      message: 'Successfully connected to Socket.IO server'
    });
    
    // Подписка на канал
    socket.on('subscribe', (channel) => {
      try {
        const channelKey = getChannelKey(channel);
        console.log(`🔔 User ${userId} subscribing to: ${channelKey}`);
        
        // Присоединяемся к комнате Socket.IO
        socket.join(channelKey);
        
        socket.emit('subscribed', {
          channel: channelKey,
          success: true
        });
        
        console.log(`✅ User ${userId} subscribed to ${channelKey}`);
      } catch (error) {
        console.error('❌ Subscribe error:', error);
        socket.emit('error', {
          message: 'Failed to subscribe',
          error: error.message
        });
      }
    });
    
    // Отписка от канала
    socket.on('unsubscribe', (channel) => {
      try {
        const channelKey = getChannelKey(channel);
        console.log(`🔕 User ${userId} unsubscribing from: ${channelKey}`);
        
        socket.leave(channelKey);
        
        socket.emit('unsubscribed', {
          channel: channelKey,
          success: true
        });
        
        console.log(`✅ User ${userId} unsubscribed from ${channelKey}`);
      } catch (error) {
        console.error('❌ Unsubscribe error:', error);
        socket.emit('error', {
          message: 'Failed to unsubscribe',
          error: error.message
        });
      }
    });
    
    // Ping-Pong для проверки соединения
    socket.on('ping', () => {
      socket.emit('pong');
    });
    
    // Обработка отключения
    socket.on('disconnect', (reason) => {
      console.log(`🔌 User ${userId} disconnected (Reason: ${reason})`);
      connections.delete(userId);
    });
    
    // Обработка ошибок
    socket.on('error', (error) => {
      console.error(`❌ Socket error for user ${userId}:`, error);
    });
  });
  
  // Инициализация Redis подписок (если доступен)
  if (isRedisAvailable()) {
    initRedisSubscriptions(io);
  }
  
  // Запускаем HTTP сервер
  httpServer.listen(port);
  
  return io;
}

// Инициализация Redis подписок
function initRedisSubscriptions(io) {
  subscribeToChannel('socketio:*', (event) => {
    const channel = event.channel || event.type;
    
    // Отправляем событие всем клиентам в комнате
    io.to(channel).emit(event.type, event);
    
    console.log(`📨 Relayed Redis event to room: ${channel}`);
  });
  
  console.log('📡 Redis subscriptions initialized');
}

// Получение ключа канала
function getChannelKey(channel) {
  if (typeof channel === 'string') {
    return channel;
  }
  
  switch (channel.type) {
    case 'creator':
      return `creator_${channel.id}`;
    case 'notifications':
      return `notifications_${channel.userId}`;
    case 'feed':
      return `feed_${channel.userId}`;
    case 'post':
      return `post_${channel.postId}`;
    default:
      return `unknown_${JSON.stringify(channel)}`;
  }
}

// Отправка события конкретному пользователю
function sendToUser(io, userId, event) {
  console.log(`👤 Sending to user ${userId}:`, event.type);
  
  const socket = connections.get(userId);
  
  if (socket && socket.connected) {
    socket.emit(event.type, event);
    return true;
  }
  
  console.log(`❌ User ${userId} not connected`);
  return false;
}

// Broadcast события в канал/комнату
function broadcastToChannel(io, channel, event) {
  const channelKey = typeof channel === 'string' ? channel : getChannelKey(channel);
  
  console.log(`📢 Broadcasting to channel ${channelKey}:`, event.type);
  
  // Если Redis доступен, публикуем событие
  if (isRedisAvailable()) {
    publishToChannel(`socketio:${channelKey}`, event);
  }
  
  // Отправляем локально
  io.to(channelKey).emit(event.type, event);
}

module.exports = {
  createSocketIOServer,
  sendToUser,
  broadcastToChannel,
  connections
};

