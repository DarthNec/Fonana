const Redis = require('ioredis');

let publisher = null;
let subscriber = null;
let isRedisConnected = false;

function initRedis() {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.log('⚠️  No REDIS_URL found, running without Redis');
    return false;
  }
  
  try {
    publisher = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          console.log('❌ Redis connection failed after 3 attempts');
          return null;
        }
        return Math.min(times * 200, 2000);
      }
    });
    
    subscriber = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          return null;
        }
        return Math.min(times * 200, 2000);
      }
    });
    
    publisher.on('connect', () => {
      console.log('✅ Redis publisher connected');
      isRedisConnected = true;
    });
    
    subscriber.on('connect', () => {
      console.log('✅ Redis subscriber connected');
    });
    
    publisher.on('error', (err) => {
      console.error('❌ Redis publisher error:', err.message);
      isRedisConnected = false;
    });
    
    subscriber.on('error', (err) => {
      console.error('❌ Redis subscriber error:', err.message);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Redis:', error);
    return false;
  }
}

async function publishToChannel(channel, event) {
  if (!isRedisConnected || !publisher) {
    return false;
  }
  
  try {
    const message = JSON.stringify(event);
    await publisher.publish(channel, message);
    return true;
  } catch (error) {
    console.error('❌ Failed to publish to Redis:', error);
    return false;
  }
}

function subscribeToChannel(pattern, callback) {
  if (!isRedisConnected || !subscriber) {
    return false;
  }
  
  try {
    // Подписываемся на паттерн
    subscriber.psubscribe(pattern);
    
    subscriber.on('pmessage', (pattern, channel, message) => {
      try {
        const event = JSON.parse(message);
        event.channel = channel;
        callback(event);
      } catch (error) {
        console.error('❌ Failed to parse Redis message:', error);
      }
    });
    
    return true;
  } catch (error) {
    console.error('❌ Failed to subscribe to Redis channel:', error);
    return false;
  }
}

function isAvailable() {
  return isRedisConnected;
}

module.exports = {
  initRedis,
  publishToChannel,
  subscribeToChannel,
  isAvailable
};

