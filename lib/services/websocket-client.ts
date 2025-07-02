/**
 * WebSocket Client Library
 * Отправляет события на WebSocket сервер через HTTP API
 * ИНТЕГРИРОВАН С WebSocketEventManager
 */

const WS_API_URL = process.env.WS_API_URL || 'http://localhost:3002/api'

interface WebSocketEvent {
  type: string
  channel?: string
  data: any
}

/**
 * Отправляет уведомление через WebSocket
 */
export async function sendNotification(
  userId: string,
  notification: {
    type: string
    title: string
    message: string
    metadata?: any
  }
) {
  try {
    console.log(`[WS Client] Sending notification to user ${userId}:`, notification)
    
    // Отправляем событие через WebSocket EventManager
    const { emitNotification } = await import('@/lib/services/WebSocketEventManager')
    
    emitNotification(userId, notification)
    
    return { success: true }
  } catch (error) {
    console.error('[WS Client] Failed to send notification:', error)
    return { success: false, error }
  }
}

/**
 * Уведомляет о новой подписке
 */
export async function notifyNewSubscription(creatorId: string, subscription: any) {
  try {
    console.log('[WS Client] Notifying new subscription for creator:', creatorId, subscription)
    
    // TODO: Реализовать через HTTP API
    return { success: true }
  } catch (error) {
    console.error('[WS Client] Failed to notify subscription:', error)
    return { success: false, error }
  }
}

/**
 * Уведомляет о новом посте
 */
export async function notifyNewPost(post: any, subscribers: string[]) {
  try {
    console.log('[WS Client] Notifying new post to subscribers:', {
      postId: post.id,
      subscriberCount: subscribers.length
    })
    
    // TODO: Реализовать через HTTP API
    return { success: true }
  } catch (error) {
    console.error('[WS Client] Failed to notify new post:', error)
    return { success: false, error }
  }
}

/**
 * Обновляет количество лайков поста
 */
export async function updatePostLikes(postId: string, likesCount: number, userId?: string) {
  try {
    console.log('[WS Client] Updating post likes:', { postId, likesCount, userId })
    
    // Отправляем событие через WebSocket EventManager
    const { emitPostLiked } = await import('@/lib/services/WebSocketEventManager')
    
    emitPostLiked(postId, likesCount, userId)
    
    return { success: true }
  } catch (error) {
    console.error('[WS Client] Failed to update post likes:', error)
    return { success: false, error }
  }
}

/**
 * Уведомляет о новом комментарии
 */
export async function notifyNewComment(postId: string, comment: any) {
  try {
    console.log('[WS Client] Notifying new comment for post:', postId, comment)
    
    // Отправляем событие через WebSocket EventManager
    const { emitPostCommented } = await import('@/lib/services/WebSocketEventManager')
    
    emitPostCommented(postId, comment.id, comment.userId)
    
    return { success: true }
  } catch (error) {
    console.error('[WS Client] Failed to notify new comment:', error)
    return { success: false, error }
  }
} 