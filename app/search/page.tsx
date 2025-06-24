'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import SearchBar from '@/components/SearchBar'
import PostCard from '@/components/PostCard'
import Avatar from '@/components/Avatar'
import Link from 'next/link'
import { UsersIcon, DocumentTextIcon, HashtagIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useSolRate } from '@/lib/hooks/useSolRate'
import SubscribeModal from '@/components/SubscribeModal'
import PurchaseModal from '@/components/PurchaseModal'
import EditPostModal from '@/components/EditPostModal'

interface SearchResults {
  creators: any[]
  posts: any[]
  total: number
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const { rate: solRate } = useSolRate()
  const [results, setResults] = useState<SearchResults>({ creators: [], posts: [], total: 0 })
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'all' | 'creators' | 'posts'>('all')
  const [filters, setFilters] = useState({
    type: 'all',
    category: '',
    minPrice: '',
    maxPrice: '',
    contentType: '',
    tier: ''
  })

  // Modals state
  const [subscribeModalData, setSubscribeModalData] = useState<any>(null)
  const [purchaseModalData, setPurchaseModalData] = useState<any>(null)
  const [editModalData, setEditModalData] = useState<any>(null)

  const query = searchParams.get('q') || ''

  const performSearch = useCallback(async (searchQuery: string, searchFilters: any = {}) => {
    if (!searchQuery || searchQuery.length < 2) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        ...searchFilters
      })

      const response = await fetch(`/api/search?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setResults(data.results)
        
        // Update selected tab based on results
        if (data.results.creators.length > 0 && data.results.posts.length === 0) {
          setSelectedTab('creators')
        } else if (data.results.posts.length > 0 && data.results.creators.length === 0) {
          setSelectedTab('posts')
        }
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (query) {
      performSearch(query, filters)
    }
  }, [query, performSearch])

  const handleSearch = (newQuery: string, newFilters: any = {}) => {
    setFilters(newFilters)
    performSearch(newQuery, newFilters)
  }

  const filteredResults = {
    creators: selectedTab === 'posts' ? [] : results.creators,
    posts: selectedTab === 'creators' ? [] : results.posts,
    total: selectedTab === 'all' ? results.total : 
           selectedTab === 'creators' ? results.creators.length : results.posts.length
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-24">
      <div className="container mx-auto px-4">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Результаты поиска
          </h1>
          
          {/* Search Bar */}
          <SearchBar 
            onSearch={handleSearch}
            autoFocus
            className="mb-6"
          />

          {/* Results Info */}
          {query && (
            <div className="flex items-center justify-between">
              <p className="text-gray-600 dark:text-gray-400">
                {isLoading ? (
                  'Поиск...'
                ) : (
                  <>
                    Найдено {filteredResults.total} результатов для <span className="font-semibold">"{query}"</span>
                  </>
                )}
              </p>

              {/* Tabs */}
              {!isLoading && results.total > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedTab('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedTab === 'all'
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Все
                  </button>
                  {results.creators.length > 0 && (
                    <button
                      onClick={() => setSelectedTab('creators')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                        selectedTab === 'creators'
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <UsersIcon className="w-4 h-4" />
                      Создатели ({results.creators.length})
                    </button>
                  )}
                  {results.posts.length > 0 && (
                    <button
                      onClick={() => setSelectedTab('posts')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                        selectedTab === 'posts'
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <DocumentTextIcon className="w-4 h-4" />
                      Посты ({results.posts.length})
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="space-y-8">
            {/* Loading skeletons */}
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* No Results */}
            {!query && (
              <div className="text-center py-12">
                <MagnifyingGlassIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  Введите поисковый запрос для поиска создателей и контента
                </p>
              </div>
            )}

            {query && filteredResults.total === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">
                  По запросу "{query}" ничего не найдено
                </p>
                <p className="text-gray-500 dark:text-gray-500">
                  Попробуйте изменить поисковый запрос или фильтры
                </p>
              </div>
            )}

            {/* Creators Results */}
            {filteredResults.creators.length > 0 && (
              <div className="mb-12">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <UsersIcon className="w-6 h-6" />
                  Создатели
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredResults.creators.map((creator) => (
                    <Link
                      key={creator.id}
                      href={`/creator/${creator.id}`}
                      className="bg-white dark:bg-slate-800 rounded-xl p-6 hover:shadow-lg transition-all hover:scale-105 group"
                    >
                      <div className="flex items-start gap-4">
                        <Avatar
                          src={creator.avatar}
                          alt={creator.nickname || creator.fullName}
                          size="lg"
                          verified={creator.isVerified}
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 truncate">
                            {creator.fullName || creator.nickname}
                          </h3>
                          {creator.nickname && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              @{creator.nickname}
                            </p>
                          )}
                          {creator.bio && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                              {creator.bio}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                            <span>{creator.followersCount || 0} подписчиков</span>
                            <span>{creator.postsCount || 0} постов</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Posts Results */}
            {filteredResults.posts.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <DocumentTextIcon className="w-6 h-6" />
                  Посты
                </h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredResults.posts.map((post) => (
                    <PostCard
                      key={post.id}
                      id={post.id}
                      creator={{
                        id: post.creator.id,
                        name: post.creator.fullName || post.creator.nickname,
                        username: post.creator.nickname,
                        nickname: post.creator.nickname,
                        avatar: post.creator.avatar,
                        isVerified: post.creator.isVerified
                      }}
                      content={post.content}
                      title={post.title}
                      createdAt={post.createdAt}
                      likes={post.likes || 0}
                      comments={post.comments || 0}
                      type={post.type as 'text' | 'image' | 'video' | 'audio'}
                      isLocked={post.isLocked}
                      image={post.mediaUrl}
                      mediaUrl={post.mediaUrl}
                      thumbnail={post.thumbnail}
                      price={post.price}
                      currency="SOL"
                      isPremium={post.isPremium}
                      requiredTier={post.minSubscriptionTier}
                      category={post.category}
                      imageAspectRatio={post.imageAspectRatio}
                      tags={[]}
                      onSubscribeClick={(creatorData: any) => setSubscribeModalData(creatorData)}
                      onPurchaseClick={(postData: any) => setPurchaseModalData(postData)}
                      onEditClick={(postData: any) => setEditModalData(postData)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {subscribeModalData && (
        <SubscribeModal
          creator={subscribeModalData}
          onClose={() => setSubscribeModalData(null)}
          onSuccess={() => {
            setSubscribeModalData(null)
            performSearch(query, filters) // Refresh results
          }}
        />
      )}

      {purchaseModalData && (
        <PurchaseModal
          post={purchaseModalData}
          onClose={() => setPurchaseModalData(null)}
          onSuccess={() => {
            setPurchaseModalData(null)
            performSearch(query, filters) // Refresh results
          }}
        />
      )}

      {editModalData && (
        <EditPostModal
          isOpen={true}
          post={editModalData}
          onClose={() => {
            setEditModalData(null)
            performSearch(query, filters) // Refresh results
          }}
        />
      )}
    </div>
  )
} 