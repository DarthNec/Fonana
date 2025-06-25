'use client'

import { useState, useEffect, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeftIcon,
  PaperClipIcon,
  PaperAirplaneIcon,
  PhotoIcon,
  LockClosedIcon,
  SparklesIcon,
  CurrencyDollarIcon,
  XMarkIcon,
  ChatBubbleLeftEllipsisIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import OptimizedImage from '@/components/OptimizedImage'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import toast from 'react-hot-toast'
import { useUser } from '@/lib/hooks/useUser'
import { 
  createPostPurchaseTransaction,
  createTipTransaction,
  calculatePaymentDistribution,
  formatSolAmount 
} from '@/lib/solana/payments'
import { isValidSolanaAddress } from '@/lib/solana/config'
import { useSolRate } from '@/lib/hooks/useSolRate'

interface Message {
  id: string
  content?: string | null
  mediaUrl?: string | null
  mediaType?: string | null
  isPaid: boolean
  price?: number
  isPurchased: boolean
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
}

interface Participant {
  id: string
  nickname: string
  fullName?: string
  avatar?: string
  wallet?: string
}

export default function ConversationPage() {
  const { publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const { user } = useUser()
  const params = useParams()
  const router = useRouter()
  const conversationId = params.id as string
  
  const [messages, setMessages] = useState<Message[]>([])
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null)
  const [messageText, setMessageText] = useState('')
  const [isPaidMessage, setIsPaidMessage] = useState(false)
  const [messagePrice, setMessagePrice] = useState('')
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const [showTipModal, setShowTipModal] = useState(false)
  const [tipAmount, setTipAmount] = useState('')
  const [isSendingTip, setIsSendingTip] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [hasMore, setHasMore] = useState(false)
  const [lastMessageCount, setLastMessageCount] = useState(0)
  const { rate: solRate } = useSolRate()

  useEffect(() => {
    if (publicKey && conversationId) {
      loadMessages()
      
      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }
      
      // Polling для новых сообщений
      const interval = setInterval(loadMessages, 5000)
      return () => clearInterval(interval)
    }
  }, [publicKey, conversationId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = async (before?: string) => {
    try {
      const params = new URLSearchParams()
      if (before) params.append('before', before)
      
      const response = await fetch(`/api/conversations/${conversationId}/messages?${params}`, {
        headers: {
          'x-user-wallet': publicKey?.toString() || ''
        }
      })

      if (response.ok) {
        const data = await response.json()
        
        if (before) {
          setMessages(prev => [...data.messages, ...prev])
        } else {
          // Check for new messages and show notification
          if (lastMessageCount > 0 && data.messages.length > lastMessageCount) {
            const newMessagesCount = data.messages.length - lastMessageCount
            const latestMessage = data.messages[data.messages.length - 1]
            
            // Only show notification for messages from others
            if (!latestMessage.isOwn) {
              // Show browser notification if permission granted
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(`New message from ${latestMessage.sender.nickname}`, {
                  body: latestMessage.isPaid 
                    ? '💰 Paid message' 
                    : latestMessage.content?.substring(0, 50) || 'Media message',
                  icon: '/favicon.png'
                })
              }
              
              // Show toast notification
              toast.success(`New message from ${latestMessage.sender.nickname}`)
            }
          }
          
          setMessages(data.messages)
          setLastMessageCount(data.messages.length)
        }
        
        setHasMore(data.hasMore)
        
        // Получаем информацию об участнике из первого сообщения
        if (data.messages.length > 0 && !participant) {
          const firstMessage = data.messages[0]
          const otherParticipant = firstMessage.isOwn 
            ? null // Нужно загрузить информацию о получателе
            : firstMessage.sender
          
          if (otherParticipant) {
            setParticipant(otherParticipant)
          } else {
            // Загружаем информацию о чате
            loadConversationInfo()
          }
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error)
      toast.error('Failed to load messages')
    } finally {
      setIsLoading(false)
    }
  }

  const loadConversationInfo = async () => {
    try {
      const response = await fetch('/api/conversations', {
        headers: {
          'x-user-wallet': publicKey?.toString() || ''
        }
      })

      if (response.ok) {
        const data = await response.json()
        const conversation = data.conversations.find((c: any) => c.id === conversationId)
        if (conversation) {
          setParticipant(conversation.participant)
        }
      }
    } catch (error) {
      console.error('Error loading conversation info:', error)
    }
  }

  const handleMediaSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    // Validate file type
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

  const uploadMedia = async (file: File): Promise<string | null> => {
    setIsUploadingMedia(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', file.type.startsWith('image/') ? 'image' : 'video')

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'x-user-wallet': publicKey?.toString() || ''
        },
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

  const sendMessage = async () => {
    if ((!messageText.trim() && !selectedMedia) || isSending) return

    setIsSending(true)
    try {
      let mediaUrl = null
      let mediaType = null

      // Upload media if selected
      if (selectedMedia) {
        mediaUrl = await uploadMedia(selectedMedia)
        if (!mediaUrl) {
          setIsSending(false)
          return
        }
        mediaType = selectedMedia.type.startsWith('image/') ? 'image' : 'video'
      }

      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-wallet': publicKey?.toString() || ''
        },
        body: JSON.stringify({
          content: messageText,
          mediaUrl,
          mediaType,
          isPaid: isPaidMessage,
          price: isPaidMessage ? parseFloat(messagePrice) : null
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Ensure the sender always sees their own message content
        const newMessage = {
          ...data.message,
          content: data.message.content || messageText,
          mediaUrl: data.message.mediaUrl || mediaUrl,
          isOwn: true
        }
        setMessages(prev => [...prev, newMessage])
        setMessageText('')
        setIsPaidMessage(false)
        setMessagePrice('')
        setSelectedMedia(null)
        setMediaPreview(null)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  const sendTip = async () => {
    if (!publicKey || !participant || !tipAmount || isSendingTip) return

    const amount = parseFloat(tipAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid tip amount')
      return
    }

    setIsSendingTip(true)
    
    try {
      // Load full creator data to get wallet info
      const creatorResponse = await fetch(`/api/creators/${participant.id}`)
      const creatorData = await creatorResponse.json()
      
      if (!creatorData.creator) {
        throw new Error('Failed to load creator data')
      }
      
      const creatorWallet = creatorData.creator.solanaWallet || creatorData.creator.wallet || participant.wallet
      
      if (!creatorWallet || !isValidSolanaAddress(creatorWallet)) {
        toast.error('Creator wallet not configured')
        return
      }

      // Create transaction using the same pattern as working purchases
      const transaction = await createTipTransaction(
        publicKey,
        creatorWallet,
        amount
      )

      // Добавляем дополнительное логирование
      console.log('Transaction details before sending:', {
        feePayer: transaction.feePayer?.toBase58(),
        recentBlockhash: transaction.recentBlockhash,
        instructions: transaction.instructions.length,
        signatures: transaction.signatures.length
      })
      
      // Send with retry logic (точно как в покупке сообщений)
      const sendOptions = {
        skipPreflight: false,
        preflightCommitment: 'confirmed' as any,
        maxRetries: 3
      }
      
      console.log('Sending tip transaction...')
      let signature: string
      
      try {
        signature = await sendTransaction(transaction, connection, sendOptions)
        console.log('Tip transaction sent successfully:', signature)
      } catch (sendError) {
        console.error('Error sending transaction:', sendError)
        
        // Проверяем конкретную ошибку
        if (sendError instanceof Error) {
          console.error('Error details:', {
            message: sendError.message,
            name: sendError.name,
            stack: sendError.stack
          })
        }
        
        throw sendError
      }
      
      toast.loading('Waiting for blockchain confirmation...')
      
      // Give transaction time to get into the network (как в рабочей покупке)
      console.log('Waiting 10 seconds for transaction to propagate...')
      await new Promise(resolve => setTimeout(resolve, 10000))

      // Record tip as a transaction
      const response = await fetch('/api/tips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-wallet': publicKey.toString()
        },
        body: JSON.stringify({
          creatorId: participant.id,
          amount,
          txSignature: signature,
          conversationId
        })
      })

      if (response.ok) {
        toast.success(`Sent ${formatSolAmount(amount)} tip!`)
        setShowTipModal(false)
        setTipAmount('')
        
        // Добавляем сообщение о донате в чат
        const tipLevel = amount >= 5 ? 'legendary' : amount >= 1 ? 'large' : amount >= 0.1 ? 'medium' : 'small'
        const tipMessage: Message = {
          id: `tip-${Date.now()}`, // Временный ID
          content: null,
          mediaUrl: null,
          mediaType: null,
          isPaid: false,
          price: undefined,
          isPurchased: false,
          purchases: [],
          sender: {
            id: user?.id || '',
            nickname: user?.nickname || 'Anonymous',
            fullName: user?.fullName || undefined,
            avatar: user?.avatar || undefined
          },
          isOwn: true,
          isRead: true,
          createdAt: new Date().toISOString(),
          metadata: {
            type: 'tip',
            amount,
            tipLevel,
            senderName: user?.nickname || user?.fullName || 'Anonymous',
            creatorName: participant?.fullName || participant?.nickname || 'Creator'
          }
        }
        
        // Добавляем сообщение в список
        setMessages(prev => [...prev, tipMessage])
        
        // Перезагружаем сообщения через секунду, чтобы получить правильный ID
        setTimeout(() => {
          loadMessages()
        }, 1000)
      } else {
        // If backend fails, but transaction was confirmed
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

  const purchaseMessage = async (message: Message) => {
    if (!publicKey || !participant || !message.price) return

    setIsPurchasing(message.id)
    
    try {
      // Load full creator data to get wallet and referrer info
      const creatorResponse = await fetch(`/api/creators/${participant.id}`)
      const creatorData = await creatorResponse.json()
      
      if (!creatorData.creator) {
        throw new Error('Failed to load creator data')
      }
      
      const creator = creatorData.creator
      const creatorWallet = creator.solanaWallet || creator.wallet || participant.wallet
      const referrerWallet = creator.referrer?.solanaWallet || creator.referrer?.wallet
      const hasReferrer = creator.referrerId && referrerWallet && isValidSolanaAddress(referrerWallet)
      
      if (!creatorWallet || !isValidSolanaAddress(creatorWallet)) {
        toast.error('Creator wallet not configured')
        return
      }
      
      // Calculate payment distribution
      const distribution = calculatePaymentDistribution(
        message.price,
        creatorWallet,
        hasReferrer,
        referrerWallet
      )

      // Create transaction using the payment system
      const transaction = await createPostPurchaseTransaction(
        publicKey,
        distribution
      )

      // Send with retry logic
      const sendOptions = {
        skipPreflight: false,
        preflightCommitment: 'confirmed' as any,
        maxRetries: 3
      }
      
      // Добавляем дополнительное логирование для покупки (для сравнения)
      console.log('Purchase transaction details before sending:', {
        feePayer: transaction.feePayer?.toBase58(),
        recentBlockhash: transaction.recentBlockhash,
        instructions: transaction.instructions.length,
        signatures: transaction.signatures.length
      })
      
      const signature = await sendTransaction(transaction, connection, sendOptions)
      console.log('Purchase transaction sent:', signature)
      
      toast.loading('Waiting for blockchain confirmation...')
      
      // Give transaction time to get into the network (больше времени для надежности)
      await new Promise(resolve => setTimeout(resolve, 10000))

      // Save purchase
      const response = await fetch(`/api/messages/${message.id}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-wallet': publicKey.toString()
        },
        body: JSON.stringify({ 
          txSignature: signature,
          price: message.price
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Update message locally
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
        } else if (error.message.includes('Минимальная сумма')) {
          errorMessage = error.message
        }
      }
      
      toast.error(errorMessage)
    } finally {
      setIsPurchasing(null)
    }
  }

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-24 flex items-center justify-center">
        <div className="text-center">
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
    <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-slate-700/50">
        <div className="flex items-center gap-3 p-3 sm:p-4">
          <Link 
            href="/messages" 
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-slate-400" />
          </Link>
          
          {participant && (
            <Link 
              href={`/creator/${participant.id}`}
              className="flex items-center gap-3 flex-1 hover:bg-gray-50 dark:hover:bg-slate-800/50 p-2 -m-2 rounded-xl transition-colors"
            >
              <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                <img
                  src={participant.avatar || `/api/avatar/${participant.nickname}`}
                  alt={participant.nickname}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                  {participant.fullName || participant.nickname}
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">
                  @{participant.nickname}
                </p>
              </div>
            </Link>
          )}

          {/* Tip Button */}
          <button
            onClick={() => setShowTipModal(true)}
            className="p-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-xl transition-all transform hover:scale-105 flex items-center gap-1.5"
          >
            <SparklesIcon className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Tip</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-600 dark:text-slate-400 text-sm">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20">
            <ChatBubbleLeftEllipsisIcon className="w-16 h-16 text-gray-400 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-300 mb-2">No messages yet</h3>
            <p className="text-gray-600 dark:text-slate-400">Send a message to start the conversation</p>
          </div>
        ) : (
          <>
            {hasMore && (
              <button
                onClick={() => loadMessages(messages[0]?.id)}
                className="w-full py-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium text-sm"
              >
                Load earlier messages
              </button>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
              >
                {/* Tip Message */}
                {message.metadata?.type === 'tip' && (
                  <div className="max-w-xs">
                    <div className={`p-4 rounded-2xl ${
                      message.isOwn 
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' 
                        : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <SparklesIcon className="w-5 h-5" />
                        <span className="font-bold">Tip Sent!</span>
                      </div>
                      <p className="text-sm">
                        {message.isOwn ? 'You' : message.metadata.senderName} sent {formatSolAmount(message.metadata.amount || 0)} SOL
                      </p>
                      {message.metadata.tipLevel && (
                        <div className="mt-2 text-xs font-medium">
                          {message.metadata.tipLevel === 'legendary' && '🔥 Legendary Tip!'}
                          {message.metadata.tipLevel === 'large' && '💎 Large Tip!'}
                          {message.metadata.tipLevel === 'medium' && '⭐ Nice Tip!'}
                          {message.metadata.tipLevel === 'small' && '✨ Tip!'}
                        </div>
                      )}
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
                    <div className={`rounded-2xl p-3 ${
                      message.isOwn 
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' 
                        : 'bg-gray-100 dark:bg-slate-800'
                    }`}>
                      {/* PPV Content */}
                      {message.isPaid && !message.isPurchased && !message.isOwn && (
                        <div className="space-y-3">
                          {message.mediaUrl && (
                            <div className="relative rounded-xl overflow-hidden">
                              {message.mediaType === 'image' ? (
                                <div className="relative">
                                  <img
                                    src={message.mediaUrl}
                                    alt="Premium content"
                                    className="w-full max-w-xs blur-xl opacity-50"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <LockClosedIcon className="w-8 h-8 text-white drop-shadow-lg" />
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-gray-900/50 p-8 rounded-xl">
                                  <LockClosedIcon className="w-8 h-8 text-white mx-auto" />
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="text-center">
                            <p className="font-medium mb-2">💰 Premium Message</p>
                            <p className="text-sm opacity-90 mb-3">
                              Unlock this message for {message.price} SOL
                            </p>
                            <button
                              onClick={() => purchaseMessage(message)}
                              disabled={isPurchasing === message.id}
                              className="w-full px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl font-medium transition-all disabled:opacity-50"
                            >
                              {isPurchasing === message.id ? (
                                <span className="flex items-center justify-center gap-2">
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                  Processing...
                                </span>
                              ) : (
                                `Unlock for ${message.price} SOL`
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Normal or Purchased Content */}
                      {(!message.isPaid || message.isPurchased || message.isOwn) && (
                        <>
                          {message.mediaUrl && (
                            <div className="mb-2">
                              {message.mediaType === 'image' ? (
                                <img
                                  src={message.mediaUrl}
                                  alt="Message media"
                                  className="rounded-xl max-w-xs"
                                />
                              ) : (
                                <video
                                  src={message.mediaUrl}
                                  controls
                                  className="rounded-xl max-w-xs"
                                />
                              )}
                            </div>
                          )}
                          
                          {message.content && (
                            <p className={`${message.isOwn ? 'text-white' : 'text-gray-900 dark:text-white'} text-sm sm:text-base`}>
                              {message.content}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1 px-2">
                      <span className="text-xs text-gray-500 dark:text-slate-500">
                        {new Date(message.createdAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {message.isOwn && message.isRead && (
                        <span className="text-xs text-blue-500">Read</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700/50 p-3 sm:p-4">
        {selectedMedia && (
          <div className="mb-3 relative inline-block">
            <div className="relative">
              {selectedMedia.type.startsWith('image/') ? (
                <img
                  src={mediaPreview!}
                  alt="Selected media"
                  className="h-20 rounded-lg"
                />
              ) : (
                <div className="h-20 w-32 bg-gray-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                  <VideoCameraIcon className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <button
                onClick={() => {
                  setSelectedMedia(null)
                  setMediaPreview(null)
                }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {isPaidMessage && (
          <div className="mb-3 p-3 bg-purple-100 dark:bg-purple-900/20 rounded-xl">
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
                  className="w-20 px-2 py-1 text-sm bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-sm text-purple-700 dark:text-purple-300">SOL</span>
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
          <div className="flex-1">
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
              className="w-full px-4 py-2.5 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
              rows={1}
            />
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <PhotoIcon className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setIsPaidMessage(!isPaidMessage)}
              className={`p-2.5 rounded-xl transition-colors ${
                isPaidMessage 
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' 
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <CurrencyDollarIcon className="w-5 h-5" />
            </button>

            <button
              onClick={sendMessage}
              disabled={(!messageText.trim() && !selectedMedia) || isSending || isUploadingMedia}
              className="p-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-xl transition-all disabled:cursor-not-allowed"
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

      {/* Tip Modal */}
      {showTipModal && (
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
                  Tips go directly to {participant?.fullName || participant?.nickname} with no platform fees!
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
    </div>
  )
} 