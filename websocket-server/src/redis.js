const { createClient } = require('redis');

let redisClient;
let pubClient;
let subClient;

async function connectRedis() {
  try {
    // Создаем клиенты для pub/sub
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    // Основной клиент
    redisClient = createClient({ url: redisUrl });
    
    // Publisher клиент
    pubClient = createClient({ url: redisUrl });
    
    // Subscriber клиент
    subClient = createClient({ url: redisUrl });
    
    // Подключаемся
    await redisClient.connect();
    await pubClient.connect();
    await subClient.connect();
    
    console.log('✅ Redis connected');
    
    // Обработка ошибок
    redisClient.on('error', (err) => console.error('❌ Redis Client Error', err));
    pubClient.on('error', (err) => console.error('❌ Redis Pub Error', err));
    subClient.on('error', (err) => console.error('❌ Redis Sub Error', err));
    
    // Подписываемся на канал событий WebSocket
    await subClient.subscribe('ws:events', handleRedisMessage);
    
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    // Продолжаем работу без Redis (single server mode)
    console.log('⚠️  Running in single server mode without Redis');
  }
}

// Обработка сообщений из Redis
async function handleRedisMessage(message) {
  try {
    const event = JSON.parse(message);
    const { broadcastToSubscribers } = require('./server');
    
    console.log(`📨 Redis event: ${event.type}`);
    
    // Рассылаем событие подписчикам
    broadcastToSubscribers(event.channel, event);
    
  } catch (error) {
    console.error('❌ Error handling Redis message:', error);
  }
}

// Публикация события в Redis
async function publishEvent(channel, event) {
  if (!pubClient) {
    console.log('⚠️  Redis not connected, skipping publish');
    return;
  }
  
  try {
    const message = JSON.stringify({
      ...event,
      channel,
      timestamp: new Date().toISOString()
    });
    
    await pubClient.publish('ws:events', message);
    console.log(`📤 Published to Redis: ${event.type}`);
    
  } catch (error) {
    console.error('❌ Failed to publish to Redis:', error);
  }
}

// Сохранение данных в Redis
async function setCache(key, value, ttl = 3600) {
  if (!redisClient) return;
  
  try {
    await redisClient.set(key, JSON.stringify(value), {
      EX: ttl
    });
  } catch (error) {
    console.error('❌ Redis set error:', error);
  }
}

// Получение данных из Redis
async function getCache(key) {
  if (!redisClient) return null;
  
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('❌ Redis get error:', error);
    return null;
  }
}

// Удаление данных из Redis
async function deleteCache(key) {
  if (!redisClient) return;
  
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error('❌ Redis delete error:', error);
  }
}

// Закрытие соединений
async function disconnectRedis() {
  try {
    if (redisClient) await redisClient.quit();
    if (pubClient) await pubClient.quit();
    if (subClient) await subClient.quit();
    console.log('✅ Redis disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting Redis:', error);
  }
}

module.exports = {
  connectRedis,
  disconnectRedis,
  publishEvent,
  setCache,
  getCache,
  deleteCache
}; 