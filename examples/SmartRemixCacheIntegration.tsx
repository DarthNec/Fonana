// examples/SmartRemixCacheIntegration.tsx
// Пример интеграции умного кэширования ремиксов в FeedPageClient

import React from 'react'
import { PostAPI } from '@/types/posts'
import { SmartRemixIndicator } from '@/components/posts/core/SmartRemixIndicator'
import { CacheStrategy, CachePriority } from '@/lib/cache/RemixChainCache'
import { useSmartRemixBatch } from '@/lib/hooks/useSmartRemixCache'

/**
 * Пример 1: Минимальная интеграция в PostCard
 */
function PostCardWithRemixIndicator({ post }: { post: PostAPI }) {
  return (
    <div className="post-card">
      {/* Основной контент поста */}
      <div className="post-content">
        <h3>{post.title}</h3>
        <p>{post.content}</p>
      </div>
      
      {/* Умный индикатор ремиксов - показывается только если есть ремиксы */}
      <SmartRemixIndicator
        post={post}
        variant="compact"
        cacheStrategy={CacheStrategy.HYBRID}
        cachePriority={CachePriority.MEDIUM}
        showOnHover={true}
        enablePrefetch={true}
        onRemixClick={(remix) => {
          // Навигация к ремиксу
          window.location.href = `/posts/${remix.id}`
        }}
      />
    </div>
  )
}

/**
 * Пример 2: Интеграция в FeedPageClient с batch загрузкой
 */
function OptimizedFeedWithRemixCache({ posts }: { posts: PostAPI[] }) {
  // Batch загрузка цепочек ремиксов для всех постов с ремиксами
  const postsWithRemixes = posts.filter(p => p.remixId || (p as any).hasRemixesCount)
  const { data: batchData, isLoading } = useSmartRemixBatch(
    postsWithRemixes.map(p => p.id),
    {
      strategy: CacheStrategy.HYBRID,
      priority: CachePriority.MEDIUM,
      enablePrefetch: true
    }
  )

  return (
    <div className="feed">
      {posts.map((post, index) => (
        <div key={post.id} className="post-item">
          {/* Основной контент поста */}
          <PostContent post={post} />
          
          {/* Умный индикатор ремиксов с разными приоритетами */}
          <SmartRemixIndicator
            post={post}
            variant="compact"
            cacheStrategy={CacheStrategy.HYBRID}
            cachePriority={
              index < 3 ? CachePriority.HIGH :     // Первые 3 поста - высокий приоритет
              index < 10 ? CachePriority.MEDIUM :  // Следующие 7 - средний
              CachePriority.LOW                    // Остальные - низкий
            }
            enablePrefetch={index < 5} // Предзагрузка только для первых 5 постов
            showOnHover={true}
            onRemixClick={(remix) => navigateToPost(remix.id)}
          />
        </div>
      ))}
      
      {/* Индикатор загрузки batch данных */}
      {isLoading && (
        <div className="batch-loading">
          Loading remix chains...
        </div>
      )}
    </div>
  )
}

/**
 * Пример 3: Поэтапное внедрение
 */
function ProgressiveRemixIntegration({ posts }: { posts: PostAPI[] }) {
  const [phase, setPhase] = React.useState<1 | 2 | 3>(1)

  return (
    <div className="progressive-feed">
      {/* Переключатель фаз */}
      <div className="phase-selector">
        <button onClick={() => setPhase(1)} className={phase === 1 ? 'active' : ''}>
          Phase 1: Minimal
        </button>
        <button onClick={() => setPhase(2)} className={phase === 2 ? 'active' : ''}>
          Phase 2: Lazy Loading
        </button>
        <button onClick={() => setPhase(3)} className={phase === 3 ? 'active' : ''}>
          Phase 3: Smart Prefetch
        </button>
      </div>

      {/* Посты с разными стратегиями в зависимости от фазы */}
      {posts.map(post => (
        <div key={post.id} className="post-item">
          <PostContent post={post} />
          
          {phase === 1 && (
            // Фаза 1: Только индикаторы без загрузки
            <SmartRemixIndicator
              post={post}
              variant="minimal"
              cacheStrategy={CacheStrategy.MEMORY_ONLY}
              enablePrefetch={false}
              showOnHover={false}
            />
          )}
          
          {phase === 2 && (
            // Фаза 2: Ленивая загрузка при взаимодействии
            <SmartRemixIndicator
              post={post}
              variant="compact"
              cacheStrategy={CacheStrategy.HYBRID}
              enablePrefetch={false}
              showOnHover={true} // Предзагрузка при наведении
            />
          )}
          
          {phase === 3 && (
            // Фаза 3: Умная предзагрузка
            <SmartRemixIndicator
              post={post}
              variant="full"
              cacheStrategy={CacheStrategy.AGGRESSIVE}
              cachePriority={CachePriority.HIGH}
              enablePrefetch={true}
              prefetchOnVisible={true}
              autoExpand={false}
            />
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * Пример 4: Мониторинг производительности
 */
function RemixCacheMonitor() {
  const [metrics, setMetrics] = React.useState<any>(null)

  React.useEffect(() => {
    const interval = setInterval(async () => {
      const { remixChainCache } = await import('@/lib/cache/RemixChainCache')
      setMetrics(remixChainCache.getMetrics())
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  if (!metrics) return null

  return (
    <div className="cache-monitor">
      <h3>Remix Cache Performance</h3>
      <div className="metrics-grid">
        <div className="metric">
          <label>Hit Rate</label>
          <span className={metrics.hitRate > 0.8 ? 'good' : metrics.hitRate > 0.6 ? 'ok' : 'poor'}>
            {(metrics.hitRate * 100).toFixed(1)}%
          </span>
        </div>
        
        <div className="metric">
          <label>Memory Usage</label>
          <span>{metrics.memoryUsage} entries</span>
        </div>
        
        <div className="metric">
          <label>Avg Response Time</label>
          <span>{metrics.averageResponseTime.toFixed(1)}ms</span>
        </div>
        
        <div className="metric">
          <label>Cache Size</label>
          <span>{metrics.persistentUsage} persistent</span>
        </div>
      </div>
      
      <div className="cache-actions">
        <button onClick={() => {
          import('@/lib/cache/RemixChainCache').then(({ remixChainCache }) => {
            remixChainCache.clear()
            console.log('Cache cleared')
          })
        }}>
          Clear Cache
        </button>
      </div>
    </div>
  )
}

/**
 * Пример 5: Адаптивная стратегия кэширования
 */
function AdaptiveRemixCaching({ posts }: { posts: PostAPI[] }) {
  // Определяем стратегию на основе условий
  const getCacheStrategy = React.useCallback(() => {
    const isMobile = window.innerWidth < 768
    const connection = (navigator as any).connection
    const isSlowConnection = connection?.effectiveType === '2g'
    
    if (isSlowConnection) {
      return {
        strategy: CacheStrategy.PERSISTENT, // Дольше храним на медленном соединении
        priority: CachePriority.HIGH,
        enablePrefetch: false
      }
    }
    
    if (isMobile) {
      return {
        strategy: CacheStrategy.HYBRID,
        priority: CachePriority.MEDIUM,
        enablePrefetch: true
      }
    }
    
    return {
      strategy: CacheStrategy.AGGRESSIVE,
      priority: CachePriority.HIGH,
      enablePrefetch: true
    }
  }, [])

  const cacheConfig = getCacheStrategy()

  return (
    <div className="adaptive-feed">
      {posts.map(post => (
        <div key={post.id} className="post-item">
          <PostContent post={post} />
          
          <SmartRemixIndicator
            post={post}
            variant="compact"
            cacheStrategy={cacheConfig.strategy}
            cachePriority={cacheConfig.priority}
            enablePrefetch={cacheConfig.enablePrefetch}
            showOnHover={true}
          />
        </div>
      ))}
    </div>
  )
}

// Вспомогательные компоненты
function PostContent({ post }: { post: PostAPI }) {
  return (
    <div className="post-content">
      <h3>{post.title}</h3>
      <p>{post.content}</p>
      <div className="post-meta">
        by {post.creator.nickname} • {new Date(post.createdAt).toLocaleDateString()}
      </div>
    </div>
  )
}

function navigateToPost(postId: string) {
  // Навигация к посту
  window.location.href = `/posts/${postId}`
}

export {
  PostCardWithRemixIndicator,
  OptimizedFeedWithRemixCache,
  ProgressiveRemixIntegration,
  RemixCacheMonitor,
  AdaptiveRemixCaching
}
