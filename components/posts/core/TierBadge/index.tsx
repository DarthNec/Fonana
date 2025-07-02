'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export interface TierBadgeProps {
  tier?: string | null
  className?: string
  onClick?: () => void
  showIcon?: boolean
  interactive?: boolean
}

/**
 * Компонент для отображения бейджа тира поста
 * Отображается рядом с тегами в нижней части карточки
 * Поддерживает иконки, анимации и интерактивность
 */
export function TierBadge({
  tier,
  className,
  onClick,
  showIcon = true,
  interactive = false
}: TierBadgeProps) {
  // Если тир не указан, не показываем badge
  if (!tier) return null

  // Определяем стили в зависимости от тира
  const getTierStyles = () => {
    switch (tier.toLowerCase()) {
      case 'basic':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
      case 'premium':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50'
      case 'vip':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
      default:
        return 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
    }
  }

  // Получаем иконку тира
  const getTierIcon = () => {
    switch (tier.toLowerCase()) {
      case 'basic':
        return '⭐'
      case 'premium':
        return '💎'
      case 'vip':
        return '👑'
      default:
        return '🔒'
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

  const baseClasses = cn(
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
    'transform hover:scale-105 active:scale-95',
    getTierStyles(),
    interactive && 'cursor-pointer shadow-sm hover:shadow-md',
    className
  )

  const content = (
    <>
      {showIcon && <span className="text-sm">{getTierIcon()}</span>}
      <span>{getTierName()}</span>
    </>
  )

  if (interactive && onClick) {
    return (
      <button
        onClick={onClick}
        className={baseClasses}
        title={`Фильтровать по тиру: ${getTierName()}`}
      >
        {content}
      </button>
    )
  }

  return (
    <span className={baseClasses}>
      {content}
    </span>
  )
} 