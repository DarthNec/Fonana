const { prisma } = require('../db');
const { broadcastToSubscribers } = require('../server');
const { publishEvent } = require('../redis');

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
    await publishEvent(
      { type: 'post', postId },
      event
    );
    
    console.log(`💗 Post ${postId} ${isLiked ? 'liked' : 'unliked'} by ${userId}`);
    
  } catch (error) {
    console.error('❌ Failed to update post likes:', error);
  }
}

// Новый пост создан
async function notifyNewPost(post) {
  try {
    // Формируем событие
    const event = {
      type: 'post_created',
      creatorId: post.creatorId,
      post: {
        id: post.id,
        title: post.title,
        type: post.type,
        thumbnail: post.thumbnail,
        createdAt: post.createdAt
      }
    };
    
    // Рассылаем подписчикам создателя
    broadcastToSubscribers(
      { type: 'creator', id: post.creatorId },
      event
    );
    
    // Публикуем в Redis
    await publishEvent(
      { type: 'creator', id: post.creatorId },
      event
    );
    
    // Также отправляем в ленты подписчиков
    await notifySubscribersFeeds(post.creatorId, event);
    
    console.log(`📝 New post created by ${post.creatorId}`);
    
  } catch (error) {
    console.error('❌ Failed to notify new post:', error);
  }
}

// Пост удален
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
    await publishEvent(
      { type: 'post', postId },
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
    await publishEvent(
      { type: 'post', postId },
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
    await publishEvent(
      { type: 'post', postId },
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
  notifyPostDeleted,
  notifyNewComment,
  notifyCommentDeleted
}; 