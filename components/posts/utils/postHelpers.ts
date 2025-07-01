// components/posts/utils/postHelpers.ts
// Вспомогательные функции для работы с постами

import { UnifiedPost, PostAccess, PostCommerce } from '@/types/posts'
import { TIER_HIERARCHY } from '@/lib/constants/tiers'
import { hasAccessToTier } from '@/lib/utils/access'
import { TIER_VISUAL_DETAILS } from '@/lib/constants/tier-styles'



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
  
  const required = TIER_VISUAL_DETAILS[access.tier.toLowerCase() as keyof typeof TIER_VISUAL_DETAILS]
  if (!required) return null
  
  const current = access.userTier 
    ? TIER_VISUAL_DETAILS[access.userTier.toLowerCase() as keyof typeof TIER_VISUAL_DETAILS] 
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
  const tierDetail = TIER_VISUAL_DETAILS[tier.toLowerCase() as keyof typeof TIER_VISUAL_DETAILS]
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
export function formatPrice(price: number | null | undefined, currency: string = 'SOL', solRate?: number): string {
  const safePrice = price || 0
  const formattedPrice = safePrice.toFixed(2)
  
  if (currency === 'SOL' && solRate) {
    const usdPrice = (safePrice * solRate).toFixed(2)
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
 * Получает стиль фона карточки на основе тира доступа
 */
export function getPostCardBackgroundStyle(post: UnifiedPost): string {
  const accessType = getPostAccessType(post.access, post.commerce)
  const tierInfo = getTierInfo(post.access)
  
  // Free posts - no special background
  if (!post.access.isLocked || accessType === 'free') {
    return ''
  }
  
  // Paid posts - golden gradient
  if (accessType === 'paid') {
    return 'bg-gradient-to-br from-yellow-50/50 to-orange-50/30 dark:from-yellow-900/10 dark:to-orange-900/5'
  }
  
  // Sellable posts - special gradient
  if (accessType === 'sellable') {
    return 'bg-gradient-to-br from-orange-50/50 to-red-50/30 dark:from-orange-900/10 dark:to-red-900/5'
  }
  
  // Tier-based posts
  if (tierInfo?.required) {
    switch (tierInfo.required.color) {
      case 'blue':
        return 'bg-gradient-to-br from-blue-50/50 to-cyan-50/30 dark:from-blue-900/10 dark:to-cyan-900/5'
      case 'purple':
        return 'bg-gradient-to-br from-purple-50/50 to-pink-50/30 dark:from-purple-900/10 dark:to-pink-900/5'
      case 'gold':
        return 'bg-gradient-to-br from-yellow-50/50 to-amber-50/30 dark:from-yellow-900/10 dark:to-amber-900/5'
      default:
        return 'bg-gradient-to-br from-gray-50/50 to-slate-50/30 dark:from-gray-900/10 dark:to-slate-900/5'
    }
  }
  
  // Default subscription posts
  return 'bg-gradient-to-br from-green-50/50 to-emerald-50/30 dark:from-green-900/10 dark:to-emerald-900/5'
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