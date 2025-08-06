'use client'

import { useState, useEffect } from 'react'
import { useUser, useJwtReady } from '@/lib/store/appStore'
import { ChatBubbleLeftEllipsisIcon, UserIcon } from '@heroicons/react/24/outline'
import { jwtManager } from '@/lib/utils/jwt'
import Link from 'next/link'
import Avatar from './Avatar'
import { useQuery } from '@tanstack/react-query'
import { EnterpriseErrorBoundary } from '@/components/ui/EnterpriseErrorBoundary'
import { EnterpriseError } from '@/components/ui/EnterpriseError'
import { unreadMessagesService } from '@/lib/services/UnreadMessagesService'

interface Conversation {
  id: string
  lastMessageAt: string
  participant: {
    id: string
    nickname: string
    fullName?: string
    avatar?: string
  }
  lastMessage?: {
    content?: string
    mediaType?: string
    isPaid: boolean
    createdAt: string
  }
  unreadCount?: number
}

function MessagesPageClientInner() {
  const user = useUser()
  const isJwtReady = true;
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 🔥 DEBUG: Добавляем отладочную информацию
  console.log('[MessagesPageClient] Debug state:', {
    hasUser: !!user,
    userId: user?.id,
    isJwtReady,
    isLoading,
    error
  })

  // Обновляем счетчик непрочитанных сообщений при загрузке страницы
  useEffect(() => {
    if (user?.id) {
      console.log('[MessagesPageClient] Refreshing unread count on page load')
      unreadMessagesService.refresh()
    }
  }, [user?.id])

  // 🔥 ENTERPRISE PHASE 1.3: Enhanced React Query with error handling
  const { data: conversationsData, isLoading: isLoadingConversations, error: queryError, refetch: refetchConversations } = useQuery({
    queryKey: ['conversations', user?.id || ''],
    queryFn: async () => {
      console.info('[ENTERPRISE QUERY] Loading conversations for user:', user?.id)
      const token = await jwtManager.getToken()
      
      console.info('[ENTERPRISE QUERY] JWT token:', token ? token.substring(0, 20) + '...' : 'null')
      
      if (!token) {
        throw new Error('Authentication required - no JWT token available')
      }

      console.info('[ENTERPRISE QUERY] Making API request to /api/conversations')
      const response = await fetch('/api/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      console.info('[ENTERPRISE QUERY] API response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[ENTERPRISE QUERY] API error response:', errorText)
        throw new Error(`Failed to load conversations: HTTP ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.info('[ENTERPRISE QUERY] API response data:', data)
      
      if (!data.conversations || !Array.isArray(data.conversations)) {
        throw new Error('Invalid API response format: expected conversations array')
      }

      console.info(`[ENTERPRISE QUERY] Successfully loaded ${data.conversations.length} conversations`)
      return data.conversations
    },
    enabled: !!user?.id && isJwtReady,
    staleTime: 1 * 60 * 1000,
    refetchInterval: 30 * 1000,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  })

  // 🔥 ENTERPRISE ERROR HANDLING: Show error if conversations failed to load
  if (queryError) {
    return (
      <EnterpriseError
        error={queryError as Error}
        context="MessagesPageClient"
        onRetry={refetchConversations}
        queryKey={['conversations', user?.id || '']}
        fallbackData={[]}
      />
    )
  }

  // 🔥 DUPLICATE STATE BUG: This should be removed in Phase 2
  useEffect(() => {
    if (conversationsData) {
      setConversations(conversationsData)
      setIsLoading(false)
    }
    if (queryError) {
      setError((queryError as Error).message)
      setIsLoading(false)
    }
  }, [conversationsData, queryError])

  // 🔥 M7: loadConversations removed - using React Query

  const formatLastMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    }
  }

  const getLastMessagePreview = (message: any) => {
    if (!message) return 'No messages yet'
    
    if (message.mediaType) {
      return message.mediaType === 'image' ? '📷 Photo' : '🎥 Video'
    }
    
    if (message.isPaid) {
      return '💰 Paid message'
    }
    
    return message.content || 'Message'
  }

  if (!user) {
    console.log('[MessagesPageClient] Rendering "Loading chats" - no user yet')
    return (
      <div className="flex items-center justify-center min-h-screen pt-20">
        <div className="text-center">
          <ChatBubbleLeftEllipsisIcon className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Прогружаем ваши чаты...
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Подождите, загружаем ваши сообщения
          </p>
        </div>
      </div>
    )
  }

  // 🔥 ПРОВЕРЯЕМ JWT ТОЛЬКО ПОСЛЕ ЗАГРУЗКИ ПОЛЬЗОВАТЕЛЯ
  if (user && !isJwtReady) {
    console.log('[MessagesPageClient] User loaded, checking JWT token...')
    return (
      <div className="flex items-center justify-center min-h-screen pt-20">
        <div className="text-center">
          <ChatBubbleLeftEllipsisIcon className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Проверяем авторизацию
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Настраиваем безопасное соединение...
          </p>
          {/* 🔥 DEBUG: Добавляем отладочную информацию */}
          <div className="mt-4 text-xs text-gray-500">
            Debug: User ID: {user?.id}, JWT Ready: {isJwtReady ? 'true' : 'false'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-20 pb-20">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
          Messages
        </h1>
        
        {isLoading ? (
          <div className="text-center py-12">
            <ChatBubbleLeftEllipsisIcon className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600 dark:text-gray-400">Loading conversations...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <h3 className="text-red-800 dark:text-red-400 font-medium mb-2">Error Loading Messages</h3>
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              <button
                onClick={() => refetchConversations()}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12">
            <ChatBubbleLeftEllipsisIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No conversations yet</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Start a conversation with a creator to see it here
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/messages/${conversation.id}`}
                className="block bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-lg p-4 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {conversation.participant?.avatar ? (
                      <Avatar
                        src={conversation.participant.avatar}
                        alt={conversation.participant.nickname || 'User'}
                        size={48}
                        seed={conversation.participant.nickname || conversation.participant.id}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-300 dark:bg-slate-600 rounded-full flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-gray-500 dark:text-slate-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {conversation.participant?.fullName || conversation.participant?.nickname || 'Unknown User'}
                      </h3>
                      {conversation.lastMessage && (
                        <span className="text-xs text-gray-500 dark:text-slate-400 flex-shrink-0 ml-2">
                          {formatLastMessageTime(conversation.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {getLastMessagePreview(conversation.lastMessage)}
                      </p>
                      
                      {conversation.unreadCount && conversation.unreadCount > 0 && (
                        <span className="bg-purple-600 text-white text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ml-2">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MessagesPageClient() {
  return (
    <EnterpriseErrorBoundary 
      context="MessagesPageClient"
      queryKey={['conversations']}
    >
      <MessagesPageClientInner />
    </EnterpriseErrorBoundary>
  )
}
