const { prisma } = require('../db');
const { sendToUser, broadcastToSubscribers } = require('../server');
const { publishEvent } = require('../redis');

// Отправка нового уведомления
async function sendNotification(userId, notification) {
  try {
    // Создаем уведомление в БД
    const newNotification = await prisma.notification.create({
      data: {
        userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata || {}
      }
    });
    
    // Формируем событие
    const event = {
      type: 'notification',
      userId,
      notification: newNotification
    };
    
    // Отправляем напрямую пользователю если он онлайн
    const sent = sendToUser(userId, event);
    
    // Публикуем в Redis для других серверов
    await publishEvent(
      { type: 'notifications', userId },
      event
    );
    
    console.log(`📬 Notification sent to ${userId}: ${notification.title}`);
    return newNotification;
    
  } catch (error) {
    console.error('❌ Failed to send notification:', error);
    throw error;
  }
}

// Пометка уведомления как прочитанного
async function markNotificationAsRead(userId, notificationId) {
  try {
    // Обновляем в БД
    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });
    
    // Формируем событие
    const event = {
      type: 'notification_read',
      userId,
      notificationId
    };
    
    // Отправляем пользователю
    sendToUser(userId, event);
    
    // Публикуем в Redis
    await publishEvent(
      { type: 'notifications', userId },
      event
    );
    
    console.log(`✅ Notification ${notificationId} marked as read`);
    
  } catch (error) {
    console.error('❌ Failed to mark notification as read:', error);
  }
}

// Очистка всех уведомлений
async function clearNotifications(userId) {
  try {
    // Помечаем все как прочитанные
    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: { isRead: true }
    });
    
    // Формируем событие
    const event = {
      type: 'notifications_cleared',
      userId
    };
    
    // Отправляем пользователю
    sendToUser(userId, event);
    
    // Публикуем в Redis
    await publishEvent(
      { type: 'notifications', userId },
      event
    );
    
    console.log(`🧹 All notifications cleared for user ${userId}`);
    
  } catch (error) {
    console.error('❌ Failed to clear notifications:', error);
  }
}

module.exports = {
  sendNotification,
  markNotificationAsRead,
  clearNotifications
}; 