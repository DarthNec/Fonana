import { TIER_HIERARCHY, TierName } from '@/lib/constants/tiers'
import { TIER_UPGRADE_PROMPTS } from '@/lib/constants/tier-styles'
import { PostAccessType, getPostAccessType, shouldBlurContent, shouldDimContent, getUpgradePrompt } from '@/types/posts/access'

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
 * [content_access_system_2025_017] Расширено для поддержки blur и промптов
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
  // [content_access_system_2025_017] Новые поля для визуальных эффектов
  accessType: PostAccessType
  shouldBlur: boolean
  shouldDim: boolean // [tier_access_visual_fix_2025_017] Легкая блеклость
  upgradePrompt?: string
  isCreatorPost: boolean
}

/**
 * Проверяет доступ к посту для пользователя
 * [content_access_system_2025_017] Расширена для полной 6-уровневой системы
 */
export function checkPostAccess(
  post: {
    isLocked: boolean
    minSubscriptionTier?: string | null
    isPremium?: boolean
    price?: number
    currency?: string
    creatorId: string
    isSellable?: boolean
  },
  user?: {
    id: string
  } | null,
  subscription?: {
    plan: string
  } | null,
  hasPurchased: boolean = false
): ContentAccessStatus {
  // [content_access_system_2025_017] Определяем тип доступа
  const accessType = getPostAccessType(post)
  const isCreatorPost = !!(user && post.creatorId === user.id)
  
  // Автор всегда имеет доступ к своему контенту
  if (isCreatorPost) {
    return {
      hasAccess: true,
      needsPayment: false,
      needsSubscription: false,
      needsTierUpgrade: false,
      requiredTier: null,
      currentTier: normalizeTierName(subscription?.plan),
      accessType,
      shouldBlur: false,
      shouldDim: false,
      upgradePrompt: undefined,
      isCreatorPost: true
    }
  }

  const currentTier = normalizeTierName(subscription?.plan)
  
  // [tier_access_logic_fix_2025_017] Проверяем требования тира ПЕРЕД isLocked
  const requiredTier = normalizeTierName(post.minSubscriptionTier) || 
                      (post.isPremium ? 'vip' as TierName : null)

  if (requiredTier) {
    const hasRequiredTier = hasAccessToTier(currentTier, requiredTier)
    const hasAccess = hasRequiredTier
    
    // [tier_access_visual_fix_2025_017] Определяем визуальные эффекты
    const shouldBlur = post.isLocked && shouldBlurContent(hasAccess, isCreatorPost, accessType)
    const shouldDim = !post.isLocked && shouldDimContent(hasAccess, isCreatorPost, hasRequiredTier, requiredTier, post.isLocked)
    
    return {
      hasAccess,
      needsPayment: false,
      needsSubscription: !currentTier,
      needsTierUpgrade: !!currentTier && !hasRequiredTier,
      requiredTier,
      currentTier,
      accessType,
      shouldBlur,
      shouldDim,
      upgradePrompt: (shouldBlur || shouldDim) ? getUpgradePrompt(accessType, requiredTier) : undefined,
      isCreatorPost: false
    }
  }
  
  // Платный контент (не sellable)
  if (post.price && post.price > 0 && !post.isSellable) {
    const hasAccess = hasPurchased
    const shouldBlur = shouldBlurContent(hasAccess, isCreatorPost, accessType)
    
    return {
      hasAccess,
      needsPayment: !hasPurchased,
      needsSubscription: false,
      needsTierUpgrade: false,
      requiredTier: null,
      currentTier,
      price: post.price,
      currency: post.currency || 'SOL',
      accessType,
      shouldBlur,
      shouldDim: false, // [tier_access_visual_fix_2025_017] Платный контент не dim
      upgradePrompt: shouldBlur ? getUpgradePrompt(accessType) : undefined,
      isCreatorPost: false
    }
  }

  // [tier_access_logic_fix_2025_017] Если контент не заблокирован И нет требований тира
  if (!post.isLocked && !requiredTier) {
    return {
      hasAccess: true,
      needsPayment: false,
      needsSubscription: false,
      needsTierUpgrade: false,
      requiredTier: null,
      currentTier,
      accessType,
      shouldBlur: false,
      shouldDim: false, // [tier_access_visual_fix_2025_017] Свободный доступ
      upgradePrompt: undefined,
      isCreatorPost: false
    }
  }

  // Обычный заблокированный контент - требует любую подписку
  const hasAccess = !!subscription
  const shouldBlur = shouldBlurContent(hasAccess, isCreatorPost, PostAccessType.BASIC)
  
  return {
    hasAccess,
    needsPayment: false,
    needsSubscription: !subscription,
    needsTierUpgrade: false,
    requiredTier: 'basic' as TierName,
    currentTier,
    accessType: PostAccessType.BASIC,
    shouldBlur,
    shouldDim: false, // [tier_access_visual_fix_2025_017] Заблокированный контент использует blur
    upgradePrompt: shouldBlur ? getUpgradePrompt(PostAccessType.BASIC) : undefined,
    isCreatorPost: false
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