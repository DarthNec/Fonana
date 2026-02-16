'use client'

import { UnifiedPost, PostAction } from '@/types/posts'
import { PostContent } from '@/components/posts/newCore/PostContent'

interface FullscreenPostCardProps {
  post: UnifiedPost
  onAction?: (action: PostAction) => void
  isFullscreen?: boolean // Флаг для fullscreen режима (убирает отступ max-md:pb-20)
}

/**
 * FullscreenPostCard с новым форматом PostContent
 */
export function FullscreenPostCard({ post, onAction, isFullscreen = true }: FullscreenPostCardProps) {
  return (
    <div className="w-full h-full flex items-center justify-center max-md:p-0 md:px-8">
      {/* Новый формат - контент с кнопками справа вплотную */}
      <PostContent
        post={post}
        onAction={onAction}
        isFullscreen={isFullscreen}
      />
    </div>
  )
}
