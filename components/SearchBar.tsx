'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { debounce } from 'lodash'
import Link from 'next/link'
import Avatar from './Avatar'

interface SearchBarProps {
  className?: string
  placeholder?: string
  onSearch?: (query: string, filters?: SearchFilters) => void
  showFilters?: boolean
  autoFocus?: boolean
}

interface SearchFilters {
  type?: 'all' | 'creators' | 'posts'
  category?: string
  minPrice?: number
  maxPrice?: number
  contentType?: 'image' | 'video' | 'audio'
  tier?: 'basic' | 'premium' | 'vip'
}

interface Suggestion {
  creators: any[]
  posts: any[]
  categories: string[]
}

export default function SearchBar({ 
  className = '', 
  placeholder = 'Поиск создателей, постов...',
  onSearch,
  showFilters = true,
  autoFocus = false
}: SearchBarProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion>({ creators: [], posts: [], categories: [] })
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({ type: 'all' })
  const searchRef = useRef<HTMLDivElement>(null)

  // Debounced автокомплит
  const fetchSuggestions = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length < 1) {
        setSuggestions({ creators: [], posts: [], categories: [] })
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(`/api/search/autocomplete?q=${encodeURIComponent(searchQuery)}&type=${filters.type}`)
        if (response.ok) {
          const data = await response.json()
          setSuggestions(data.suggestions)
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error)
      } finally {
        setIsLoading(false)
      }
    }, 300),
    [filters.type]
  )

  useEffect(() => {
    fetchSuggestions(query)
  }, [query, fetchSuggestions])

  // Закрытие предложений при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault()
    setShowSuggestions(false)
    
    if (onSearch) {
      onSearch(query, filters)
    } else {
      // Навигация на страницу поиска
      const params = new URLSearchParams({
        q: query,
        ...filters as any
      })
      router.push(`/search?${params.toString()}`)
    }
  }

  const handleSuggestionClick = (type: string, value: string) => {
    setShowSuggestions(false)
    
    if (type === 'category') {
      setFilters({ ...filters, category: value })
      handleSearch()
    } else if (type === 'creator') {
      router.push(`/creator/${value}`)
    } else if (type === 'post') {
      router.push(`/post/${value}`)
    }
  }

  const categories = ['Art', 'Music', 'Gaming', 'Lifestyle', 'Fitness', 
                     'Tech', 'DeFi', 'NFT', 'Trading', 'GameFi', 
                     'Blockchain', 'Intimate', 'Education', 'Comedy']

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <form onSubmit={handleSearch} className="relative">
        <div className="flex items-center">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder={placeholder}
              autoFocus={autoFocus}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setSuggestions({ creators: [], posts: [], categories: [] })
                }}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>
          
          {showFilters && (
            <button
              type="button"
              onClick={() => setShowFilterModal(true)}
              className="ml-2 p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              title="Фильтры"
            >
              <FunnelIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>
      </form>

      {/* Автокомплит предложения */}
      {showSuggestions && (suggestions.creators.length > 0 || suggestions.posts.length > 0 || suggestions.categories.length > 0 || isLoading) && (
        <div className="absolute top-full mt-2 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <div className="animate-pulse">Поиск...</div>
            </div>
          ) : (
            <>
              {/* Категории */}
              {suggestions.categories.length > 0 && (
                <div className="p-2">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 py-2">Категории</p>
                  {suggestions.categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => handleSuggestionClick('category', category)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <span className="text-purple-500">🏷️</span>
                      <span className="text-gray-900 dark:text-white">{category}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Создатели */}
              {suggestions.creators.length > 0 && (
                <div className="p-2 border-t border-gray-100 dark:border-slate-700">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 py-2">Создатели</p>
                  {suggestions.creators.map((creator) => (
                    <button
                      key={creator.id}
                      onClick={() => handleSuggestionClick('creator', creator.id)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-3"
                    >
                      <Avatar 
                        src={creator.avatar} 
                        alt={creator.nickname || creator.fullName}
                        size="sm"
                        verified={creator.isVerified}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 dark:text-white font-medium truncate">
                          {creator.fullName || creator.nickname}
                        </p>
                        {creator.nickname && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            @{creator.nickname}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Посты */}
              {suggestions.posts.length > 0 && (
                <div className="p-2 border-t border-gray-100 dark:border-slate-700">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 py-2">Посты</p>
                  {suggestions.posts.map((post) => (
                    <button
                      key={post.id}
                      onClick={() => handleSuggestionClick('post', post.id)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <p className="text-gray-900 dark:text-white font-medium truncate">
                        {post.title}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        от @{post.creator.nickname}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Модальное окно фильтров */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Фильтры поиска</h3>
              <button
                onClick={() => setShowFilterModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Тип поиска */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Искать
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['all', 'creators', 'posts'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilters({ ...filters, type: type as any })}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filters.type === type
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {type === 'all' ? 'Всё' : type === 'creators' ? 'Создатели' : 'Посты'}
                  </button>
                ))}
              </div>
            </div>

            {/* Категория */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Категория
              </label>
              <select
                value={filters.category || ''}
                onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white"
              >
                <option value="">Все категории</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Тип контента (только для постов) */}
            {(filters.type === 'posts' || filters.type === 'all') && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Тип контента
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: undefined, label: 'Все' },
                    { value: 'image', label: '📷 Фото' },
                    { value: 'video', label: '🎥 Видео' },
                    { value: 'audio', label: '🎵 Аудио' }
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => setFilters({ ...filters, contentType: item.value as any })}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        filters.contentType === item.value
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Уровень подписки */}
            {(filters.type === 'posts' || filters.type === 'all') && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Уровень доступа
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: undefined, label: 'Все' },
                    { value: 'basic', label: 'Basic' },
                    { value: 'premium', label: 'Premium' },
                    { value: 'vip', label: 'VIP' }
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => setFilters({ ...filters, tier: item.value as any })}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        filters.tier === item.value
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Диапазон цен */}
            {(filters.type === 'posts' || filters.type === 'all') && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Диапазон цен (SOL)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    value={filters.minPrice || ''}
                    onChange={(e) => setFilters({ ...filters, minPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="От"
                    step="0.01"
                    min="0"
                    className="flex-1 px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white"
                  />
                  <span className="text-gray-500">—</span>
                  <input
                    type="number"
                    value={filters.maxPrice || ''}
                    onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="До"
                    step="0.01"
                    min="0"
                    className="flex-1 px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* Кнопки действий */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setFilters({ type: 'all' })
                  setShowFilterModal(false)
                }}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                Сбросить
              </button>
              <button
                onClick={() => {
                  setShowFilterModal(false)
                  handleSearch()
                }}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all"
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 