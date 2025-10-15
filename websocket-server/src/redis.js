const Redis = require('ioredis');

let redis = null;
let subscriber = null;

function initRedis() {
  try {
    // Создаем основное подключение
    redis = new Redis({
      host: '64.20.37.222',
      port: 6379,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      }
    });
    
    // Создаем подписчика для pub/sub
    subscriber = new Redis({
      host: '64.20.37.222',
      port: 6379
    });
    
    redis.on('connect', () => {
      console.log('✅ Redis connected');
    });
    
    redis.on('error', (err) => {
      console.error('❌ Redis connection error:', err);
    });
    
    subscriber.on('connect', () => {
      console.log('✅ Redis subscriber connected');
    });
    
    subscriber.on('error', (err) => {
      console.error('❌ Redis subscriber error:', err);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Redis initialization failed:', error);
    return false;
  }
}

// Публикация события в канал
async function publishToChannel(channel, event) {
  if (!redis) {
    console.log('⚠️  Redis not available, skipping publish');
    return false;
  }
  
  try {
    await redis.publish(channel, JSON.stringify(event));
    console.log(`📢 Published to Redis channel: ${channel}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to publish to channel ${channel}:`, error);
    return false;
  }
}

// Подписка на канал
function subscribeToChannel(channel, callback) {
  if (!subscriber) {
    console.log('⚠️  Redis subscriber not available');
    return false;
  }
  
  subscriber.subscribe(channel, (err) => {
    if (err) {
      console.error(`❌ Failed to subscribe to channel ${channel}:`, err);
      return false;
    }
    console.log(`📡 Subscribed to Redis channel: ${channel}`);
  });
  
  subscriber.on('message', (receivedChannel, message) => {
    if (receivedChannel === channel) {
      try {
        const data = JSON.parse(message);
        callback(data);
      } catch (error) {
        console.error('❌ Failed to parse Redis message:', error);
      }
    }
  });
  
  return true;
}

// Отписка от канала
function unsubscribeFromChannel(channel) {
  if (!subscriber) return;
  
  subscriber.unsubscribe(channel, (err) => {
    if (err) {
      console.error(`❌ Failed to unsubscribe from channel ${channel}:`, err);
    } else {
      console.log(`📡 Unsubscribed from Redis channel: ${channel}`);
    }
  });
}

// Сохранение данных с TTL
async function setWithTTL(key, value, ttl = 3600) {
  if (!redis) return false;
  
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`❌ Failed to set key ${key}:`, error);
    return false;
  }
}

// Получение данных
async function get(key) {
  if (!redis) return null;
  
  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`❌ Failed to get key ${key}:`, error);
    return null;
  }
}

// Удаление данных
async function del(key) {
  if (!redis) return false;
  
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error(`❌ Failed to delete key ${key}:`, error);
    return false;
  }
}

// Проверка доступности Redis
function isAvailable() {
  return redis && redis.status === 'ready';
}

module.exports = {
  initRedis,
  publishToChannel,
  subscribeToChannel,
  unsubscribeFromChannel,
  setWithTTL,
  get,
  del,
  isAvailable,
  // Для доступа к raw клиентам если нужно
  getRedisClient: () => redis,
  getSubscriberClient: () => subscriber
}; 