const { sendToUser } = require('../server');
const { publishEvent } = require('../redis');

// Обновление ленты пользователя
async function updateUserFeed(userId, posts) {
  try {
    const event = {
      type: 'feed_update',
      userId,
      posts
    };
    
    // Отправляем напрямую пользователю
    sendToUser(userId, event);
    
    // Публикуем в Redis
    await publishEvent(
      { type: 'feed', userId },
      event
    );
    
    console.log(`📰 Feed updated for user ${userId}`);
    
  } catch (error) {
    console.error('❌ Failed to update feed:', error);
  }
}

module.exports = {
  updateUserFeed
}; 