// components/posts/utils/postHelpers.ts
// Вспомогательные функции для работы с постами

import { UnifiedPost, PostAccess, PostCommerce } from '@/types/posts'

/**
 * Иерархия тиров подписок
 */
export const TIER_HIERARCHY: Record<string, number> = {
  'vip': 4,
  'premium': 3,
  'basic': 2,
  'free': 1
}

/**
 * Детали тиров с визуальными элементами
 */
export const TIER_DETAILS = {
  'free': { 
    name: 'Free', 
    color: 'gray', 
    icon: '🔓', 
    gradient: 'from-gray-500/20 to-slate-500/20', 
    border: 'border-gray-500/30', 
    text: 'text-gray-700 dark:text-gray-300', 
    dot: 'bg-gray-500 dark:bg-gray-400' 
  },
  'basic': { 
    name: 'Basic', 
    color: 'blue', 
    icon: '⭐', 
    gradient: 'from-blue-500/20 to-cyan-500/20', 
    border: 'border-blue-500/30', 
    text: 'text-blue-700 dark:text-blue-300', 
    dot: 'bg-blue-500 dark:bg-blue-400' 
  },
  'premium': { 
    name: 'Premium', 
    color: 'purple', 
    icon: '💎', 
    gradient: 'from-purple-500/20 to-pink-500/20', 
    border: 'border-purple-500/30', 
    text: 'text-purple-700 dark:text-purple-300', 
    dot: 'bg-purple-500 dark:bg-purple-400' 
  },
  'vip': { 
    name: 'VIP', 
    color: 'gold', 
    icon: '👑', 
    gradient: 'from-yellow-500/20 to-amber-500/20', 
    border: 'border-yellow-500/30', 
    text: 'text-yellow-700 dark:text-yellow-300', 
    dot: 'bg-yellow-500 dark:bg-yellow-400' 
  }
} as const

/**
 * Проверяет, достаточен ли уровень подписки для доступа к контенту
 */
export function hasAccessToTier(userTier: string | undefined, requiredTier: string | undefined): boolean {
  if (!requiredTier) return true
  if (!userTier) return false
  
  const userLevel = TIER_HIERARCHY[userTier.toLowerCase()] || 0
  const requiredLevel = TIER_HIERARCHY[requiredTier.toLowerCase()] || 0
  
  return userLevel >= requiredLevel
}

/**
 * Определяет тип доступа к посту
 */
export function getPostAccessType(access: PostAccess, commerce?: PostCommerce): 
  'free' | 'tier' | 'paid' | 'subscription' | 'sellable' {
  
  if (!access.isLocked) return 'free'
  if (commerce?.isSellable) return 'sellable'
  if (access.price && access.price > 0) return 'paid'
  if (access.tier) return 'tier'
  return 'subscription'
}

/**
 * Проверяет, нужна ли оплата для доступа к контенту
 */
export function needsPayment(post: UnifiedPost): boolean {
  return post.access.isLocked && 
         !!post.access.price && 
         post.access.price > 0 && 
         !post.commerce?.isSellable && 
         !post.access.isPurchased
}

/**
 * Проверяет, нужна ли подписка для доступа
 */
export function needsSubscription(post: UnifiedPost): boolean {
  return post.access.isLocked && 
         !post.access.price && 
         !post.access.isSubscribed &&
         !post.commerce?.isSellable
}

/**
 * Проверяет, нужен ли апгрейд подписки
 */
export function needsTierUpgrade(post: UnifiedPost): boolean {
  if (!post.access.isLocked || !post.access.tier) return false
  return !hasAccessToTier(post.access.userTier, post.access.tier)
}

/**
 * Получает информацию о требуемом тире
 */
export function getTierInfo(access: PostAccess) {
  if (!access.tier) return null
  
  const required = TIER_DETAILS[access.tier.toLowerCase() as keyof typeof TIER_DETAILS]
  if (!required) return null
  
  const current = access.userTier 
    ? TIER_DETAILS[access.userTier.toLowerCase() as keyof typeof TIER_DETAILS] 
    : null
  
  return {
    required,
    current,
    needsUpgrade: !!current && !hasAccessToTier(access.userTier, access.tier)
  }
}

/**
 * Форматирует название тира для отображения
 */
export function formatTierName(tier: string | null | undefined): string {
  if (!tier) return ''
  const tierDetail = TIER_DETAILS[tier.toLowerCase() as keyof typeof TIER_DETAILS]
  return tierDetail?.name || tier
}

/**
 * Определяет, является ли пост активным аукционом
 */
export function isActiveAuction(commerce?: PostCommerce): boolean {
  return !!commerce?.isSellable && 
         commerce.sellType === 'AUCTION' && 
         commerce.auctionData?.status === 'ACTIVE'
}

/**
 * Определяет, продан ли пост
 */
export function isPostSold(commerce?: PostCommerce): boolean {
  return !!commerce?.soldAt || commerce?.auctionData?.status === 'SOLD'
}

/**
 * Рассчитывает цену с учетом Flash Sale
 */
export function calculatePriceWithDiscount(price: number, flashSale?: PostCommerce['flashSale']): number {
  if (!flashSale || !price) return price
  return price * (1 - flashSale.discount / 100)
}

/**
 * Форматирует цену для отображения
 */
export function formatPrice(price: number, currency: string = 'SOL', solRate?: number): string {
  const formattedPrice = price.toFixed(2)
  
  if (currency === 'SOL' && solRate) {
    const usdPrice = (price * solRate).toFixed(2)
    return `${formattedPrice} SOL (≈ $${usdPrice})`
  }
  
  return `${formattedPrice} ${currency}`
}

/**
 * Получает текст кнопки действия для поста
 */
export function getActionButtonText(post: UnifiedPost): string {
  const { access, commerce } = post
  
  // Продаваемые посты
  if (commerce?.isSellable && !isPostSold(commerce)) {
    if (commerce.sellType === 'AUCTION') {
      return 'Place Bid'
    }
    if (commerce.flashSale) {
      const discountedPrice = calculatePriceWithDiscount(access.price || 0, commerce.flashSale)
      return `Buy for ${discountedPrice.toFixed(2)} ${access.currency} (${commerce.flashSale.discount}% OFF)`
    }
    return `Buy for ${access.price} ${access.currency}`
  }
  
  // Платные посты
  if (needsPayment(post)) {
    if (commerce?.flashSale) {
      const discountedPrice = calculatePriceWithDiscount(access.price || 0, commerce.flashSale)
      return `Unlock for ${discountedPrice.toFixed(2)} ${access.currency} (${commerce.flashSale.discount}% OFF)`
    }
    return `Unlock for ${access.price} ${access.currency}`
  }
  
  // Посты по подписке
  if (needsSubscription(post) || needsTierUpgrade(post)) {
    const tierInfo = getTierInfo(access)
    if (tierInfo) {
      return access.userTier 
        ? `Upgrade to ${tierInfo.required.name}`
        : `Subscribe to ${tierInfo.required.name}`
    }
    return 'Subscribe'
  }
  
  return ''
}

/**
 * Определяет стиль границы карточки на основе типа доступа
 */
export function getPostCardBorderStyle(post: UnifiedPost): string {
  const accessType = getPostAccessType(post.access, post.commerce)
  const tierInfo = getTierInfo(post.access)
  
  const baseHover = 'hover:border-opacity-50 dark:hover:border-opacity-30'
  
  switch (accessType) {
    case 'paid':
      return `hover:border-yellow-500 ${baseHover}`
    case 'tier':
      if (tierInfo?.required) {
        switch (tierInfo.required.color) {
          case 'gold': return `hover:border-yellow-500 ${baseHover}`
          case 'purple': return `hover:border-purple-500 ${baseHover}`
          case 'blue': return `hover:border-blue-500 ${baseHover}`
          default: return `hover:border-gray-500 ${baseHover}`
        }
      }
      return `hover:border-purple-500 ${baseHover}`
    case 'sellable':
      return `hover:border-orange-500 ${baseHover}`
    case 'subscription':
      return `hover:border-green-500 ${baseHover}`
    default:
      return `hover:border-gray-500 ${baseHover}`
  }
}

/**
 * Получает стиль свечения при наведении
 */
export function getPostCardGlowStyle(post: UnifiedPost): string {
  const accessType = getPostAccessType(post.access, post.commerce)
  const tierInfo = getTierInfo(post.access)
  
  switch (accessType) {
    case 'paid':
      return 'bg-gradient-to-r from-yellow-600/10 to-orange-600/10'
    case 'tier':
      if (tierInfo?.required) {
        switch (tierInfo.required.color) {
          case 'gold': return 'bg-gradient-to-r from-yellow-600/10 to-orange-600/10'
          case 'purple': return 'bg-gradient-to-r from-purple-600/10 to-pink-600/10'
          case 'blue': return 'bg-gradient-to-r from-blue-600/10 to-cyan-600/10'
          default: return 'bg-gradient-to-r from-gray-600/10 to-slate-600/10'
        }
      }
      return 'bg-gradient-to-r from-purple-600/10 to-pink-600/10'
    case 'sellable':
      return 'bg-gradient-to-r from-orange-600/10 to-red-600/10'
    case 'subscription':
      return 'bg-gradient-to-r from-green-600/10 to-emerald-600/10'
    default:
      return 'bg-gradient-to-r from-gray-600/10 to-slate-600/10'
  }
} 