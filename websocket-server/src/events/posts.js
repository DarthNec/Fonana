const { prisma } = require('../db');
const { sendToUser, broadcastToSubscribers } = require('../server');
const { publishToChannel } = require('../redis'); // Исправленный импорт

// Обновление лайков поста
async function updatePostLikes(postId, userId, isLiked) {
  try {
    // Получаем актуальное количество лайков
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { likesCount: true }
    });
    
    if (!post) return;
    
    // Формируем событие
    const event = {
      type: isLiked ? 'post_liked' : 'post_unliked',
      postId,
      userId,
      likesCount: post.likesCount
    };
    
    // Рассылаем всем подписчикам поста
    broadcastToSubscribers(
      { type: 'post', postId },
      event
    );
    
    // Публикуем в Redis
    await publishToChannel(
      `ws:post:${postId}`,
      event
    );
    
    console.log(`💗 Post ${postId} ${isLiked ? 'liked' : 'unliked'} by ${userId}`);
    
  } catch (error) {
    console.error('❌ Failed to update post likes:', error);
  }
}

// Уведомление о новом посте
async function notifyNewPost(post, subscriberIds) {
  try {
    console.log(`📢 Notifying ${subscriberIds.length} subscribers about new post ${post.id}`);
    
    // Формируем событие для подписчиков
    const event = {
      type: 'new_post_from_subscription',
      post: {
        id: post.id,
        title: post.title,
        type: post.type,
        creatorId: post.creatorId,
        createdAt: post.createdAt
      }
    };
    
    // Отправляем каждому подписчику
    for (const subscriberId of subscriberIds) {
      broadcastToSubscribers(
        { type: 'feed', userId: subscriberId },
        event
      );
      
      // Публикуем в Redis для других серверов
      await publishToChannel(
        `ws:feed:${subscriberId}`,
        event
      );
    }
    
    console.log(`✅ Notified ${subscriberIds.length} subscribers successfully`);
    
  } catch (error) {
    console.error('❌ Failed to notify subscribers:', error);
  }
}

// NEW: Уведомление автора о созданном посте
async function notifyPostAuthor(post, authorId) {
  try {
    console.log(`📢 Notifying post author ${authorId} about new post ${post.id}`);
    
    // Нормализуем данные поста для консистентности
    const normalizedPost = {
      id: post.id,
      content: {
        title: post.title || '',
        text: post.content || ''
      },
      media: {
        type: post.type || 'text',
        url: post.mediaUrl || null,
        thumbnail: post.thumbnail || null
      },
      access: {
        isLocked: post.isLocked || false,
        price: post.price || null,
        currency: post.currency || null,
        tier: post.minSubscriptionTier || null
      },
      creator: post.creator || {
        id: authorId,
        nickname: 'Unknown',
        fullName: 'Unknown',
        avatar: null,
        isCreator: true
      },
      engagement: {
        likesCount: 0,
        commentsCount: 0,
        viewsCount: 0
      },
      metadata: {
        createdAt: post.createdAt || new Date().toISOString(),
        updatedAt: post.updatedAt || post.createdAt || new Date().toISOString(),
        category: post.category || 'General'
      }
    };
    
    // Формируем событие для автора
    const event = {
      type: 'post_created',
      post: normalizedPost,
      userId: authorId,
      timestamp: new Date().toISOString()
    };
    
    // Отправляем напрямую автору если он онлайн
    const sent = sendToUser(authorId, event);
    
    // Также рассылаем в канал ленты автора
    broadcastToSubscribers(
      { type: 'feed', userId: authorId },
      event
    );
    
    // Публикуем в Redis для других серверов
    await publishToChannel(
      `ws:feed:${authorId}`,
      event
    );
    
    console.log(`✅ Post author notification sent: ${sent ? 'direct' : 'channel-only'}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Failed to notify post author:', error);
    return false;
  }
}

// Post deleted
async function notifyPostDeleted(postId, creatorId) {
  try {
    const event = {
      type: 'post_deleted',
      postId
    };
    
    // Рассылаем подписчикам поста
    broadcastToSubscribers(
      { type: 'post', postId },
      event
    );
    
    // Публикуем в Redis
    await publishToChannel(
      `ws:post:${postId}`,
      event
    );
    
    console.log(`🗑️ Post ${postId} deleted`);
    
  } catch (error) {
    console.error('❌ Failed to notify post deleted:', error);
  }
}

// Новый комментарий
async function notifyNewComment(postId, comment) {
  try {
    const event = {
      type: 'comment_added',
      postId,
      comment: {
        id: comment.id,
        userId: comment.userId,
        content: comment.content,
        createdAt: comment.createdAt
      }
    };
    
    // Рассылаем подписчикам поста
    broadcastToSubscribers(
      { type: 'post', postId },
      event
    );
    
    // Публикуем в Redis
    await publishToChannel(
      `ws:post:${postId}`,
      event
    );
    
    console.log(`💬 New comment on post ${postId}`);
    
  } catch (error) {
    console.error('❌ Failed to notify new comment:', error);
  }
}

// Комментарий удален
async function notifyCommentDeleted(postId, commentId) {
  try {
    const event = {
      type: 'comment_deleted',
      postId,
      commentId
    };
    
    // Рассылаем подписчикам поста
    broadcastToSubscribers(
      { type: 'post', postId },
      event
    );
    
    // Публикуем в Redis
    await publishToChannel(
      `ws:post:${postId}`,
      event
    );
    
    console.log(`🗑️ Comment ${commentId} deleted from post ${postId}`);
    
  } catch (error) {
    console.error('❌ Failed to notify comment deleted:', error);
  }
}

// Уведомление лент подписчиков о новом посте
async function notifySubscribersFeeds(creatorId, event) {
  try {
    // Получаем активных подписчиков
    const subscriptions = await prisma.subscription.findMany({
      where: {
        creatorId,
        isActive: true,
        paymentStatus: 'COMPLETED'
      },
      select: { userId: true }
    });
    
    // Отправляем каждому в его ленту
    for (const sub of subscriptions) {
      broadcastToSubscribers(
        { type: 'feed', userId: sub.userId },
        event
      );
    }
    
    console.log(`📢 Notified ${subscriptions.length} subscribers about new post`);
    
  } catch (error) {
    console.error('❌ Failed to notify subscribers feeds:', error);
  }
}

module.exports = {
  updatePostLikes,
  notifyNewPost,
  notifyPostAuthor,
  notifyPostDeleted,
  notifyNewComment,
  notifyCommentDeleted
}; 