/**
 * Централизованная иерархия тиров подписок
 * Используется для проверки доступа к контенту
 */
export const TIER_HIERARCHY = {
  free: 1,
  basic: 2,
  premium: 3,
  vip: 4
} as const

export type TierName = keyof typeof TIER_HIERARCHY

// Визуальные константы для UI
export const TIER_INFO = {
  free: {
    name: 'Free',
    icon: '✨',
    gradient: 'from-gray-400 to-gray-600',
    color: 'gray'
  },
  basic: {
    name: 'Basic',
    icon: '⭐',
    gradient: 'from-gray-400 to-gray-600',
    color: 'gray'
  },
  premium: {
    name: 'Premium',
    icon: '💎',
    gradient: 'from-purple-500 to-pink-500',
    color: 'purple'
  },
  vip: {
    name: 'VIP',
    icon: '👑',
    gradient: 'from-yellow-400 to-orange-500',
    color: 'yellow'
  }
} as const

// Дефолтные цены (могут быть переопределены создателями)
export const DEFAULT_TIER_PRICES = {
  basic: 0.05,
  premium: 0.15,
  vip: 0.35
} as const 