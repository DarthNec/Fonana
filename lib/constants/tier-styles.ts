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