const { Server } = require('socket.io');
const { createServer } = require('http');
const { publishToChannel, subscribeToChannel, isAvailable: isRedisAvailable } = require('./redis');

// Хранилище активных соединений
const connections = new Map();

function createSocketIOServer(port) {
  // Создаем HTTP сервер
  const httpServer = createServer();
  
  // Создаем Socket.IO сервер с CORS настройками
  const io = new Server(httpServer, {
    cors: {
      origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://fonana.me',
        'https://www.fonana.me'
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
        console.log('⚠️  No user data provided - connecting as anonymous');
        // Анонимное подключение
        socket.userId = `anonymous_${socket.id}`;
        socket.user = { id: socket.userId, nickname: 'Anonymous' };
        socket.isAnonymous = true;
      } else {
        // Пользователь передан клиентом
        socket.userId = user.id;
        socket.user = user;
        socket.isAnonymous = false;
        
        console.log(`✅ User ${user.id} (${user.nickname || 'Unknown'}) connected`);
      }
      
      next();
    } catch (error) {
      console.error('⚠️  Error in auth middleware, allowing anonymous connection:', error);
      // При любой ошибке - анонимное подключение
      socket.userId = `anonymous_${socket.id}`;
      socket.user = { id: socket.userId, nickname: 'Anonymous' };
      socket.isAnonymous = true;
      next();
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

