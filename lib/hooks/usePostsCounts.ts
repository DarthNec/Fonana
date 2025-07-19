import { useState, useEffect } from 'react'

// [media_only_tab_optimization_2025_017] Хук для получения счетчиков постов
interface PostsCounts {
  total: number
  counts: {
    all: number
    media: number
    image?: number
    video?: number
    audio?: number
    text?: number
  }
}

interface UsePostsCountsProps {
  creatorId?: string
  types?: string[]
  enabled?: boolean
}

export function usePostsCounts({ 
  creatorId, 
  types = ['image', 'video', 'audio', 'text'],
  enabled = true 
}: UsePostsCountsProps) {
  const [counts, setCounts] = useState<PostsCounts | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !creatorId) {
      setIsLoading(false)
      return
    }

    const fetchCounts = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const params = new URLSearchParams({
          creatorId,
          type: types.join(',')
        })

        const response = await fetch(`/api/posts/count?${params}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch counts: ${response.status}`)
        }

        const data = await response.json()
        setCounts(data)

        console.log('[usePostsCounts] Counts fetched:', data)
        
      } catch (err) {
        console.error('[usePostsCounts] Error:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch counts')
        setCounts(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCounts()
  }, [creatorId, types.join(','), enabled])

  return {
    counts,
    isLoading,
    error,
    // Удобные геттеры
    totalPosts: counts?.total || 0,
    mediaPosts: counts?.counts.media || 0,
    imagePosts: counts?.counts.image || 0,
    videoPosts: counts?.counts.video || 0,
    audioPosts: counts?.counts.audio || 0,
    textPosts: counts?.counts.text || 0
  }
} 