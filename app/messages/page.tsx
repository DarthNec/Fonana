'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import { 
  ChatBubbleLeftEllipsisIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import OptimizedImage from '@/components/OptimizedImage'
import formatDistanceToNow from 'date-fns/formatDistanceToNow'

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
  const { publicKey } = useWallet()
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (publicKey) {
      loadConversations()
    }
  }, [publicKey])

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/conversations', {
        headers: {
          'x-user-wallet': publicKey?.toString() || ''
        }
      })

      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations)
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

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-24 flex items-center justify-center">
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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Messages
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Chat with creators and fans
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Conversations List */}
        {isLoading ? (
          <div className="space-y-4">
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
          <div className="space-y-4">
            {filteredConversations.map(conv => (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                className="block bg-white dark:bg-slate-800 rounded-xl p-4 hover:shadow-lg transition-shadow border border-gray-200 dark:border-slate-700"
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