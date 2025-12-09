'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser, useJwtReady } from '@/lib/store/appStore'
import { 
  ChatBubbleLeftEllipsisIcon, 
  UserIcon, 
  EllipsisVerticalIcon, 
  TrashIcon, 
  XMarkIcon, 
  PaperAirplaneIcon, 
  ArrowPathIcon,
  PhotoIcon,
  VideoCameraIcon,
  CurrencyDollarIcon,
  GiftIcon,
  LockClosedIcon,
  CheckCircleIcon,
  SparklesIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import { EyeIcon } from '@heroicons/react/24/solid'
import { jwtManager } from '@/lib/utils/jwt'
import Link from 'next/link'
import Avatar from './Avatar'
import { useQuery } from '@tanstack/react-query'
import { EnterpriseErrorBoundary } from '@/components/ui/EnterpriseErrorBoundary'
import { EnterpriseError } from '@/components/ui/EnterpriseError'
import { unreadMessagesService } from '@/lib/services/UnreadMessagesService'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useWallet } from '@/lib/hooks/useSafeWallet'
import { useConnection } from '@solana/wallet-adapter-react'
import { createPostPurchaseTransaction, createTipTransaction, calculatePaymentDistribution, formatSolAmount } from '@/lib/solana/payments'
import { isValidSolanaAddress } from '@/lib/solana/config'
import { useSolRate } from '@/lib/hooks/useSolRate'
import { formatSolToUsd } from '@/lib/utils/format'

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

interface Creator {
  id: string
  nickname: string
  fullName?: string
  avatar?: string
  bio?: string
}

interface Message {
  id: string
  content?: string | null
  mediaUrl?: string | null
  mediaType?: string | null
  isPaid: boolean
  price?: number
  isPurchased: boolean
  isEdited?: boolean
  isDeleted?: boolean
  purchases?: Array<{ id: string; userId: string }>
  sender: {
    id: string
    nickname: string
    fullName?: string
    avatar?: string
  }
  isOwn: boolean
  isRead: boolean
  createdAt: string
  metadata?: {
    type?: string
    amount?: number
    tipLevel?: 'small' | 'medium' | 'large' | 'legendary'
    senderName?: string
    creatorName?: string
  }
  isPending?: boolean
  isFailed?: boolean
  tempId?: string
  isNew?: boolean
}

function MessagesPageClientInner() {
  const user = useUser()
  const router = useRouter()
  const { publicKey, sendTransaction } = useWallet()
  const publicKeyString = publicKey?.toBase58() ?? null
  const { connection } = useConnection()
  const { rate: solRate } = useSolRate()
  
  const isJwtReady = true;
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [conversationIdForDelete, setConversationIdForDelete] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [showCreatorsModal, setShowCreatorsModal] = useState(false)
  const [creators, setCreators] = useState<Creator[]>([])
  const [isLoadingCreators, setIsLoadingCreators] = useState(false)
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isFirstLoad, setIsFirstLoad] = useState(true)
  
  // Tips states
  const [showTipModal, setShowTipModal] = useState(false)
  const [tipAmount, setTipAmount] = useState('')
  const [isSendingTip, setIsSendingTip] = useState(false)
  
  // Paid messages states
  const [isPaidMessage, setIsPaidMessage] = useState(false)
  const [messagePrice, setMessagePrice] = useState('')
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null)
  
  // Media states
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  
  // Settings modal
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  
  const menuRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Определяем, мобилка ли это
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 🔥 DEBUG: Добавляем отладочную информацию
  console.log('[MessagesPageClient] Debug state:', {
    hasUser: !!user,
    userId: user?.id,
    isJwtReady,
    isLoading,
    error
  })

  // Закрытие меню при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null)
      }
    }
    
    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMenuId])

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

  // Функция удаления чата (без аутентификации)
  const deleteConversation = async (conversationId: string) => {
    try {
      console.log('[deleteConversation] Deleting conversation:', conversationId)

      const response = await fetch(`/api/conversations/mobile?conversationId=${conversationId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete conversation')
      }

      const result = await response.json()
      console.log('[deleteConversation] Delete result:', result)

      // Удаляем чат из локального состояния
      setConversations(prev => prev.filter(conv => conv.id !== conversationId))
      
      // Обновляем данные через React Query
      refetchConversations()
      setConversationIdForDelete(null)
      console.log('[deleteConversation] Conversation deleted successfully:', conversationId)
    } catch (error) {
      console.error('[deleteConversation] Error:', error)
      throw error
    }
  }

  // Функция загрузки криэйторов
  const loadCreators = async () => {
    try {
      setIsLoadingCreators(true)
      const response = await fetch('/api/creators')
      
      if (!response.ok) {
        throw new Error('Failed to load creators')
      }

      const data = await response.json()
      console.log('[loadCreators] API response:', data)
      
      // API возвращает { creators: [...], totalCount: X }
      setCreators(data.creators || [])
    } catch (error) {
      console.error('[loadCreators] Error:', error)
      setCreators([])
    } finally {
      setIsLoadingCreators(false)
    }
  }

  // Функция загрузки сообщений
  const loadMessages = async (conversationId: string, isPolling: boolean = false) => {
    try {
      // Показываем loading только при первой загрузке, не при polling
      if (!isPolling && isFirstLoad) {
        setIsLoadingMessages(true)
      }
      
      const token = await jwtManager.getToken()
      
      if (!token) {
        console.error('No JWT token available')
        return
      }

      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
        
        // После первой успешной загрузки сбрасываем флаг
        if (isFirstLoad) {
          setIsFirstLoad(false)
        }
      } else {
        console.error('Failed to load messages')
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      if (!isPolling) {
        setIsLoadingMessages(false)
      }
    }
  }

  // Функция загрузки медиа
  const uploadMedia = async (file: File): Promise<string | null> => {
    setIsUploadingMedia(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', file.type.startsWith('image/') ? 'image' : 'video')

      const response = await fetch('/api/upload/message', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        return data.url
      } else {
        toast.error('Failed to upload media')
        return null
      }
    } catch (error) {
      console.error('Error uploading media:', error)
      toast.error('Failed to upload media')
      return null
    } finally {
      setIsUploadingMedia(false)
    }
  }

  // Обработчик выбора медиа
  const handleMediaSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 100 * 1024 * 1024) {
      toast.error('File size must be less than 100MB')
      return
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only images and videos are allowed')
      return
    }

    setSelectedMedia(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setMediaPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Функция отправки сообщения
  const sendMessage = async () => {
    if ((!messageText.trim() && !selectedMedia) || isSending || !selectedConversationId) return

    if (isPaidMessage && (!messagePrice || parseFloat(messagePrice) <= 0)) {
      toast.error('Please set a valid price for paid message')
      return
    }

    const originalMessageText = messageText
    const originalSelectedMedia = selectedMedia
    const originalIsPaidMessage = isPaidMessage
    const originalMessagePrice = messagePrice
    
    setMessageText('')
    setIsPaidMessage(false)
    setMessagePrice('')
    setSelectedMedia(null)
    setMediaPreview(null)
    setIsSending(true)
    
    try {
      const token = await jwtManager.getToken()
      if (!token) {
        throw new Error('No authentication token')
      }

      let mediaUrl = null
      let mediaType = null

      if (originalSelectedMedia) {
        mediaUrl = await uploadMedia(originalSelectedMedia)
        if (!mediaUrl) {
          throw new Error('Failed to upload media')
        }
        mediaType = originalSelectedMedia.type.startsWith('image/') ? 'image' : 'video'
      }

      const response = await fetch(`/api/conversations/${selectedConversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: originalMessageText || null,
          mediaUrl,
          mediaType,
          isPaid: originalIsPaidMessage,
          price: originalIsPaidMessage ? parseFloat(originalMessagePrice) : null
        })
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => [...prev, data.message])
        
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  // Функция отправки tips
  const sendTip = async () => {
    if (!publicKeyString || !tipAmount || isSendingTip || !selectedConversationId) return

    const amount = parseFloat(tipAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid tip amount')
      return
    }

    const selectedConversation = conversations.find(c => c.id === selectedConversationId)
    if (!selectedConversation) return

    setIsSendingTip(true)
    
    try {
      const creatorResponse = await fetch(`/api/creators/${selectedConversation.participant.id}`)
      const creatorData = await creatorResponse.json()
      
      if (!creatorData.creator) {
        throw new Error('Failed to load creator data')
      }
      
      const creatorWallet = creatorData.creator.solanaWallet || creatorData.creator.wallet
      
      if (!creatorWallet || !isValidSolanaAddress(creatorWallet)) {
        toast.error('Creator wallet not configured')
        return
      }

      if (!publicKey) {
        throw new Error('Public key is not available')
      }
      
      const transaction = await createTipTransaction(
        publicKey,
        creatorWallet,
        amount
      )
      
      const sendOptions = {
        skipPreflight: false,
        preflightCommitment: 'confirmed' as any,
        maxRetries: 3
      }
      
      const signature = await sendTransaction(transaction, connection, sendOptions)
      
      toast.loading('Waiting for blockchain confirmation...')
      await new Promise(resolve => setTimeout(resolve, 10000))

      const token = await jwtManager.getToken()
      if (!token) {
        throw new Error('No authentication token')
      }

      const response = await fetch('/api/tips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          creatorId: selectedConversation.participant.id,
          amount,
          txSignature: signature,
          conversationId: selectedConversationId
        })
      })

      if (response.ok) {
        toast.success(`Sent ${formatSolAmount(amount)} tip!`)
        setShowTipModal(false)
        setTipAmount('')
        
        // Reload messages to show tip message
        loadMessages(selectedConversationId, false)
      } else {
        const error = await response.json()
        console.error('Backend error:', error)
        toast.error('Tip sent but failed to record. Please contact support.')
      }
    } catch (error) {
      console.error('Error sending tip:', error)
      
      let errorMessage = 'Failed to send tip'
      
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          errorMessage = 'Transaction cancelled'
        } else if (error.message.includes('insufficient')) {
          errorMessage = 'Insufficient balance'
        }
      }
      
      toast.error(errorMessage)
    } finally {
      setIsSendingTip(false)
    }
  }

  // Функция покупки платного сообщения
  const purchaseMessage = async (message: Message) => {
    if (!publicKeyString || !message.price) return

    const selectedConversation = conversations.find(c => c.id === selectedConversationId)
    if (!selectedConversation) return

    setIsPurchasing(message.id)
    
    try {
      const creatorResponse = await fetch(`/api/creators/${selectedConversation.participant.id}`)
      const creatorData = await creatorResponse.json()
      
      if (!creatorData.creator) {
        throw new Error('Failed to load creator data')
      }
      
      const creator = creatorData.creator
      const creatorWallet = creator.solanaWallet || creator.wallet
      const referrerWallet = creator.referrer?.solanaWallet || creator.referrer?.wallet
      const hasReferrer = creator.referrerId && referrerWallet && isValidSolanaAddress(referrerWallet)
      
      if (!creatorWallet || !isValidSolanaAddress(creatorWallet)) {
        toast.error('Creator wallet not configured')
        return
      }
      
      const distribution = calculatePaymentDistribution(
        message.price,
        creatorWallet,
        hasReferrer,
        referrerWallet
      )

      if (!publicKey) {
        throw new Error('Public key is not available')
      }
      
      const transaction = await createPostPurchaseTransaction(
        publicKey,
        distribution
      )

      const sendOptions = {
        skipPreflight: false,
        preflightCommitment: 'confirmed' as any,
        maxRetries: 3
      }
      
      const signature = await sendTransaction(transaction, connection, sendOptions)
      
      toast.loading('Waiting for blockchain confirmation...')
      await new Promise(resolve => setTimeout(resolve, 10000))

      const jwtToken = await jwtManager.getToken()
      if (!jwtToken) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/messages/${message.id}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ 
          txSignature: signature,
          price: message.price
        })
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => prev.map(msg => 
          msg.id === message.id 
            ? { 
                ...msg, 
                content: data.message.content,
                mediaUrl: data.message.mediaUrl,
                isPurchased: true 
              }
            : msg
        ))
        toast.success('Message unlocked!')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to unlock message')
      }
    } catch (error) {
      console.error('Error purchasing message:', error)
      
      let errorMessage = 'Failed to purchase message'
      
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          errorMessage = 'Transaction cancelled'
        } else if (error.message.includes('insufficient')) {
          errorMessage = 'Insufficient balance'
        }
      }
      
      toast.error(errorMessage)
    } finally {
      setIsPurchasing(null)
    }
  }

  // Загружаем сообщения при выборе чата
  useEffect(() => {
    if (selectedConversationId && !isMobile) {
      // Первая загрузка
      setIsFirstLoad(true)
      loadMessages(selectedConversationId, false)
      
      // Polling для новых сообщений (каждые 5 секунд, БЕЗ loading индикатора)
      const interval = setInterval(() => {
        loadMessages(selectedConversationId, true)
      }, 5000)
      
      return () => {
        clearInterval(interval)
        setIsFirstLoad(true) // Сбрасываем при размонтировании
      }
    }
  }, [selectedConversationId, isMobile])

  // Функция начала чата с криэйтором
  const startConversationWithCreator = async (creatorId: string) => {
    try {
      const token = await jwtManager.getToken()
      
      if (!token) {
        console.error('[startConversation] No JWT token available')
        return
      }

      // Создаем или находим существующую беседу
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ participantId: creatorId })
      })

      if (!response.ok) {
        throw new Error('Failed to create conversation')
      }

      const { conversationId } = await response.json()
      
      // Обновляем список conversations
      await refetchConversations()
      
      // Закрываем модалку
      setShowCreatorsModal(false)
      
      // На desktop открываем в правой панели, на мобилке переходим на страницу
      if (isMobile) {
        router.push(`/messages/${conversationId}`)
      } else {
        setSelectedConversationId(conversationId)
      }
    } catch (error) {
      console.error('[startConversation] Error:', error)
    }
  }

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
  console.log('[MessagesPageClient] Conversations:', conversations);
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

  // Обработчик клика на чат
  const handleConversationClick = (conversationId: string) => {
    if (isMobile) {
      // На мобилке переходим на отдельную страницу
      router.push(`/messages/${conversationId}`)
    } else {
      // На desktop открываем в правой панели
      setSelectedConversationId(conversationId)
    }
  }

  // Получаем данные выбранного участника
  const selectedConversation = conversations.find(c => c.id === selectedConversationId)

  // Показываем правую панель только если есть хотя бы 1 чат
  const showRightPanel = !isMobile && conversations.length > 0 && !isLoading

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-4 sm:pt-20 pb-20">
      <div className={`${showRightPanel ? 'max-w-7xl' : 'max-w-2xl'} mx-auto px-4`}>
        <div className={`${showRightPanel ? 'grid grid-cols-3 gap-4' : ''}`}>
          {/* Левая панель - список чатов (на desktop всегда видна, на мобилке скрыта когда открыт чат) */}
          <div className={`${showRightPanel ? 'col-span-1' : ''}`}>
            {/* Заголовок с настройками */}
            {!isMobile && conversations.length > 0 && (
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Messages
                </h2>
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Settings"
                >
                  <Cog6ToothIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            )}
            
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
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start a conversation with a creator to see it here
            </p>
            <button
              onClick={() => {
                setShowCreatorsModal(true)
                loadCreators()
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
              Start Conversation
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => handleConversationClick(conversation.id)}
                className={`block bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-lg p-4 transition-colors cursor-pointer ${
                  selectedConversationId === conversation.id && !isMobile ? 'ring-2 ring-purple-500' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                  <Avatar
                        src={conversation.participant.avatar}
                        alt={conversation.participant.nickname || 'User'}
                        size={48}
                        seed={conversation.participant.nickname || conversation.participant.id}
                      />
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
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate flex-1 mr-2">
                        {getLastMessagePreview(conversation.lastMessage)}
                      </p>
                      
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {conversation.unreadCount && conversation.unreadCount > 0 && (
                          <span className="bg-purple-600 text-white text-xs font-medium px-2 py-1 rounded-full">
                            {conversation.unreadCount}
                          </span>
                        )}
                        
                        {/* Menu button */}
                        <div className="relative" ref={menuRef}>
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setConversationIdForDelete(conversation.id)
                              setOpenMenuId(openMenuId === conversation.id ? null : conversation.id)
                            }}
                            className="p-1 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          >
                            <EllipsisVerticalIcon className="w-4 h-4" />
                          </button>
                          
                          {/* Desktop dropdown menu */}
                          {openMenuId === conversation.id && (
                            <>
                              {/* Desktop menu */}
                              <div 
                                className="hidden md:block absolute right-0 top-8 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-150 min-w-[120px]"
                                onClick={(e) => console.log('Clicked on menu:', e)}
                              >
                                <button
                                  onClick={async (e) => {
                                    console.log('Deleting conversation:', conversation.id)
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setOpenMenuId(null)
                                    console.log('Deleting conversation:', conversation.id)
                                    await deleteConversation(conversation.id)
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                  Delete
                                </button>
                              </div>

                              
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
          </div>

          {/* Правая панель - содержимое чата (только на desktop и если есть чаты) */}
          {showRightPanel && (
            <div className="col-span-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
              {selectedConversationId ? (
                selectedConversation ? (
                  <div className="h-[calc(100vh-8rem)]">
                    <div className="border-b border-gray-200 dark:border-slate-700 p-4">
                      <div className="flex items-center justify-between">
                        <Link 
                          href={`/creator/${selectedConversation.participant.id}`}
                          className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-700 p-2 -m-2 rounded-xl transition-colors"
                        >
                          <Avatar
                            src={selectedConversation.participant.avatar}
                            alt={selectedConversation.participant.nickname || 'User'}
                            size={40}
                            seed={selectedConversation.participant.nickname || selectedConversation.participant.id}
                          />
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {selectedConversation.participant.fullName || selectedConversation.participant.nickname}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              @{selectedConversation.participant.nickname}
                            </p>
                </div>
              </Link>
                        <button
                          onClick={() => {
                            setSelectedConversationId(null)
                            setMessages([])
                          }}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          title="Закрыть чат"
                        >
                          <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        </button>
                      </div>
                    </div>
                  
                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-4 h-[calc(100vh-20rem)]">
                    {isLoadingMessages ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="w-12 h-12 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-3"></div>
                          <p className="text-gray-600 dark:text-slate-400 text-sm">Loading messages...</p>
                        </div>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <ChatBubbleLeftEllipsisIcon className="w-16 h-16 text-gray-400 mx-auto mb-4 opacity-50" />
                          <p className="text-gray-500 dark:text-gray-400">No messages yet</p>
                          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                            Send a message to start the conversation
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.slice().reverse().map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                          >
                            {/* Tip Message */}
                            {message.metadata?.type === 'tip' && (
                              <div className="max-w-xs">
                                <div className={`p-4 rounded-2xl ${
                                  message.isOwn 
                                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg' 
                                    : 'bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/20 dark:to-orange-900/20 text-yellow-800 dark:text-yellow-200'
                                }`}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <SparklesIcon className="w-5 h-5" />
                                    <span className="font-bold">Tip Sent!</span>
                                  </div>
                                  <p className="text-sm">
                                    {message.isOwn ? 'You' : message.metadata.senderName} sent {formatSolAmount(message.metadata.amount || 0)} SOL
                                    {solRate && (
                                      <span className="block text-xs opacity-80 mt-1">
                                        ≈ {formatSolToUsd(message.metadata.amount, solRate)}
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-slate-500 mt-1 px-2">
                                  {new Date(message.createdAt).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Regular Message */}
                            {!message.metadata?.type && (
                              <div className={`max-w-[70%] ${message.isOwn ? 'items-end' : 'items-start'}`}>
                                <div className={`rounded-2xl ${
                                  message.isOwn 
                                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                                    : 'bg-gray-100 dark:bg-slate-700'
                                } ${message.isPaid && !message.isPurchased && !message.isOwn ? 'p-1' : 'p-3'}`}>
                                  
                                  {/* PPV Content */}
                                  {message.isPaid && !message.isPurchased && !message.isOwn && (
                                    <div className="bg-gradient-to-br from-purple-900/90 to-pink-900/90 backdrop-blur-sm rounded-xl p-4 space-y-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <div className="p-2 bg-white/10 rounded-lg">
                                            <LockClosedIcon className="w-5 h-5 text-white" />
                                          </div>
                                          <div>
                                            <p className="font-semibold text-white">Premium Message</p>
                                            <p className="text-xs text-white/80">Exclusive content</p>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-lg font-bold text-white">{message.price} SOL</p>
                                          {solRate && (
                                            <p className="text-xs text-white/80">≈ {formatSolToUsd(message.price, solRate)}</p>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {message.mediaUrl && !message.isDeleted && message.mediaType === 'image' && (
                                        <div className="relative rounded-lg overflow-hidden">
                                          <img
                                            src={message.mediaUrl}
                                            alt="Premium content"
                                            className="w-full max-w-xs blur-2xl opacity-30"
                                          />
                                          <div className="absolute inset-0 flex items-center justify-center">
                                            <PhotoIcon className="w-12 h-12 text-white" />
                                          </div>
                                        </div>
                                      )}
                                      
                                      <button
                                        onClick={() => purchaseMessage(message)}
                                        disabled={isPurchasing === message.id}
                                        className="w-full px-4 py-3 bg-white text-purple-600 font-semibold rounded-xl hover:bg-gray-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                      >
                                        {isPurchasing === message.id ? (
                                          <>
                                            <div className="w-4 h-4 border-2 border-purple-600/30 border-t-purple-600 rounded-full animate-spin" />
                                            Processing...
                                          </>
                                        ) : (
                                          <>
                                            <LockClosedIcon className="w-4 h-4" />
                                            Unlock Message
                                          </>
                                        )}
                                      </button>
                                      
                                      {message.purchases && message.purchases.length > 0 && (
                                        <div className="flex items-center gap-1 text-xs text-white/60 justify-center">
                                          <EyeIcon className="w-3 h-3" />
                                          {message.purchases.length} {message.purchases.length === 1 ? 'view' : 'views'}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Normal or Purchased Content */}
                                  {(!message.isPaid || message.isPurchased || message.isOwn) && (
                                    <>
                                      {message.isPaid && message.isOwn && (
                                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/20">
                                          <CurrencyDollarIcon className="w-4 h-4" />
                                          <span className="text-xs font-medium">
                                            PPV Message • {message.price} SOL
                                            {message.purchases && message.purchases.length > 0 && (
                                              <span className="ml-1">• {message.purchases.length} sold</span>
                                            )}
                                          </span>
                                        </div>
                                      )}
                                      
                                      {message.mediaUrl && !message.isDeleted && (
                                        <div className="mb-2">
                                          {message.mediaType === 'image' ? (
                                            <img
                                              src={message.mediaUrl}
                                              alt="Message media"
                                              className="rounded-xl max-w-xs w-full h-auto object-cover"
                                            />
                                          ) : (
                                            <video
                                              src={message.mediaUrl}
                                              controls
                                              className="rounded-xl max-w-xs w-full h-auto"
                                            />
                                          )}
                                        </div>
                                      )}
                                      
                                      {message.content && (
                                        <>
                                          {message.isDeleted ? (
                                            <p className={`${message.isOwn ? 'text-white/60' : 'text-gray-500 dark:text-slate-500'} text-sm italic`}>
                                              This message was deleted
                                            </p>
                                          ) : (
                                            <p className={`${message.isOwn ? 'text-white' : 'text-gray-900 dark:text-white'} text-sm whitespace-pre-wrap`}>
                                              {message.content}
                                              {message.isEdited && (
                                                <span className="text-xs text-gray-400 dark:text-slate-500 ml-2 italic">
                                                  (edited)
                                                </span>
                                              )}
                                            </p>
                                          )}
                                        </>
                                      )}
                                    </>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500 dark:text-slate-500 mt-1 px-2">
                                  {new Date(message.createdAt).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
          </div>
        )}
                  </div>

                  {/* Input Area */}
                  <div className="border-t border-gray-200 dark:border-slate-700 p-4">
                    {/* Media Preview */}
                    {selectedMedia && (
                      <div className="mb-3 relative inline-block">
                        <div className="relative">
                          {selectedMedia.type.startsWith('image/') ? (
                            <img
                              src={mediaPreview!}
                              alt="Selected media"
                              className="h-20 w-32 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="h-20 w-32 bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                              <VideoCameraIcon className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                          <button
                            onClick={() => {
                              setSelectedMedia(null)
                              setMediaPreview(null)
                            }}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Paid Message Indicator */}
                    {isPaidMessage && (
                      <div className="mb-3 p-3 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CurrencyDollarIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                              PPV Message
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={messagePrice}
                              onChange={(e) => setMessagePrice(e.target.value)}
                              placeholder="0.00"
                              className="w-24 px-3 py-1 text-sm bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-right"
                            />
                            <span className="text-sm text-purple-700 dark:text-purple-300">SOL</span>
                            {messagePrice && solRate && (
                              <span className="text-xs text-purple-600 dark:text-purple-400">
                                ≈ {formatSolToUsd(parseFloat(messagePrice), solRate)}
                              </span>
                            )}
                            <button
                              onClick={() => {
                                setIsPaidMessage(false)
                                setMessagePrice('')
                              }}
                              className="p-1 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-end gap-2">
                      <textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            sendMessage()
                          }
                        }}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm min-h-[44px]"
                        rows={2}
                      />
                      
                      <div className="flex items-center gap-1">
                        {/* Media Upload */}
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2.5 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-all"
                          title="Add photo or video"
                        >
                          <PhotoIcon className="w-5 h-5" />
                        </button>
                        
                        {/* PPV Toggle */}
                        <button
                          onClick={() => setIsPaidMessage(!isPaidMessage)}
                          className={`p-2.5 rounded-xl transition-all ${
                            isPaidMessage 
                              ? 'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-600 dark:text-purple-400' 
                              : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700'
                          }`}
                          title="Send paid message"
                        >
                          <CurrencyDollarIcon className="w-5 h-5" />
                        </button>
                        
                        {/* Tip */}
                        <button
                          onClick={() => setShowTipModal(true)}
                          className="p-2.5 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-all"
                          title="Send tip"
                        >
                          <GiftIcon className="w-5 h-5" />
                        </button>

                        {/* Send Button */}
                        <button
                          onClick={sendMessage}
                          disabled={(!messageText.trim() && !selectedMedia) || isSending || isUploadingMedia}
                          className="p-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-400 text-white transition-all disabled:cursor-not-allowed shadow-lg"
                        >
                          {isSending || isUploadingMedia ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          ) : (
                            <PaperAirplaneIcon className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleMediaSelect}
                      className="hidden"
                    />
                  </div>
                </div>
                ) : (
                  <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600 dark:text-slate-400">Загрузка чата...</p>
                    </div>
                  </div>
                )
              ) : (
                <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
                  <div className="text-center">
                    <ChatBubbleLeftEllipsisIcon className="w-20 h-20 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-2">
                      Выберите чат
                    </h3>
                    <p className="text-gray-500 dark:text-slate-400">
                      Выберите диалог из списка слева или начните новый
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      {conversationIdForDelete !== null ? (
        <div className="md:hidden absolute">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-[10]"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setOpenMenuId(null)
              setConversationIdForDelete(null)
            }}
          />
          
          {/* Bottom popup */}
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 z-[150] h-[10vh] flex items-center justify-center">
            <button
              onClick={async (e) => {
                console.log('Deleting conversation:', conversationIdForDelete)
                e.preventDefault()
                e.stopPropagation()
                setOpenMenuId(null)
                console.log('Deleting conversation:', conversationIdForDelete)
                await deleteConversation(conversationIdForDelete)
                
                
              }}
              className="flex items-center gap-3 px-6 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors rounded-lg font-medium"
            >
              <TrashIcon className="w-5 h-5" />
              Удалить диалог
            </button>
          </div>
        </div>
      ) : null}

      {/* Модалка выбора криэйторов */}
      {showCreatorsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Start a Conversation
              </h2>
              <button
                onClick={() => setShowCreatorsModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingCreators ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading creators...</p>
                </div>
              ) : creators.length === 0 ? (
                <div className="text-center py-12">
                  <UserIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No creators found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {creators.map((creator) => (
                    <div
                      key={creator.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar
                          src={creator.avatar}
                          alt={creator.nickname || 'Creator'}
                          size={48}
                          seed={creator.nickname || creator.id}
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {creator.fullName || creator.nickname || 'Unknown Creator'}
                          </h3>
                          {creator.bio && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                              {creator.bio}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => startConversationWithCreator(creator.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0 ml-3"
                      >
                        <PaperAirplaneIcon className="w-4 h-4" />
                        Message
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tip Modal */}
      {showTipModal && selectedConversation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Send Tip
                </h2>
                <button
                  onClick={() => setShowTipModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tip Amount (SOL)
                </label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[0.001, 0.1, 1, 5].map(amount => (
                    <button
                      key={amount}
                      onClick={() => setTipAmount(amount.toString())}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        tipAmount === amount.toString()
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {amount}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  placeholder="Custom amount"
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  step="0.001"
                  min="0.001"
                />
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Tips go directly to {selectedConversation.participant.fullName || selectedConversation.participant.nickname} with no platform fees!
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowTipModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={sendTip}
                  disabled={!tipAmount || isSendingTip}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  {isSendingTip ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      💰 Send Tip
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Chat Settings
                </h2>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    AI Auto-Reply
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Automatically respond to messages using AI
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={user?.isAutoAnswerInChat ?? true}
                    onChange={async (e) => {
                      const newValue = e.target.checked
                      
                      // Update backend
                      try {
                        const token = await jwtManager.getToken()
                        if (!token) return

                        const response = await fetch('/api/user/settings', {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                          },
                          body: JSON.stringify({
                            isAutoAnswerInChat: newValue
                          })
                        })

                        if (response.ok) {
                          toast.success(`AI Auto-Reply ${newValue ? 'enabled' : 'disabled'}`)
                        } else {
                          toast.error('Failed to update settings')
                        }
                      } catch (error) {
                        console.error('Error updating settings:', error)
                        toast.error('Failed to update settings')
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
          </div>
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
