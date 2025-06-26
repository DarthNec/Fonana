'use client'

import React from 'react'
import { TIER_DETAILS } from '@/components/posts/utils/postHelpers'
import { cn } from '@/lib/utils'

export interface PostTierBadgeProps {
  tier: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Компонент для отображения бейджа тира подписки
 */
export function PostTierBadge({
  tier,
  size = 'md',
  className
}: PostTierBadgeProps) {
  const tierDetail = TIER_DETAILS[tier.toLowerCase() as keyof typeof TIER_DETAILS]
  
  if (!tierDetail) return null

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': 
        return 'px-2 py-1 text-xs'
      case 'lg': 
        return 'px-4 py-2 text-base'
      default: 
        return 'px-3 py-1.5 text-sm'
    }
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium backdrop-blur-sm',
        'bg-white/90 dark:bg-slate-900/90',
        tierDetail.border,
        tierDetail.text,
        getSizeClasses(),
        className
      )}
    >
      <span className="text-base">{tierDetail.icon}</span>
      <span>{tierDetail.name}</span>
    </div>
  )
} 