/**
 * Расширенные визуальные константы для тиров подписок
 * Используется для стилизации UI компонентов
 */

import { TierName } from './tiers'

export interface TierVisualDetails {
  name: string
  color: string
  icon: string
  gradient: string
  border: string
  text: string
  dot: string
}

export const TIER_VISUAL_DETAILS: Record<TierName | 'free', TierVisualDetails> = {
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

// [content_access_system_2025_017] Добавляем стили для blur эффектов
export const TIER_BLUR_STYLES = {
  backdrop: 'backdrop-blur-md',
  overlay: 'bg-white/80 dark:bg-slate-900/80 absolute inset-0 flex items-center justify-center',
  content: 'opacity-30 pointer-events-none select-none'
} as const

// [content_access_system_2025_017] Стили для легкой блеклости без overlay
export const TIER_DIM_STYLES = {
  content: 'opacity-50 brightness-75 saturate-50',
  border: 'border-opacity-50 dark:border-opacity-30',
  hover: 'hover:opacity-70 hover:brightness-90 hover:saturate-75 transition-all duration-300'
} as const

// [content_access_system_2025_017] Промпты для апгрейда подписки
export const TIER_UPGRADE_PROMPTS = {
  basic: 'Upgrade to Basic to unlock this content',
  premium: 'Upgrade to Premium for exclusive access',
  vip: 'Join VIP for ultimate experience',
  paid: 'Purchase to unlock this content'
} as const

// [content_access_system_2025_017] Дополнительные стили для специальных типов контента
export const SPECIAL_CONTENT_STYLES = {
  paid: {
    name: 'Paid',
    color: 'orange',
    icon: '💰',
    gradient: 'from-yellow-500/20 to-orange-500/20',
    border: 'border-yellow-500/30',
    text: 'text-yellow-700 dark:text-yellow-300'
  },
  sellable: {
    name: 'For Sale',
    color: 'red',
    icon: '🛍️',
    gradient: 'from-orange-500/20 to-red-500/20',
    border: 'border-orange-500/30',
    text: 'text-orange-700 dark:text-orange-300'
  },
  sold: {
    name: 'SOLD',
    color: 'green',
    icon: '✅',
    gradient: 'from-green-500/20 to-emerald-500/20',
    border: 'border-green-500/30',
    text: 'text-green-700 dark:text-green-300'
  }
} as const 