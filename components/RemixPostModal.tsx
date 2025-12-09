'use client'

import React, { useState, useEffect } from 'react'
import { useUser } from '@/lib/store/appStore'
import { useStableWallet } from '@/lib/hooks/useStableWallet'
import { toast } from 'react-hot-toast'
import { 
  XMarkIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline'
import { UnifiedPost } from '@/types/posts'
import { useSafeWalletModal } from '@/lib/hooks/useSafeWalletModal'

interface RemixPostModalProps {
  post: UnifiedPost
  onClose?: () => void
  onRemixCreated?: (remixPost?: any) => void
}

export default function RemixPostModal({ post, onClose, onRemixCreated }: RemixPostModalProps) {
  const { connected, publicKeyString } = useStableWallet()
  const user = useUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [remixPrompt, setRemixPrompt] = useState('')
  const { setVisible, visible } = useSafeWalletModal()
  
  // Состояния для генераций AI
  const [availableGenerations, setAvailableGenerations] = useState<number | null>(null)
  const [isLoadingGenerations, setIsLoadingGenerations] = useState(false)
  const [showGenerationTooltip, setShowGenerationTooltip] = useState(false)
  
  // ✅ КРИТИЧЕСКАЯ ПРОВЕРКА: предотвращаем React Error #185
  console.log(user);
  if (!user) {
    if(!visible) {
      setVisible(true)
    }
    return null
  }

  // Add effect to handle body scroll lock on mobile
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.body.classList.add('modal-open')
      
      return () => {
        document.body.classList.remove('modal-open')
      }
    }
  }, [])

  // Загрузка доступных генераций при открытии модалки
  useEffect(() => {
    const fetchGenerations = async () => {
      if (!publicKeyString) {
        console.log('[RemixPostModal] No wallet connected, skipping generations fetch')
        return
      }
      
      setIsLoadingGenerations(true)
      try {
        console.log('[RemixPostModal] Fetching available generations for:', publicKeyString)
        
        const response = await fetch(`/api/user/generations?userWallet=${publicKeyString}`)
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to fetch generations')
        }
        
        const data = await response.json()
        console.log('[RemixPostModal] Generations fetched:', data.availableGenerationCount)
        
        setAvailableGenerations(data.availableGenerationCount)
      } catch (error) {
        console.error('[RemixPostModal] Error fetching generations:', error)
        toast.error('Failed to load generation count')
        setAvailableGenerations(0)
      } finally {
        setIsLoadingGenerations(false)
      }
    }

    fetchGenerations()
  }, [publicKeyString])

  // Функция для создания ремикса через наш API
  const createRemix = async (videoId: string, prompt: string): Promise<string | null> => {
    try {
      console.log('[RemixPostModal] Starting video remix via API...', {
        videoId,
        prompt: prompt.substring(0, 50) + '...'
      })

      // Отправляем запрос на наш внутренний API
      const response = await fetch('/api/sora/mobile/remix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId,
          prompt
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create remix')
      }

      const data = await response.json()
      console.log('[RemixPostModal] Remix API response:', data)
      
      const remixVideoId = data.videoId
      
      if (!remixVideoId) {
        throw new Error('Remix video ID not found in response')
      }

      toast.success('🎥 Video remix generation started!')
      return remixVideoId

    } catch (error) {
      console.error('[RemixPostModal] Remix error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create video remix')
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('[RemixPostModal] Starting remix submission...')
    
    // 🔧 FALLBACK: Используем реальное состояние кошелька
    const windowSolana = typeof window !== 'undefined' ? (window as any).solana : null
    const realConnected = windowSolana?.isConnected || false
    const realPublicKey = windowSolana?.publicKey
    
    console.log('🔍 [RemixPostModal DEBUG] handleSubmit wallet state:', {
      connected,
      publicKeyString: publicKeyString || null,
      realConnected,
      realPublicKey: realPublicKey?.toString()
    })
    
    // 🔧 ИСПРАВЛЕНИЕ: Проверяем ЛИБО useWallet hook ЛИБО window.solana
    const hasWalletConnection = (connected && publicKeyString) || (realConnected && realPublicKey)
    const walletAddress = publicKeyString || realPublicKey?.toString()
    
    if (!hasWalletConnection || !walletAddress) {
      toast.error('Connect wallet')
      return
    }

    if (!remixPrompt.trim()) {
      toast.error('Please enter a remix prompt')
      return
    }

    setIsSubmitting(true)

    try {
      // Сначала создаем ремикс через OpenAI API
      if (!post.media.requestId) {
        throw new Error('Original video does not have a requestId for remixing')
      }

      console.log('[RemixPostModal] Creating remix...')
      const remixVideoId = await createRemix(post.media.requestId, remixPrompt)
      
      if (!remixVideoId) {
        throw new Error('Failed to create remix')
      }

      console.log('[RemixPostModal] Remix created:', remixVideoId)

      // Подготавливаем данные для ремикса
      const remixData = {
        userWallet: walletAddress,
        title: `Remix`, // ${post.content.title}
        content: `Prompt: ${remixPrompt}`,
        type: 'ai-video',
        category: post.content.category || 'Art',
        tags: [...(post.content.tags || []), 'remix'],
        thumbnail: '/placeholder-video-enhanced.png',
        mediaUrl: null, // URL будет null, видео придет через webhook
        requestId: remixVideoId, // Используем ID из OpenAI API
        isLocked: false, // Ремиксы по умолчанию бесплатные
        accessType: 'free',
        // Поля для ремикса
        originalPostId: post.id,
        remixPrompt: remixPrompt,
        originalVideoUrl: post.media.url
      }

      console.log('[RemixPostModal] Sending remix data:', remixData)
      
      const response = await fetch('/api/posts/remix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(remixData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error creating remix')
      }

      const result = await response.json()
      const remixPost = result.post || result
      console.log('[RemixPostModal] Remix created:', remixPost)
      
      toast.success('Remix created successfully!')
      
      // Close modal and update
      if (onClose) onClose()
      if (onRemixCreated) {
        // Emit custom event for real-time feed updates
        const remixCreatedEvent = new CustomEvent('post-created', {
          detail: { post: remixPost }
        })
        window.dispatchEvent(remixCreatedEvent)
        console.log('[RemixPostModal] Emitted post-created event for real-time updates')
        
        // Call the callback to trigger feed refresh
        onRemixCreated(remixPost)
      }

    } catch (error) {
      console.error('[RemixPostModal] Remix creation error:', error)
      toast.error(error instanceof Error ? error.message : 'Error creating remix')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Main Modal */}
      <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[100] flex items-start justify-center p-0 sm:p-4 overflow-y-auto animate-fade-in">
        <div className="modal-content bg-white dark:bg-slate-900 backdrop-blur-xl w-full h-full sm:h-auto sm:max-w-2xl rounded-none sm:rounded-3xl my-0 sm:my-8 border-y sm:border border-gray-200 dark:border-slate-700/50 shadow-2xl animate-slideInUp relative overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-3">
                <SparklesIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                  Remix Video
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              >
                <XMarkIcon className="w-5 sm:w-6 h-5 sm:h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Original Video */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                  Original Video
                </label>
                <div className="relative bg-gray-100 dark:bg-slate-800 rounded-xl overflow-hidden">
                  {post.media.url && (
                    <video
                      src={post.media.url}
                      className="w-full h-80 sm:h-40 object-contain"
                      controls
                      preload="metadata"
                    />
                  )}
                  <div className="absolute top-3 left-3 bg-black/50 text-white px-2 py-1 rounded-lg text-xs font-medium">
                    Original
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-400 mt-2">
                  {post.content.title}
                </p>
              </div>

              {/* Remix Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Введите свой промпт для данного видео
                </label>
                <textarea
                  value={remixPrompt}
                  onChange={(e) => setRemixPrompt(e.target.value)}
                  className="w-full h-32 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  placeholder="Опишите, как вы хотите изменить это видео..."
                  maxLength={1000}
                  required
                />
                <p className="text-xs text-gray-500 dark:text-slate-600 mt-1">
                  {remixPrompt.length}/1000 символов
                </p>
              </div>

              {/* Available Generations Counter */}
              <div className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 border border-pink-200 dark:border-pink-800 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                      Available generations:
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isLoadingGenerations ? (
                      <div className="w-4 h-4 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span className={`text-lg font-bold ${
                          (availableGenerations || 0) > 0 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {availableGenerations ?? 0}
                        </span>
                        <div 
                          className="relative"
                          onMouseEnter={() => setShowGenerationTooltip(true)}
                          onMouseLeave={() => setShowGenerationTooltip(false)}
                        >
                          <QuestionMarkCircleIcon className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help transition-colors" />
                          {showGenerationTooltip && (
                            <div className="absolute z-50 bottom-full right-0 mb-2 w-64 px-3 py-2 text-xs text-white bg-gray-900 dark:bg-gray-800 rounded-lg shadow-lg border border-gray-700">
                              <div className="relative">
                                Количество Sora-2 генераций, которые вы можете использовать в сутки, автоматически обновляется раз в 24 часа
                                <div className="absolute -bottom-1 right-4 w-2 h-2 bg-gray-900 dark:bg-gray-800 border-r border-b border-gray-700 transform rotate-45"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {availableGenerations === 0 && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    ⚠️ No generations available. You cannot create remixes.
                  </p>
                )}
              </div>

              {/* Info */}
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <SparklesIcon className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-purple-900 dark:text-purple-200">
                      Sora Video Remix
                    </p>
                    <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                      Мы создадим новое видео на основе вашего промпта и оригинального видео. Это может занять несколько минут.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-slate-700/50 pb-safe sm:pb-0">
              <button
                type="submit"
                disabled={(() => {
                  // 🔧 FALLBACK: Проверяем реальное состояние кошелька
                  const windowSolana = typeof window !== 'undefined' ? (window as any).solana : null
                  const realConnected = windowSolana?.isConnected || false
                  const realPublicKey = windowSolana?.publicKey
                  
                  const condition1 = isSubmitting
                  const condition2 = !connected && !publicKeyString && !realConnected && !realPublicKey
                  const condition3 = !remixPrompt.trim()
                  const condition4 = availableGenerations === 0 // Блокируем, если нет генераций
                  const isDisabled = condition1 || condition2 || condition3 || condition4
                  
                  return isDisabled
                })()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:from-purple-600 hover:to-pink-600 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating Remix...
                  </>
                ) : (
                  <>
                    <PaperAirplaneIcon className="w-5 h-5" />
                    Create Remix
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 bg-gray-100 dark:bg-slate-700/50 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
