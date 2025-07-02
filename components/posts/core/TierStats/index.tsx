'use client'

import React from 'react'
import { UnifiedPost } from '@/types/posts'
import { TierBadge } from '../TierBadge'
import { cn } from '@/lib/utils'

export interface TierStatsProps {
  posts: UnifiedPost[]
  className?: string
  onTierFilter?: (tier: string) => void
}

/**
 * Компонент для отображения статистики постов по тирам
 * Показывает количество постов каждого тира с возможностью фильтрации
 */
export function TierStats({
  posts,
  className,
  onTierFilter
}: TierStatsProps) {
  // Подсчитываем статистику по тирам
  const tierStats = posts.reduce((acc, post) => {
    const tier = post?.access?.tier
    if (tier && typeof tier === 'string') {
      acc[tier] = (acc[tier] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  // Если нет постов с тирами, не показываем компонент
  if (Object.keys(tierStats).length === 0) {
    return null
  }

  const totalPosts = posts.length
  const postsWithTiers = Object.values(tierStats).reduce((sum, count) => sum + count, 0)

  return (
    <div className={cn('space-y-3', className)}>
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Статистика по тирам
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {postsWithTiers} из {totalPosts} постов
        </span>
      </div>

      {/* Список тиров с количеством */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(tierStats).map(([tier, count]) => (
          <div
            key={tier}
            className="flex items-center gap-2"
          >
            <TierBadge
              tier={tier}
              interactive={!!onTierFilter}
              onClick={() => onTierFilter?.(tier)}
              className="text-xs"
            />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {count}
            </span>
          </div>
        ))}
      </div>

      {/* Прогресс-бар */}
      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(postsWithTiers / totalPosts) * 100}%` }}
        />
      </div>
    </div>
  )
} 