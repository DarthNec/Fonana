import { prisma } from '@/lib/prisma'
import { NotificationType } from '@prisma/client'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  metadata?: any
}

export async function createNotification({
  userId,
  type,
  title,
  message,
  metadata
}: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        metadata
      }
    })
    
    // TODO: Здесь можно добавить отправку real-time уведомления через WebSocket
    
    return notification
  } catch (error) {
    console.error('Error creating notification:', error)
    throw error
  }
}

// Вспомогательные функции для создания разных типов уведомлений
export async function notifyPostLike(postOwnerId: string, likerName: string, postTitle: string, postId: string) {
  return createNotification({
    userId: postOwnerId,
    type: 'LIKE_POST',
    title: 'New like on your post',
    message: `${likerName} liked your post "${postTitle}"`,
    metadata: { postId }
  })
}

export async function notifyCommentLike(commentOwnerId: string, likerName: string, commentPreview: string, commentId: string) {
  return createNotification({
    userId: commentOwnerId,
    type: 'LIKE_COMMENT',
    title: 'New like on your comment',
    message: `${likerName} liked your comment "${commentPreview.slice(0, 50)}..."`,
    metadata: { commentId }
  })
}

export async function notifyNewComment(postOwnerId: string, commenterName: string, postTitle: string, postId: string, commentId: string) {
  return createNotification({
    userId: postOwnerId,
    type: 'COMMENT_POST',
    title: 'New comment on your post',
    message: `${commenterName} commented on "${postTitle}"`,
    metadata: { postId, commentId }
  })
}

export async function notifyCommentReply(commentOwnerId: string, replierName: string, commentPreview: string, postId: string, commentId: string) {
  return createNotification({
    userId: commentOwnerId,
    type: 'REPLY_COMMENT',
    title: 'New reply to your comment',
    message: `${replierName} replied to your comment "${commentPreview.slice(0, 50)}..."`,
    metadata: { postId, commentId }
  })
}

export async function notifyNewSubscriber(creatorId: string, subscriberName: string, plan: string) {
  return createNotification({
    userId: creatorId,
    type: 'NEW_SUBSCRIBER',
    title: 'New subscriber!',
    message: `${subscriberName} subscribed to your ${plan} plan`,
    metadata: { plan }
  })
}

export async function notifyPostPurchase(creatorId: string, buyerName: string, postTitle: string, postId: string, amount: number) {
  return createNotification({
    userId: creatorId,
    type: 'POST_PURCHASE',
    title: 'Post purchased!',
    message: `${buyerName} purchased "${postTitle}" for ${amount} SOL`,
    metadata: { postId, amount }
  })
}

export async function notifyNewPostFromSubscription(subscriberId: string, creatorName: string, postTitle: string, postId: string) {
  return createNotification({
    userId: subscriberId,
    type: 'NEW_POST_FROM_SUBSCRIPTION',
    title: 'New post from creator',
    message: `${creatorName} posted "${postTitle}"`,
    metadata: { postId }
  })
} 