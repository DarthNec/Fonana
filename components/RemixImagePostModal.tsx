'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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

interface RemixImagePostModalProps {
  post: UnifiedPost
  onClose?: () => void
  onRemixCreated?: (remixPost?: any) => void
}

export default function RemixImagePostModal({ post, onClose, onRemixCreated }: RemixImagePostModalProps) {
  const { connected, publicKeyString } = useStableWallet()
  const user = useUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [remixPrompt, setRemixPrompt] = useState('')
  const { setVisible, visible } = useSafeWalletModal()
  
  // Состояния для генераций AI
  const [availableGenerations, setAvailableGenerations] = useState<number | null>(null)
  const [isLoadingGenerations, setIsLoadingGenerations] = useState(false)
  const [showGenerationTooltip, setShowGenerationTooltip] = useState(false)
  
  // Состояния для настроек видео
  const [videoDuration, setVideoDuration] = useState('4')
  const videoSize = '720x1280' // Всегда портретный формат
  
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
        console.log('[RemixImagePostModal] No wallet connected, skipping generations fetch')
        return
      }
      
      setIsLoadingGenerations(true)
      try {
        console.log('[RemixImagePostModal] Fetching available generations for:', publicKeyString)
        
        const response = await fetch(`/api/user/generations?userWallet=${publicKeyString}`)
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to fetch generations')
        }
        
        const data = await response.json()
        console.log('[RemixImagePostModal] Generations fetched:', data.availableGenerationCount)
        
        setAvailableGenerations(data.availableGenerationCount)
      } catch (error) {
        console.error('[RemixImagePostModal] Error fetching generations:', error)
        toast.error('Failed to load generation count')
        setAvailableGenerations(0)
      } finally {
        setIsLoadingGenerations(false)
      }
    }

    fetchGenerations()
  }, [publicKeyString])

  // Функция для скачивания изображения и конвертации в blob
  const downloadImageAsBlob = async (imageUrl: string): Promise<Blob> => {
    try {
      console.log('[RemixImagePostModal] Downloading image:', imageUrl)
      
      const response = await fetch(imageUrl)
      if (!response.ok) {
        throw new Error('Failed to download image')
      }
      
      const blob = await response.blob()
      console.log('[RemixImagePostModal] Image downloaded:', blob.size, 'bytes')
      
      return blob
    } catch (error) {
      console.error('[RemixImagePostModal] Download error:', error)
      throw new Error('Failed to download image')
    }
  }

  // Функция для изменения размера изображения
  const resizeImage = (blob: Blob, targetWidth: number, targetHeight: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        const img = new Image()
        
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = targetWidth
          canvas.height = targetHeight
          
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }
          
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
          
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to create blob'))
            }
          }, 'image/png')
        }
        
        img.onerror = () => {
          reject(new Error('Failed to load image'))
        }
        
        img.src = e.target?.result as string
      }
      
      reader.onerror = () => {
        reject(new Error('Failed to read blob'))
      }
      
      reader.readAsDataURL(blob)
    })
  }

  // Функция для генерации видео через Sora-2
  const generateSoraVideo = async (): Promise<string | null> => {
    try {
      console.log('[RemixImagePostModal] Starting Sora-2 video generation from image...')

      // Скачиваем изображение
      const imageBlob = await downloadImageAsBlob(post.media.url)
      
      // Изменяем размер под выбранное разрешение
      const [width, height] = videoSize.split('x').map(Number)
      console.log(`[RemixImagePostModal] Resizing reference image to ${width}x${height}...`)
      const resizedBlob = await resizeImage(imageBlob, width, height)
      
      // Конвертируем blob в base64
      const referenceImageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(resizedBlob)
      })
      
      console.log('[RemixImagePostModal] Reference image converted to base64')

      // Отправляем запрос на наш внутренний API
      const response = await fetch('/api/sora/mobile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: remixPrompt,
          seconds: videoDuration,
          size: videoSize,
          referenceImage: referenceImageBase64
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate video')
      }

      const data = await response.json()
      console.log('[RemixImagePostModal] Sora-2 API response:', data)
      
      const videoId = data.videoId
      
      if (!videoId) {
        throw new Error('Video ID not found in response')
      }

      toast.success('🎥 Video generation started!')
      return videoId

    } catch (error) {
      console.error('[RemixImagePostModal] Sora-2 generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate video')
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('[RemixImagePostModal] Starting image-to-video generation...')
    
    // 🔧 FALLBACK: Используем реальное состояние кошелька
    const windowSolana = typeof window !== 'undefined' ? (window as any).solana : null
    const realConnected = windowSolana?.isConnected || false
    const realPublicKey = windowSolana?.publicKey
    
    console.log('🔍 [RemixImagePostModal DEBUG] handleSubmit wallet state:', {
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
      toast.error('Please enter a prompt')
      return
    }

    if (availableGenerations === 0) {
      toast.error('No generations available')
      return
    }

    setIsSubmitting(true)

    try {
      // Генерируем видео через Sora-2
      console.log('[RemixImagePostModal] Generating video from image...')
      const videoId = await generateSoraVideo()
      
      if (!videoId) {
        throw new Error('Failed to generate video')
      }

      console.log('[RemixImagePostModal] Video generation initiated:', videoId)

      // Подготавливаем данные для создания поста
      const postData = {
        userWallet: walletAddress,
        title: `Generated from image`, // ${post.content.title}
        content: `Prompt: ${remixPrompt}`,
        type: 'ai-video',
        category: post.content.category || 'Art',
        tags: [...(post.content.tags || []), 'ai-generated', 'image-to-video'],
        thumbnail: '/placeholder-video-enhanced.png',
        mediaUrl: null, // URL будет null, видео придет через webhook
        requestId: videoId,
        isLocked: false,
        accessType: 'free',
        // Поля для связи с оригинальным постом
        originalPostId: post.id,
        remixPrompt: remixPrompt,
        originalImageUrl: post.media.url
      }

      console.log('[RemixImagePostModal] Sending post data:', postData)
      
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error creating post')
      }

      const result = await response.json()
      const newPost = result.post || result
      console.log('[RemixImagePostModal] Post created:', newPost)
      
      toast.success('Video generation started successfully!')
      
      // Close modal and update
      if (onClose) onClose()
      if (onRemixCreated) {
        // Emit custom event for real-time feed updates
        const postCreatedEvent = new CustomEvent('post-created', {
          detail: { post: newPost }
        })
        window.dispatchEvent(postCreatedEvent)
        console.log('[RemixImagePostModal] Emitted post-created event for real-time updates')
        
        // Call the callback to trigger feed refresh
        onRemixCreated(newPost)
      }

    } catch (error) {
      console.error('[RemixImagePostModal] Generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Error generating video')
    } finally {
      setIsSubmitting(false)
    }
  }

  const videoDurations = [
    { value: '4', label: '4s' },
    { value: '8', label: '8s' },
    { value: '12', label: '12s' }
  ]

  // Рендерим через портал в body для корректного позиционирования
  if (typeof document === 'undefined') return null
  
  return createPortal(
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[9999] flex items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="modal-content bg-white dark:bg-slate-900 backdrop-blur-xl w-full h-full sm:h-auto sm:max-w-2xl rounded-none sm:rounded-3xl my-0 sm:my-8 border-y sm:border border-gray-200 dark:border-slate-700/50 shadow-2xl animate-slideInUp relative overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-3">
                <SparklesIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                  Generate Video from Image
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
              {/* Original Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                  Reference Image
                </label>
                <div className="relative bg-gray-100 dark:bg-slate-800 rounded-xl overflow-hidden">
                  {post.media.url && (
                    <img
                      src={post.media.url}
                      alt={post.content.title}
                      className="w-full h-80 sm:h-64 object-contain"
                    />
                  )}
                  <div className="absolute top-3 left-3 bg-black/50 text-white px-2 py-1 rounded-lg text-xs font-medium">
                    Reference
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-400 mt-2">
                  {post.content.title}
                </p>
              </div>

              {/* Video Duration Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                  Длительность видео
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {videoDurations.map((duration) => (
                    <button
                      key={duration.value}
                      type="button"
                      onClick={() => setVideoDuration(duration.value)}
                      className={`px-4 py-3 rounded-xl font-medium transition-all ${
                        videoDuration === duration.value
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform scale-105'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {duration.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generation Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                  Промпт для генерации
                </label>
                <textarea
                  value={remixPrompt}
                  onChange={(e) => setRemixPrompt(e.target.value)}
                  className="w-full h-32 px-4 py-3 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-all"
                  placeholder="Как бы вы хотели сгенерировать видео по данному изображению?"
                  maxLength={1000}
                  required
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-500 dark:text-slate-500">
                    {remixPrompt.length}/1000 символов
                  </p>
                </div>
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
                    ⚠️ No generations available. You cannot generate videos.
                  </p>
                )}
              </div>

              {/* Info */}
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <SparklesIcon className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-purple-900 dark:text-purple-200">
                      Sora-2 Image-to-Video
                    </p>
                    <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                      Мы создадим новое видео на основе вашего изображения и промпта. Это может занять несколько минут.
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
                  const condition4 = availableGenerations === 0
                  const isDisabled = condition1 || condition2 || condition3 || condition4
                  
                  return isDisabled
                })()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:from-purple-600 hover:to-pink-600 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <PaperAirplaneIcon className="w-5 h-5" />
                    Generate Video
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
      </div>,
    document.body
  )
}

