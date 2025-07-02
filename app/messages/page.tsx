'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ChatBubbleLeftEllipsisIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import OptimizedImage from '@/components/OptimizedImage'
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow'
import { useUser, useUserLoading } from '@/lib/store/appStore'
import { jwtManager } from '@/lib/utils/jwt'
import SkeletonLoader from '@/components/ui/SkeletonLoader'

interface Conversation {
  id: string
  participant: {
    id: string
    nickname: string
    fullName?: string
    avatar?: string
  }
  lastMessage?: {
    id: string
    content: string
    createdAt: string
    isPaid: boolean
    price?: number
    senderId: string
    senderName: string
  }
  lastMessageAt?: string
  unreadCount: number
}

export default function MessagesPage() {
  const router = useRouter()
  const user = useUser()
  const isUserLoading = useUserLoading()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  // Debug логирование для отслеживания race conditions
  useEffect(() => {
    console.log('[Messages][Debug] State update:', {
      user: user?.id ? `User ${user.id}` : 'No user',
      isUserLoading,
      isLoading,
      window: typeof window !== 'undefined' ? 'Client' : 'SSR'
    })
  }, [user, isUserLoading, isLoading])

  // Soft guard: предотвращаем рендер до готовности
  if (typeof window === 'undefined') {
    return null
  }

  // Soft guard: показываем loading до полной инициализации
  if (isUserLoading || !user) {
    return <SkeletonLoader variant="messages" />
  }

  useEffect(() => {
    if (user && !isUserLoading) {
      loadConversations()
    } else if (!isUserLoading && !user) {
      setIsLoading(false)
    }
  }, [user, isUserLoading])

  const loadConversations = async () => {
    try {
      const token = await jwtManager.getToken()
      if (!token) {
        console.error('No JWT token available')
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations)
      } else {
        console.error('Failed to load conversations:', await response.text())
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredConversations = conversations.filter(conv => {
    const searchLower = searchQuery.toLowerCase()
    return conv.participant.nickname?.toLowerCase().includes(searchLower) ||
           conv.participant.fullName?.toLowerCase().includes(searchLower)
  })

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 pt-24 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-gray-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-48 mx-auto" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 pt-24 flex items-center justify-center">
        <div className="text-center">
          <ChatBubbleLeftEllipsisIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Connect Your Wallet
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please connect your wallet to access messages
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 pt-20 pb-20">
      <div className="max-w-2xl mx-auto px-0 sm:px-4">
        {/* Compact header with search */}
        <div className="mb-4 px-4 sm:px-0">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Messages</h1>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              aria-label="Toggle search"
            >
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-600 dark:text-slate-400" />
            </button>
          </div>
          
          {/* Collapsible search input */}
          {showSearch && (
            <div className="animate-fade-in">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Conversations List */}
        {isLoading ? (
          <div className="space-y-4 px-4 sm:px-0">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-slate-700 rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4 mb-2" />
                      <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length > 0 ? (
          <div className="space-y-2 sm:space-y-3">
            {filteredConversations.map(conv => (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                className="block bg-white dark:bg-slate-800/50 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-none sm:rounded-xl p-4 transition-all border-b sm:border-0 border-gray-100 dark:border-slate-700/50 mx-0 sm:mx-0"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <OptimizedImage
                      src={conv.participant.avatar || null}
                      alt={conv.participant.nickname}
                      className="w-12 h-12 rounded-full"
                    />
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {conv.participant.fullName || conv.participant.nickname}
                      </h3>
                      {conv.lastMessage && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                          {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    
                    {conv.lastMessage && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {conv.lastMessage.isPaid ? (
                          <span className="flex items-center gap-1">
                            <SparklesIcon className="w-4 h-4 text-yellow-500" />
                            <span className="text-yellow-600 dark:text-yellow-400">
                              Paid message • ${conv.lastMessage.price}
                            </span>
                          </span>
                        ) : (
                          conv.lastMessage.content
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : searchQuery ? (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No results found
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Try searching with a different term
            </p>
          </div>
        ) : (
          <div className="text-center py-12">
            <ChatBubbleLeftEllipsisIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No conversations yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start a conversation with your favorite creators
            </p>
            <Link
              href="/creators"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-xl transition-all transform hover:scale-105"
            >
              <PlusIcon className="w-5 h-5" />
              Browse Creators
            </Link>
          </div>
        )}
      </div>
    </div>
  )
} 