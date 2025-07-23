import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { ENV } from '@/lib/constants/env'
import { getContentType } from '@/lib/utils/mime-types'
import { checkPostAccess } from '@/lib/utils/access'

const JWT_SECRET = ENV.NEXTAUTH_SECRET

interface MediaAccessResult {
  hasAccess: boolean
  shouldBlur: boolean
  shouldDim: boolean
  upgradePrompt?: string
  requiredTier?: string
  accessType?: string
  price?: number
  currency?: string
  contentType: string
  cacheControl: string
}

// Utility function to verify JWT
async function verifyJWT(token: string): Promise<any | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    
    if (!decoded.userId && !decoded.sub) {
      console.log('[Media Access] No userId in token')
      return null
    }
    
    const userId = decoded.userId || decoded.sub
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        wallet: true,
        nickname: true,
        fullName: true,
        isCreator: true,
        isVerified: true
      }
    })
    
    return user
  } catch (error) {
    console.error('[Media Access] JWT verification failed:', error)
    return null
  }
}

export async function checkMediaAccess(
  mediaPath: string,
  token: string | null
): Promise<MediaAccessResult> {
  
  console.log('[Media Access] Checking access for:', mediaPath)
  
  // Определяем тип контента
  const contentType = getContentType(mediaPath)
  
  // Ищем пост по media path
  const post = await prisma.post.findFirst({
    where: {
      OR: [
        { mediaUrl: { contains: mediaPath } },
        { thumbnail: { contains: mediaPath } }
      ]
    },
    include: {
      creator: true
    }
  })
  
  // Если это не медиа поста (avatar, background, etc) - полный доступ
  if (!post) {
    console.log('[Media Access] Not a post media, granting full access')
    return {
      hasAccess: true,
      shouldBlur: false,
      shouldDim: false,
      contentType,
      cacheControl: 'public, max-age=31536000, immutable',
      accessType: 'public'
    }
  }
  
  console.log('[Media Access] Found post:', {
    id: post.id,
    title: post.title,
    isLocked: post.isLocked,
    minSubscriptionTier: post.minSubscriptionTier,
    price: post.price
  })
  
  // Парсим JWT если есть
  let user = null
  if (token) {
    user = await verifyJWT(token)
    if (user) {
      console.log('[Media Access] User authenticated:', user.id)
    }
  }
  
  // Проверяем подписку
  let subscription = null
  if (user && post.creatorId) {
    subscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        creatorId: post.creatorId,
        isActive: true
      },
      select: {
        plan: true
      }
    })
    
    if (subscription) {
      console.log('[Media Access] User has subscription:', subscription.plan)
    }
  }
  
  // Проверяем покупку поста
  let hasPurchased = false
  if (user && post.id) {
    const purchase = await prisma.postPurchase.findFirst({
      where: {
        userId: user.id,
        postId: post.id
      }
    })
    hasPurchased = !!purchase
    
    if (hasPurchased) {
      console.log('[Media Access] User purchased this post')
    }
  }
  
  // Используем существующую логику checkPostAccess
  const accessStatus = checkPostAccess(
    post,
    user,
    subscription,
    hasPurchased
  )
  
  console.log('[Media Access] Access status:', accessStatus)
  
  // Определяем upgrade prompt
  let upgradePrompt = accessStatus.upgradePrompt || ''
  if (!upgradePrompt && !accessStatus.hasAccess) {
    if (post.minSubscriptionTier) {
      upgradePrompt = `Upgrade to ${post.minSubscriptionTier.toUpperCase()} to access`
    } else if (post.price && post.price > 0) {
      upgradePrompt = `Purchase for ${post.price} ${post.currency || 'SOL'}`
    } else if (post.isLocked) {
      upgradePrompt = 'Subscribe to access this content'
    }
  }
  
  return {
    hasAccess: accessStatus.hasAccess,
    shouldBlur: accessStatus.shouldBlur || false,
    shouldDim: accessStatus.shouldDim || false,
    upgradePrompt,
    requiredTier: post.minSubscriptionTier || '',
    accessType: accessStatus.accessType || 'free',
    price: post.price || undefined,
    currency: post.currency || 'SOL',
    contentType,
    cacheControl: accessStatus.hasAccess
      ? 'public, max-age=31536000, immutable'
      : 'private, no-cache, no-transform'
  }
} 