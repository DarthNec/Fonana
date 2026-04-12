/**
 * DeletedPosts Helper
 * 
 * Утилиты для работы с удалёнными постами:
 * - Перенос постов в архив при удалении
 * - Восстановление удалённых постов
 * - Получение истории удалений
 */

// 🔥 FIX 2026-03-09: Используем синглтон prisma для предотвращения connection pool exhaustion
import { Post, DeletedPost } from '@prisma/client'
import { prisma } from '@/lib/prisma'

interface DeletePostOptions {
  postId: string
  deletedBy?: string
  deletionReason?: string
}

interface RestorePostOptions {
  deletedPostId: string
  restoreRelations?: boolean // Восстанавливать ли связи (likes, comments)
}

/**
 * Удалить пост (переместить в deleted_posts)
 */
export async function movePostToDeleted(options: DeletePostOptions): Promise<DeletedPost> {
  const { postId, deletedBy, deletionReason } = options

  // 1. Получаем пост с проверкой существования
  const post = await prisma.post.findUnique({
    where: { id: postId }
  })

  if (!post) {
    throw new Error(`Post with ID ${postId} not found`)
  }

  // 2. Создаём запись в deleted_posts
  const deletedPost = await prisma.deletedPost.create({
    data: {
      originalPostId: post.id,
      creatorId: post.creatorId,
      title: post.title,
      content: post.content,
      type: post.type,
      category: post.category,
      thumbnail: post.thumbnail,
      mediaUrl: post.mediaUrl,
      blurUrl: post.blurUrl,
      previewUrl: post.previewUrl,
      isLocked: post.isLocked,
      isPremium: post.isPremium,
      price: post.price,
      currency: post.currency,
      imageAspectRatio: post.imageAspectRatio,
      isSellable: post.isSellable,
      minSubscriptionTier: post.minSubscriptionTier,
      requestId: post.requestId,
      error: post.error,
      remixId: post.remixId,
      containerId: post.containerId,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      viewsCount: post.viewsCount,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      deletedBy,
      deletionReason,
    }
  })

  // 3. Удаляем пост из posts (каскадно удалятся связи)
  await prisma.post.delete({
    where: { id: postId }
  })

  console.log(`[DeletedPosts] Post ${postId} moved to deleted_posts (${deletedPost.id})`)

  return deletedPost
}

/**
 * Восстановить удалённый пост
 */
export async function restoreDeletedPost(options: RestorePostOptions): Promise<Post> {
  const { deletedPostId, restoreRelations = false } = options

  // 1. Получаем удалённый пост
  const deletedPost = await prisma.deletedPost.findUnique({
    where: { id: deletedPostId }
  })

  if (!deletedPost) {
    throw new Error(`Deleted post with ID ${deletedPostId} not found`)
  }

  // 2. Проверяем, не существует ли уже пост с таким originalPostId
  const existingPost = await prisma.post.findUnique({
    where: { id: deletedPost.originalPostId }
  })

  if (existingPost) {
    throw new Error(`Post with ID ${deletedPost.originalPostId} already exists. Cannot restore.`)
  }

  // 3. Восстанавливаем пост
  const restoredPost = await prisma.post.create({
    data: {
      id: deletedPost.originalPostId, // Сохраняем оригинальный ID
      creatorId: deletedPost.creatorId,
      title: deletedPost.title,
      content: deletedPost.content,
      type: deletedPost.type,
      category: deletedPost.category,
      thumbnail: deletedPost.thumbnail,
      mediaUrl: deletedPost.mediaUrl,
      blurUrl: deletedPost.blurUrl,
      previewUrl: deletedPost.previewUrl,
      isLocked: deletedPost.isLocked,
      isPremium: deletedPost.isPremium,
      price: deletedPost.price,
      currency: deletedPost.currency,
      imageAspectRatio: deletedPost.imageAspectRatio,
      isSellable: deletedPost.isSellable,
      minSubscriptionTier: deletedPost.minSubscriptionTier,
      requestId: deletedPost.requestId,
      error: deletedPost.error,
      remixId: deletedPost.remixId,
      containerId: deletedPost.containerId,
      likesCount: deletedPost.likesCount,
      commentsCount: deletedPost.commentsCount,
      viewsCount: deletedPost.viewsCount,
      createdAt: deletedPost.createdAt,
      updatedAt: deletedPost.updatedAt,
    }
  })

  // 4. Удаляем из deleted_posts
  await prisma.deletedPost.delete({
    where: { id: deletedPostId }
  })

  console.log(`[DeletedPosts] Post ${restoredPost.id} restored from deleted_posts`)

  // TODO: Если restoreRelations = true, восстановить связи (likes, comments)
  // Это требует дополнительных таблиц deleted_likes, deleted_comments

  return restoredPost
}

/**
 * Получить удалённые посты креатора
 */
export async function getDeletedPostsByCreator(
  creatorId: string,
  options?: {
    limit?: number
    offset?: number
    orderBy?: 'deletedAt' | 'createdAt'
  }
) {
  const { limit = 50, offset = 0, orderBy = 'deletedAt' } = options || {}

  return await prisma.deletedPost.findMany({
    where: { creatorId },
    orderBy: { [orderBy]: 'desc' },
    take: limit,
    skip: offset,
  })
}

/**
 * Получить конкретный удалённый пост по оригинальному ID
 */
export async function getDeletedPostByOriginalId(originalPostId: string) {
  return await prisma.deletedPost.findFirst({
    where: { originalPostId },
    orderBy: { deletedAt: 'desc' } // Если пост удалялся несколько раз, берём последний
  })
}

/**
 * Очистить старые удалённые посты (старше X дней)
 */
export async function cleanupOldDeletedPosts(olderThanDays: number = 180) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

  const result = await prisma.deletedPost.deleteMany({
    where: {
      deletedAt: {
        lt: cutoffDate
      }
    }
  })

  console.log(`[DeletedPosts] Cleaned up ${result.count} posts older than ${olderThanDays} days`)

  return result.count
}

/**
 * Получить статистику удалённых постов
 */
export async function getDeletedPostsStats() {
  const total = await prisma.deletedPost.count()
  
  const byCreator = await prisma.deletedPost.groupBy({
    by: ['creatorId'],
    _count: true,
    orderBy: {
      _count: {
        creatorId: 'desc'
      }
    },
    take: 10
  })

  const byReason = await prisma.deletedPost.groupBy({
    by: ['deletionReason'],
    _count: true,
    where: {
      deletionReason: { not: null }
    }
  })

  return {
    total,
    topDeleters: byCreator,
    reasonsBreakdown: byReason
  }
}
