import { TIER_HIERARCHY, TierName } from '@/lib/constants/tiers'

/**
 * Нормализует название тира к нижнему регистру
 */
export function normalizeTierName(tier: string | null | undefined): TierName | null {
  if (!tier) return null
  const normalized = tier.toLowerCase()
  return normalized in TIER_HIERARCHY ? normalized as TierName : null
}

/**
 * Проверяет, достаточен ли уровень подписки пользователя для доступа к контенту
 */
export function hasAccessToTier(
  userTier: string | null | undefined, 
  requiredTier: string | null | undefined
): boolean {
  // Если тир не требуется, доступ есть у всех
  if (!requiredTier) return true
  
  // Если у пользователя нет подписки, доступа нет
  if (!userTier) return false
  
  const normalizedUserTier = normalizeTierName(userTier)
  const normalizedRequiredTier = normalizeTierName(requiredTier)
  
  if (!normalizedUserTier || !normalizedRequiredTier) return false
  
  const userLevel = TIER_HIERARCHY[normalizedUserTier]
  const requiredLevel = TIER_HIERARCHY[normalizedRequiredTier]
  
  return userLevel >= requiredLevel
}

/**
 * Определяет тип блокировки контента
 */
export interface ContentAccessStatus {
  hasAccess: boolean
  needsPayment: boolean
  needsSubscription: boolean
  needsTierUpgrade: boolean
  requiredTier: TierName | null
  currentTier: TierName | null
  price?: number
  currency?: string
}

/**
 * Проверяет доступ к посту для пользователя
 */
export function checkPostAccess(
  post: {
    isLocked: boolean
    minSubscriptionTier?: string | null
    isPremium?: boolean
    price?: number
    currency?: string
    creatorId: string
  },
  user?: {
    id: string
  } | null,
  subscription?: {
    plan: string
  } | null,
  hasPurchased: boolean = false
): ContentAccessStatus {
  // Автор всегда имеет доступ к своему контенту
  if (user && post.creatorId === user.id) {
    return {
      hasAccess: true,
      needsPayment: false,
      needsSubscription: false,
      needsTierUpgrade: false,
      requiredTier: null,
      currentTier: null
    }
  }

  // Если контент не заблокирован
  if (!post.isLocked) {
    return {
      hasAccess: true,
      needsPayment: false,
      needsSubscription: false,
      needsTierUpgrade: false,
      requiredTier: null,
      currentTier: null
    }
  }

  const currentTier = normalizeTierName(subscription?.plan)
  
  // Платный контент
  if (post.price && post.price > 0) {
    return {
      hasAccess: hasPurchased,
      needsPayment: !hasPurchased,
      needsSubscription: false,
      needsTierUpgrade: false,
      requiredTier: null,
      currentTier,
      price: post.price,
      currency: post.currency || 'SOL'
    }
  }

  // Контент с требованием тира
  const requiredTier = normalizeTierName(post.minSubscriptionTier) || 
                      (post.isPremium ? 'vip' as TierName : null)

  if (requiredTier) {
    const hasRequiredTier = hasAccessToTier(currentTier, requiredTier)
    
    return {
      hasAccess: hasRequiredTier,
      needsPayment: false,
      needsSubscription: !currentTier,
      needsTierUpgrade: !!currentTier && !hasRequiredTier,
      requiredTier,
      currentTier
    }
  }

  // Обычный заблокированный контент - требует любую подписку
  return {
    hasAccess: !!subscription,
    needsPayment: false,
    needsSubscription: !subscription,
    needsTierUpgrade: false,
    requiredTier: 'basic' as TierName,
    currentTier
  }
}

/**
 * Маппинг типа доступа на тир подписки
 * Используется для преобразования accessType из базы данных в тир
 */
export function mapAccessTypeToTier(accessType?: string): string | undefined {
  if (!accessType) return undefined
  
  switch (accessType) {
    case 'FREE':
      return 'free'
    case 'BASIC':
      return 'basic'
    case 'PREMIUM':
      return 'premium'
    case 'VIP':
      return 'vip'
    default:
      return undefined
  }
} 