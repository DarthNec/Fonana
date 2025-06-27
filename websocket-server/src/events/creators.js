const { broadcastToSubscribers } = require('../server');
const { publishEvent } = require('../redis');

// Обновление профиля создателя
async function notifyCreatorUpdate(creatorId, updates) {
  try {
    const event = {
      type: 'creator_updated',
      creatorId,
      data: updates
    };
    
    // Рассылаем всем подписчикам создателя
    broadcastToSubscribers(
      { type: 'creator', id: creatorId },
      event
    );
    
    // Публикуем в Redis
    await publishEvent(
      { type: 'creator', id: creatorId },
      event
    );
    
    console.log(`👤 Creator ${creatorId} profile updated`);
    
  } catch (error) {
    console.error('❌ Failed to notify creator update:', error);
  }
}

// Новая подписка
async function notifyNewSubscription(creatorId, userId) {
  try {
    const event = {
      type: 'new_subscription',
      creatorId,
      userId
    };
    
    // Уведомляем создателя (если он онлайн)
    broadcastToSubscribers(
      { type: 'creator', id: creatorId },
      event
    );
    
    // Публикуем в Redis
    await publishEvent(
      { type: 'creator', id: creatorId },
      event
    );
    
    console.log(`🎉 New subscription: ${userId} → ${creatorId}`);
    
  } catch (error) {
    console.error('❌ Failed to notify new subscription:', error);
  }
}

module.exports = {
  notifyCreatorUpdate,
  notifyNewSubscription
}; 