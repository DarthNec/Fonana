const { prisma } = require('./db');

// Проверка прав доступа к каналу
async function canAccessChannel(user, channel) {
  switch (channel.type) {
    case 'notifications':
      // Пользователь может подписаться только на свои уведомления
      return channel.userId === user.id;
      
    case 'feed':
      // Пользователь может подписаться только на свою ленту
      return channel.userId === user.id;
      
    case 'creator':
      // Любой может подписаться на обновления создателя
      return true;
      
    case 'post':
      // Проверяем доступ к посту
      if (!channel.postId) return false;
      
      const post = await prisma.post.findUnique({
        where: { id: channel.postId },
        select: {
          id: true,
          creatorId: true,
          isLocked: true,
          minSubscriptionTier: true
        }
      });
      
      if (!post) return false;
      
      // Автор всегда имеет доступ
      if (post.creatorId === user.id) return true;
      
      // Открытые посты доступны всем
      if (!post.isLocked && !post.minSubscriptionTier) return true;
      
      // Для закрытых постов проверяем подписку
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId: user.id,
          creatorId: post.creatorId,
          isActive: true,
          paymentStatus: 'COMPLETED'
        }
      });
      
      return !!subscription;
      
    default:
      return false;
  }
}

// Обработка подписки на канал
async function handleSubscribe(ws, channel) {
  try {
    // Проверяем права доступа
    const hasAccess = await canAccessChannel(ws.user, channel);
    
    if (!hasAccess) {
      ws.send(JSON.stringify({
        type: 'error',
        data: {
          message: 'Access denied to channel',
          channel
        }
      }));
      return;
    }
    
    const channelKey = getChannelKey(channel);
    
    // Добавляем подписку
    ws.subscriptions.add(channelKey);
    
    console.log(`✅ User ${ws.userId} subscribed to ${channelKey}`);
    
    // Подтверждаем подписку
    ws.send(JSON.stringify({
      type: 'subscribed',
      data: {
        channel,
        channelKey
      }
    }));
    
    // Если это канал уведомлений, отправляем непрочитанные
    if (channel.type === 'notifications') {
      await sendUnreadNotifications(ws);
    }
    
  } catch (error) {
    console.error('❌ Subscribe error:', error);
    ws.send(JSON.stringify({
      type: 'error',
      data: {
        message: 'Failed to subscribe',
        channel
      }
    }));
  }
}

// Обработка отписки от канала
function handleUnsubscribe(ws, channel) {
  const channelKey = getChannelKey(channel);
  
  if (ws.subscriptions.has(channelKey)) {
    ws.subscriptions.delete(channelKey);
    console.log(`✅ User ${ws.userId} unsubscribed from ${channelKey}`);
    
    // Подтверждаем отписку
    ws.send(JSON.stringify({
      type: 'unsubscribed',
      data: {
        channel,
        channelKey
      }
    }));
  }
}

// Генерация ключа канала
function getChannelKey(channel) {
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

// Отправка непрочитанных уведомлений
async function sendUnreadNotifications(ws) {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: ws.userId,
        isRead: false
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });
    
    if (notifications.length > 0) {
      ws.send(JSON.stringify({
        type: 'unread_notifications',
        data: {
          notifications,
          count: notifications.length
        }
      }));
    }
  } catch (error) {
    console.error('❌ Failed to send unread notifications:', error);
  }
}

module.exports = {
  handleSubscribe,
  handleUnsubscribe,
  getChannelKey,
  canAccessChannel
}; 