/**
 * Единая система типов для 6-уровневого доступа к контенту
 * [content_access_system_2025_017]
 */

import { TierName } from '@/lib/constants/tiers'

/**
 * Типы доступа к контенту
 */
export enum PostAccessType {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  VIP = 'vip',
  PAID = 'paid'
}

/**
 * Расширенная информация о доступе к посту
 */
export interface PostAccessInfo {
  // Основные флаги доступа
  type: PostAccessType
  hasAccess: boolean
  isCreatorPost: boolean
  
  // Информация о тирах
  tier?: TierName
  requiredTier?: TierName
  userTier?: TierName
  
  // Платный контент
  price?: number
  currency?: string
  isPurchased?: boolean
  
  // Визуальные эффекты
  shouldBlur: boolean
  shouldDim: boolean // [tier_access_visual_fix_2025_017] Легкая блеклость без overlay
  upgradePrompt?: string
  
  // Дополнительные флаги
  shouldHideContent?: boolean
  isSubscribed?: boolean
}

/**
 * Информация о продаваемом товаре
 */
export interface SellableInfo {
  isSellable: boolean
  sellType?: 'FIXED_PRICE' | 'AUCTION'
  quantity?: number
  soldAt?: string
  soldTo?: {
    id: string
    nickname?: string
    fullName?: string
  }
  soldPrice?: number
}

/**
 * Полная информация о доступе и коммерции
 */
export interface PostContentAccess {
  access: PostAccessInfo
  commerce?: SellableInfo
}

/**
 * Определяет тип доступа на основе данных поста
 */
export function getPostAccessType(post: {
  isLocked?: boolean
  isPremium?: boolean
  minSubscriptionTier?: string | null
  price?: number | null
  isSellable?: boolean
}): PostAccessType {
  // Платный контент (не sellable)
  if (post.price && post.isLocked && !post.isSellable) {
    return PostAccessType.PAID
  }
  
  // Тиры подписок
  if (post.minSubscriptionTier) {
    switch (post.minSubscriptionTier.toLowerCase()) {
      case 'vip':
        return PostAccessType.VIP
      case 'premium':
        return PostAccessType.PREMIUM
      case 'basic':
        return PostAccessType.BASIC
    }
  }
  
  // Legacy поддержка isPremium
  if (post.isPremium) {
    return PostAccessType.VIP
  }
  
  // По умолчанию - бесплатный
  return PostAccessType.FREE
}

/**
 * Проверяет, нужно ли затемнять контент (для постов с тирами но не заблокированных)
 * [tier_access_visual_fix_2025_017]
 */
export function shouldDimContent(
  hasAccess: boolean,
  isCreatorPost: boolean,
  hasRequiredTier: boolean,
  requiredTier?: TierName,
  isLocked?: boolean
): boolean {
  // Автор всегда видит свой контент
  if (isCreatorPost) return false
  
  // Есть полный доступ - не затемняем
  if (hasAccess) return false
  
  // Нет требований тира - не затемняем
  if (!requiredTier) return false
  
  // Пост заблокирован - используем blur, не dim
  if (isLocked) return false
  
  // Есть требование тира, но пост не заблокирован и нет нужного тира - затемняем
  return !hasRequiredTier
}

/**
 * Проверяет, нужно ли размывать контент
 */
export function shouldBlurContent(
  hasAccess: boolean,
  isCreatorPost: boolean,
  accessType: PostAccessType
): boolean {
  // Автор всегда видит свой контент
  if (isCreatorPost) return false
  
  // Есть доступ - не размываем
  if (hasAccess) return false
  
  // Бесплатный контент не размываем
  if (accessType === PostAccessType.FREE) return false
  
  // Все остальное - размываем
  return true
}

/**
 * Генерирует сообщение для апгрейда
 */
export function getUpgradePrompt(
  accessType: PostAccessType,
  requiredTier?: TierName
): string {
  switch (accessType) {
    case PostAccessType.BASIC:
      return 'Upgrade to Basic to unlock this content'
    case PostAccessType.PREMIUM:
      return 'Upgrade to Premium for exclusive access'
    case PostAccessType.VIP:
      return 'Join VIP for ultimate experience'
    case PostAccessType.PAID:
      return 'Purchase to unlock this content'
    default:
      return 'Subscribe to view this content'
  }
} 