'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export interface TierBadgeProps {
  tier?: string | null
  className?: string
}

/**
 * Компонент для отображения бейджа тира поста
 * Отображается рядом с тегами в нижней части карточки
 */
export function TierBadge({
  tier,
  className
}: TierBadgeProps) {
  // Если тир не указан, не показываем badge
  if (!tier) return null

  // Определяем стили в зависимости от тира
  const getTierStyles = () => {
    switch (tier.toLowerCase()) {
      case 'basic':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
      case 'premium':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
      case 'vip':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
      default:
        return 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
    }
  }

  // Получаем название тира для отображения
  const getTierName = () => {
    switch (tier.toLowerCase()) {
      case 'basic':
        return 'Basic'
      case 'premium':
        return 'Premium'
      case 'vip':
        return 'VIP'
      default:
        return tier
    }
  }

  return (
    <span
      className={cn(
        'px-3 py-1 rounded-full text-xs font-medium',
        getTierStyles(),
        className
      )}
    >
      {getTierName()}
    </span>
  )
} 