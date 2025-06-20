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
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import OptimizedImage from '@/components/OptimizedImage'
import { useConnection } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL, SystemProgram, Transaction, PublicKey } from '@solana/web3.js'
import toast from 'react-hot-toast'

interface Message {
  id: string
  content?: string | null
  mediaUrl?: string | null
  mediaType?: string | null
  isPaid: boolean
  price?: number
  isPurchased: boolean
  sender: {
    id: string
    nickname: string
    fullName?: string
    avatar?: string
  }
  isOwn: boolean
  isRead: boolean
  createdAt: string
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    if (publicKey && conversationId) {
      loadMessages()
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
          setMessages(data.messages)
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

  const sendMessage = async () => {
    if (!messageText.trim() || isSending) return

    setIsSending(true)
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-wallet': publicKey?.toString() || ''
        },
        body: JSON.stringify({
          content: messageText,
          isPaid: isPaidMessage,
          price: isPaidMessage ? parseFloat(messagePrice) : null
        })
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => [...prev, data.message])
        setMessageText('')
        setIsPaidMessage(false)
        setMessagePrice('')
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

  const purchaseMessage = async (message: Message) => {
    if (!publicKey || !participant?.wallet || !message.price) return

    setIsPurchasing(message.id)
    
    try {
      // Создаем транзакцию оплаты
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(participant.wallet),
          lamports: Math.floor(message.price * LAMPORTS_PER_SOL),
        })
      )

      const signature = await sendTransaction(transaction, connection)
      
      // Ждем подтверждения
      await connection.confirmTransaction(signature, 'confirmed')

      // Сохраняем покупку
      const response = await fetch(`/api/messages/${message.id}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-wallet': publicKey.toString()
        },
        body: JSON.stringify({ txSignature: signature })
      })

      if (response.ok) {
        const data = await response.json()
        // Обновляем сообщение локально
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
      toast.error('Failed to purchase message')
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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 z-10 pt-16">
        <div className="flex items-center gap-4 p-4">
          <Link
            href="/messages"
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
          
          {participant && (
            <Link
              href={`/creator/${participant.id}`}
              className="flex items-center gap-3 flex-1"
            >
              <OptimizedImage
                src={participant.avatar || null}
                alt={participant.nickname}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  {participant.fullName || participant.nickname}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">@{participant.nickname}</p>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pt-32 pb-32 px-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] ${message.isOwn ? 'order-2' : 'order-1'}`}>
                {!message.isOwn && (
                  <div className="flex items-center gap-2 mb-1">
                    <OptimizedImage
                      src={message.sender.avatar || null}
                      alt={message.sender.nickname}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {message.sender.nickname}
                    </span>
                  </div>
                )}
                
                <div
                  className={`rounded-2xl p-4 ${
                    message.isOwn
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white'
                  } ${message.isPaid && !message.isPurchased ? 'relative overflow-hidden' : ''}`}
                >
                  {message.isPaid && !message.isPurchased ? (
                    <div className="relative">
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-md rounded-xl flex flex-col items-center justify-center p-4 text-center">
                        <LockClosedIcon className="w-8 h-8 text-white mb-2" />
                        <p className="text-white font-medium mb-1">Paid Message</p>
                        <p className="text-white/80 text-sm mb-3">${message.price}</p>
                        <button
                          onClick={() => purchaseMessage(message)}
                          disabled={isPurchasing === message.id}
                          className="px-4 py-2 bg-white text-purple-600 font-medium rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                        >
                          {isPurchasing === message.id ? 'Unlocking...' : 'Unlock'}
                        </button>
                      </div>
                      <p className="opacity-30">
                        {message.content?.substring(0, 30)}...
                      </p>
                    </div>
                  ) : (
                    <>
                      {message.mediaUrl && (
                        <OptimizedImage
                          src={message.mediaUrl}
                          alt="Message media"
                          className="rounded-lg mb-2 max-w-full"
                          type={message.mediaType as 'image' | 'video' || 'image'}
                        />
                      )}
                      {message.content && (
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      )}
                    </>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(message.createdAt).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                  {message.isPaid && (
                    <SparklesIcon className="w-3 h-3 text-yellow-500" />
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 p-4">
        <div className="max-w-3xl mx-auto">
          {isPaidMessage && (
            <div className="mb-3 flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <SparklesIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <input
                type="number"
                placeholder="Price in SOL"
                value={messagePrice}
                onChange={(e) => setMessagePrice(e.target.value)}
                className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-yellow-300 dark:border-yellow-700 rounded-lg text-sm"
                step="0.01"
                min="0.01"
              />
              <button
                onClick={() => {
                  setIsPaidMessage(false)
                  setMessagePrice('')
                }}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Cancel
              </button>
            </div>
          )}
          
          <div className="flex items-end gap-3">
            <div className="flex gap-2">
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <PhotoIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <PaperClipIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={() => setIsPaidMessage(!isPaidMessage)}
                className={`p-2 rounded-lg transition-colors ${
                  isPaidMessage 
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' 
                    : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                <CurrencyDollarIcon className="w-5 h-5" />
              </button>
            </div>
            
            <input
              type="text"
              placeholder="Type a message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-700 rounded-full text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            
            <button
              onClick={sendMessage}
              disabled={!messageText.trim() || isSending || (isPaidMessage && !messagePrice)}
              className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 