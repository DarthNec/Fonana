'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useUser } from '@/lib/store/appStore'
import { useWallet } from '@/lib/hooks/useSafeWallet'
import { useStableWallet } from '@/lib/hooks/useStableWallet' // 🔥 M7 FIX
import { toast } from 'react-hot-toast'
import { 
  PhotoIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  MusicalNoteIcon,
  XMarkIcon,
  PlusIcon,
  GlobeAltIcon,
  UsersIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  LockClosedIcon,
  StarIcon,
  ScissorsIcon
} from '@heroicons/react/24/outline'
import ImageCropModal from './ImageCropModal'
import { useSolRate } from '@/lib/hooks/useSolRate'
import axios from 'axios'

const categories = [
  'Art', 'Music', 'Gaming', 'Lifestyle', 'Fitness', 
  'Tech', 'DeFi', 'NFT', 'Trading', 'GameFi', 
  'Blockchain', 'Intimate', 'Education', 'Comedy',
  'Food', 'Party', 'Landscape', 'Work', 'Adult', 'Couple', 'Solo'
]

interface CreatePostModalProps {
  onPostCreated?: (createdPost?: any) => void  // [tier_access_system_2025_017] Передаем созданный пост
  onPostUpdated?: (updatedPost?: any) => void
  onClose?: () => void
  mode?: 'create' | 'edit'
  postId?: string
}

export default function CreatePostModal({ onPostCreated, onPostUpdated, onClose, mode = 'create', postId }: CreatePostModalProps) {
  const { connected, publicKeyString } = useStableWallet() // 🔥 M7 FIX: STABLE DEPENDENCIES
  const user = useUser()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showCropModal, setShowCropModal] = useState(false)
  const [originalImage, setOriginalImage] = useState<string>('')
  
  // ✅ КРИТИЧЕСКАЯ ПРОВЕРКА: предотвращаем React Error #185
  console.log(user);
  if (!user) {
    return null
  }
  
  // Состояния для режима редактирования
  const [isLoadingPost, setIsLoadingPost] = useState(false)
  const [postData, setPostData] = useState<any>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  
  // 🔥 M7 FIX: SINGLE DEBUG useEffect WITH STABLE DEPENDENCIES (removed triple duplicates)
  useEffect(() => {
    const isDisabled = isUploading || (!connected && !publicKeyString) || (mode === 'edit' && isLoadingPost)
    console.log('[CreatePostModal DEBUG] Button state:', {
      isUploading,
      connected,
      hasPublicKey: !!publicKeyString,
      publicKeyPreview: publicKeyString?.slice(0, 10) + '...',
      mode,
      isLoadingPost,
      isDisabled,
      timestamp: new Date().toISOString()
    })
  }, [isUploading, connected, publicKeyString, mode, isLoadingPost]) // 🔥 M7 FIX: STABLE DEPS
  
  // Функция для определения категории по типу контента
  const getSmartCategory = (type: string): string => {
    switch (type) {
      case 'video':
        return 'Music' // Большинство видео - музыкальные клипы
      case 'audio':
        return 'Music'
      case 'image':
        return 'Art' // Изображения чаще всего арт
      case 'text':
        return 'Lifestyle' // Текстовые посты обычно лайфстайл
      default:
        return 'Lifestyle'
    }
  }
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: getSmartCategory('text'), // Устанавливаем категорию по умолчанию для текстовых постов
    tags: [] as string[],
    currentTag: '',
    file: null as File | null, // Оригинальный файл для отправки на сервер
    preview: '', // Base64 для preview
    type: 'text' as 'text' | 'image' | 'video' | 'audio',
    accessType: 'free' as 'free' | 'subscribers' | 'premium' | 'paid' | 'vip',
    price: 0,
    currency: 'SOL' as 'SOL' | 'USDC',
    isSellable: false,
    sellType: 'FIXED_PRICE' as 'FIXED_PRICE' | 'AUCTION',
    quantity: 1,
    auctionStartPrice: 0,
    auctionStepPrice: 0.1,
    auctionDuration: 24,
    auctionDepositAmount: 0.01,
    imageAspectRatio: 'square' as 'vertical' | 'square' | 'horizontal',
    // Sora-2 fields
    contentSource: 'upload' as 'upload' | 'sora2',
    soraPrompt: '',
    soraSize: '720x1280' as string,
    soraDuration: '4' as string,
    soraReferenceImage: null as File | null,
    soraReferencePreview: ''
  })

  const { rate: solToUsdRate, isLoading: isRateLoading } = useSolRate()

  const contentTypes = [
    { id: 'text', label: 'Text', icon: DocumentTextIcon, color: 'text-blue-400' },
    { id: 'image', label: 'Image', icon: PhotoIcon, color: 'text-green-400' },
    { id: 'video', label: 'Video', icon: VideoCameraIcon, color: 'text-purple-400' },
    { id: 'audio', label: 'Audio', icon: MusicalNoteIcon, color: 'text-pink-400' },
  ]

  const accessTypes = [
    { 
      value: 'free', 
      label: 'Free', 
      desc: 'Available to all',
      icon: GlobeAltIcon,
      color: 'from-green-500 to-emerald-500'
    },
    { 
      value: 'subscribers', 
      label: 'For subscribers', 
      desc: 'Basic and above',
      icon: UsersIcon,
      color: 'from-blue-500 to-cyan-500'
    },
    { 
      value: 'premium', 
      label: 'Premium', 
      desc: 'Premium and VIP',
      icon: SparklesIcon,
      color: 'from-purple-500 to-pink-500'
    },
    { 
      value: 'vip', 
      label: 'VIP content', 
      desc: 'Only VIP',
      icon: StarIcon,
      color: 'from-yellow-500 to-orange-500'
    },
    { 
      value: 'paid', 
      label: 'Paid', 
      desc: 'One-time purchase',
      icon: CurrencyDollarIcon,
      color: 'from-red-500 to-rose-500'
    }
  ]

  // Add effect to handle body scroll lock on mobile
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.body.classList.add('modal-open')
      
      return () => {
        document.body.classList.remove('modal-open')
      }
    }
  }, [])

  // Загрузка данных поста в режиме редактирования
  const loadPostData = async (postId: string) => {
    if (mode !== 'edit' || !postId) return
    
    setIsLoadingPost(true)
    try {
      const response = await fetch(`/api/posts/${postId}`)
      if (!response.ok) {
        throw new Error('Failed to load post')
      }
      
      const data = await response.json()
      setPostData(data.post)
      console.log('[CreatePostModal] Post data loaded:', data.post)
    } catch (error) {
      console.error('[CreatePostModal] Error loading post:', error)
      toast.error('Failed to load post data')
    } finally {
      setIsLoadingPost(false)
    }
  }

  // Инициализация данных поста при открытии в режиме редактирования
  useEffect(() => {
    if (mode === 'edit' && postId && !hasInitialized) {
      loadPostData(postId)
    }
  }, [mode, postId, hasInitialized])

  // Заполнение формы данными поста
  useEffect(() => {
    if (mode === 'edit' && postData && !hasInitialized) {
      console.log('[CreatePostModal] Initializing form with post data')
      
      // Определяем тип доступа из данных поста
      let accessType: 'free' | 'subscribers' | 'premium' | 'paid' | 'vip' = 'free'
      if (!postData.isLocked) {
        accessType = 'free'
      } else if (postData.price && postData.price > 0 && !postData.isSellable) {
        accessType = 'paid'
      } else if (postData.minSubscriptionTier === 'vip') {
        accessType = 'vip'
      } else if (postData.minSubscriptionTier === 'premium') {
        accessType = 'premium'
      } else if (postData.minSubscriptionTier === 'basic') {
        accessType = 'subscribers'
      } else {
        accessType = 'subscribers'
      }

      setFormData({
        title: postData.title || '',
        content: postData.content || '',
        category: postData.category || getSmartCategory(postData.type || 'text'),
        tags: postData.tags || [],
        currentTag: '',
        file: null,
        preview: postData.image || postData.mediaUrl || postData.thumbnail || '',
        type: postData.type || 'text',
        accessType,
        price: postData.price || 0,
        currency: postData.currency || 'SOL',
        isSellable: postData.isSellable || false,
        sellType: postData.sellType || 'FIXED_PRICE',
        quantity: postData.quantity || 1,
        auctionStartPrice: postData.auctionStartPrice || 0,
        auctionStepPrice: postData.auctionStepPrice || 0.1,
        auctionDuration: postData.auctionDuration || 24,
        auctionDepositAmount: postData.auctionDepositAmount || 0.01,
        imageAspectRatio: postData.imageAspectRatio || 'square',
        contentSource: 'upload',
        soraPrompt: '',
        soraSize: '720x1280',
        soraDuration: '4',
        soraReferenceImage: null,
        soraReferencePreview: ''
      })
      
      setHasInitialized(true)
    }
  }, [postData, mode, hasInitialized])

  // Сброс hasInitialized при закрытии модалки
  useEffect(() => {
    if (!mode || mode === 'create') {
      setHasInitialized(false)
      setPostData(null)
    }
  }, [mode])

  const handleFileUpload = (file: File) => {
    // Determine content type based on file
    let contentType: 'image' | 'video' | 'audio' = 'image'
    const maxSizes = {
      image: 100 * 1024 * 1024, // 100MB
      video: 200 * 1024 * 1024, // 200MB
      audio: 100 * 1024 * 1024 // 100MB
    }

    if (file.type.startsWith('video/')) {
      contentType = 'video'
    } else if (file.type.startsWith('audio/')) {
      contentType = 'audio'
    }

    const maxSize = maxSizes[contentType]
    if (file.size > maxSize) {
      toast.error(`File size should not exceed ${maxSize / (1024 * 1024)}MB`)
      return
    }

    // КРИТИЧЕСКИЙ ФИКС: улучшенная обработка загрузки изображений
    if (contentType === 'image') {
      console.log('[CreatePostModal] Processing image file:', file.name, 'size:', file.size)
      
      // Проверяем что это действительно изображение
      if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/i)) {
        toast.error('Unsupported image format. Please use JPEG, PNG, GIF, or WebP.')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        if (!result) {
          console.error('[CreatePostModal] Failed to read file')
          toast.error('Failed to read image file')
          return
        }

        // КРИТИЧЕСКИЙ ФИКС: проверяем что base64 строка валидна
        if (!result.startsWith('data:image/')) {
          console.error('[CreatePostModal] Invalid image data URL format')
          toast.error('Invalid image format')
          return
        }

        // Проверяем размер base64 строки
        const base64Size = result.length
        const estimatedMB = (base64Size * 0.75) / (1024 * 1024) // примерный размер в MB
        
        console.log('[CreatePostModal] Image loaded successfully:', {
          fileName: file.name,
          fileSize: file.size,
          base64Length: base64Size,
          estimatedMB: estimatedMB.toFixed(2),
          dataUrlPrefix: result.substring(0, 50), // только начало для проверки формата
          openingCrop: true
        })
        
        // Если изображение слишком большое, предупреждаем
        if (estimatedMB > 5) {
          console.warn('[CreatePostModal] Large image detected, may cause performance issues')
        }
        
        setOriginalImage(result)
        setFormData(prev => ({
          ...prev,
          file, // Сохраняем оригинальный файл для отправки на сервер
          type: contentType,
          preview: result, // Base64 для preview
          category: getSmartCategory(contentType)
        }))
        
        // Открываем модалку кропа с небольшой задержкой для гарантии что state обновился
        setTimeout(() => {
          console.log('[CreatePostModal] Opening crop modal with image')
          setShowCropModal(true)
        }, 100)
      }
      
      reader.onerror = (e) => {
        console.error('[CreatePostModal] FileReader error:', e)
        toast.error('Failed to read image file')
      }
      
      reader.readAsDataURL(file)
    } else {
      // For video and audio, set directly
      const preview = URL.createObjectURL(file)
      setFormData(prev => ({
        ...prev,
        file, // Сохраняем оригинальный файл для отправки на сервер
        type: contentType,
        preview, // Object URL для preview
        category: getSmartCategory(contentType)
      }))
    }
  }

  const handleCropComplete = async (croppedImage: string, aspectRatio?: number) => {
    // Convert cropped image URL to File
    try {
      // КРИТИЧЕСКИЙ ФИКС: логируем только метаданные, не blob URL
      console.log('[CreatePostModal] Processing cropped image:', {
        hasImage: !!croppedImage,
        isBlob: croppedImage?.startsWith('blob:'),
        aspectRatio,
        originalFileName: formData.file?.name
      })
      
      if (!croppedImage || !croppedImage.startsWith('blob:')) {
        throw new Error('Invalid cropped image URL')
      }

      const response = await fetch(croppedImage)
      if (!response.ok) {
        throw new Error(`Failed to fetch cropped image: ${response.status}`)
      }

      const blob = await response.blob()
      if (!blob || blob.size === 0) {
        throw new Error('Empty image blob received')
      }

      console.log('[CreatePostModal] Cropped image processed:', {
        blobSize: blob.size,
        blobType: blob.type,
        originalSize: formData.file?.size
      })

      const croppedFile = new File([blob], formData.file?.name || 'cropped-image.jpg', {
        type: 'image/jpeg'
      })
      
      // Determine image aspect ratio based on the crop
      let imageAspectRatio: 'vertical' | 'square' | 'horizontal' = 'square'
      if (aspectRatio) {
        if (aspectRatio < 0.8) {
          imageAspectRatio = 'vertical' // Portrait
        } else if (aspectRatio > 1.2) {
          imageAspectRatio = 'horizontal' // Landscape
        } else {
          imageAspectRatio = 'square' // Square
        }
      }

      console.log('[CreatePostModal] Set aspect ratio:', imageAspectRatio, 'from ratio:', aspectRatio)
      
      setFormData(prev => ({
        ...prev,
        file: croppedFile, // Обрезанный файл для отправки на сервер
        preview: croppedImage, // Blob URL для preview
        imageAspectRatio
      }))
      setShowCropModal(false)
      setOriginalImage('')
      
      toast.success('Image cropped successfully!')
    } catch (error) {
      console.error('[CreatePostModal] Error processing cropped image:', error)
      toast.error(`Error processing image: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      // Закрываем модалку кропа но оставляем оригинальное изображение
      setShowCropModal(false)
      // Не очищаем originalImage, чтобы пользователь мог попробовать еще раз
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
  }

  const handleSoraReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setFormData(prev => ({
          ...prev,
          soraReferenceImage: file,
          soraReferencePreview: result
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  // Функция для изменения размера изображения (для Sora-2)
  const resizeImage = (file: File, targetWidth: number, targetHeight: number): Promise<Blob> => {
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
        reject(new Error('Failed to read file'))
      }
      
      reader.readAsDataURL(file)
    })
  }

  const addTag = () => {
    const tag = formData.currentTag.trim().toLowerCase()
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 5) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag],
        currentTag: ''
      }))
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const uploadMedia = async (file: File): Promise<{ fileUrl: string, thumbUrl?: string, previewUrl?: string } | null> => {
    const formData = new FormData()
    formData.append('file', file) // Отправляем оригинальный файл на сервер
    formData.append('type', file.type.startsWith('video/') ? 'video' : 
                            file.type.startsWith('audio/') ? 'audio' : 'image')

    try {
      console.log('🎯 [CreatePostModal] Starting file upload to BunnyStorage:', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      })

      const response = await fetch('/api/posts/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error uploading file')
      }

      const data = await response.json()
      console.log('🎯 [CreatePostModal] Upload response:', data)
      return data
    } catch (error) {
      console.error('🎯 [CreatePostModal] Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Error uploading file')
      return null
    }
  }

  // Функция для генерации видео через Sora-2
  const generateSoraVideo = async (): Promise<string | null> => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY
      
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY not found')
      }

      console.log('[CreatePostModal] Starting Sora-2 video generation...')

      const soraFormData = new FormData()
      soraFormData.append('model', 'sora-2')
      soraFormData.append('prompt', formData.soraPrompt)
      soraFormData.append('seconds', formData.soraDuration)
      soraFormData.append('size', formData.soraSize)

      // Если есть референсное изображение, изменяем его размер и добавляем
      if (formData.soraReferenceImage) {
        const [width, height] = formData.soraSize.split('x').map(Number)
        console.log(`[CreatePostModal] Resizing reference image to ${width}x${height}...`)
        const resizedBlob = await resizeImage(formData.soraReferenceImage, width, height)
        soraFormData.append('input_reference', resizedBlob, 'reference.png')
      }

      const response = await axios.post(
        'https://api.openai.com/v1/videos',
        soraFormData,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      console.log('[CreatePostModal] Sora-2 generation response:', response.data)
      
      const generatedVideoId = response.data.id || response.data.video_id
      
      if (!generatedVideoId) {
        throw new Error('Video ID not found in Sora response')
      }

      // Создаем запись в AI_Creations таблице
      /*
      try {
        await fetch('/api/aicreation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            type: 'video',
            requestId: generatedVideoId,
            model: 'sora2',
            size: formData.soraSize,
            prompt: formData.soraPrompt,
            status: 'created'
          })
        })
        console.log('[CreatePostModal] AI Creation record created in database')
      } catch (dbError) {
        console.error('[CreatePostModal] Failed to create AI_Creations record:', dbError)
        // Не прерываем процесс, если запись в БД не удалась
      }
      */
      toast.success('🎥 Sora-2 video generation started!')
      return generatedVideoId

    } catch (error) {
      console.error('[CreatePostModal] Sora-2 generation error:', error)
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.error?.message || error.message || 'Failed to generate video')
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to generate video')
      }
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log(`[CreatePostModal] Starting ${mode} submission...`)
    
    // 🔧 FALLBACK: Используем реальное состояние кошелька
    const windowSolana = typeof window !== 'undefined' ? (window as any).solana : null
    const realConnected = windowSolana?.isConnected || false
    const realPublicKey = windowSolana?.publicKey
    
    console.log('🔍 [CreatePostModal DEBUG] handleSubmit wallet state:', {
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

    console.log('✅ [CreatePostModal DEBUG] Wallet connection verified:', {
      hasConnection: hasWalletConnection,
      walletAddress: walletAddress.slice(0, 10) + '...',
      source: publicKeyString ? 'useWallet' : 'window.solana'
    })

    // В режиме редактирования проверяем загрузку данных
    if (mode === 'edit' && isLoadingPost) {
      toast.error('Please wait for post data to load')
      return
    }

    // Валидация только для текстовых постов
    if (formData.type === 'text' && !formData.content.trim()) {
      toast.error('Please enter content for text post')
      return
    }

    // Валидация для Sora-2
    if (formData.contentSource === 'sora2') {
      if (!formData.soraPrompt.trim()) {
        toast.error('Please enter a prompt for Sora-2')
        return
      }
    }

    // Для медиа контента проверяем наличие файла (только при создании и upload)
    if (mode === 'create' && formData.type !== 'text' && formData.contentSource === 'upload' && !formData.file) {
      toast.error('Please select a file')
      return
    }

    // Title необязателен для медиа, но если есть - должен быть не пустой
    if (formData.title.trim() === '' && formData.type === 'text') {
      toast.error('Please enter a title for text post')
      return
    }

    // Валидация категории - обязательное поле
    if (!formData.category) {
      toast.error('Please select a category')
      return
    }

    if (formData.accessType === 'paid' && (!formData.price || formData.price <= 0)) {
      toast.error('Specify price for paid content')
      return
    }

    // Валидация для продаваемых постов
    if (formData.isSellable && !formData.sellType) {
      toast.error('Please select a selling method')
      return
    }
    
    if (formData.isSellable && formData.sellType === 'FIXED_PRICE' && (!formData.price || formData.price <= 0)) {
      toast.error('Please specify a price')
      return
    }
    
    if (formData.sellType === 'AUCTION') {
      if (!formData.auctionStartPrice) {
        toast.error('Please specify a starting price')
        return
      }
      if (!formData.auctionStepPrice) {
        toast.error('Please specify a bid increment')
        return
      }
      if (!formData.auctionDuration) {
        toast.error('Please specify auction duration')
        return
      }
    }

    setIsUploading(true)

    try {
      let mediaUrl = null
      let thumbnail = null
      let requestId = null
      let postType = formData.type

      // Обработка Sora-2 генерации
      if (formData.contentSource === 'sora2') {
        console.log('[CreatePostModal] Processing Sora-2 video generation...')
        
        const videoId = await generateSoraVideo()
        if (!videoId) {
          throw new Error('Failed to generate Sora-2 video')
        }
        
        requestId = videoId
        postType = 'ai-video' as any // Тип ai-video для Sora-2
        mediaUrl = null // URL будет null, видео придет через webhook
        thumbnail = '/placeholder-video-enhanced.png' // Плейсхолдер на время генерации
        
        console.log('[CreatePostModal] Sora-2 video generation initiated:', {
          requestId,
          prompt: formData.soraPrompt
        })
      }
      // Upload media file if present (только для новых файлов и не Sora-2)
      else if (formData.file) {
        const uploadResult = await uploadMedia(formData.file) // Используем оригинальный файл
        if (!uploadResult || !uploadResult.fileUrl) {
          throw new Error('Failed to upload file')
        }
        
        console.log('[CreatePostModal] 🔥 UPLOAD RESULT DEBUG:', {
          uploadResult,
          fileUrl: uploadResult.fileUrl,
          thumbUrl: uploadResult.thumbUrl,
          previewUrl: uploadResult.previewUrl,
          isCDN: uploadResult.fileUrl?.includes('b-cdn.net')
        })
        
        mediaUrl = uploadResult.fileUrl
        
        // Use thumbUrl from upload result or fallback to placeholder
        if (uploadResult.thumbUrl) {
          thumbnail = uploadResult.thumbUrl
        } else if (formData.type === 'video') {
          thumbnail = '/placeholder-video-enhanced.png'
        } else if (formData.type === 'audio') {
          thumbnail = '/placeholder-audio.png'
        } else {
          // For images use optimized version or original
          thumbnail = uploadResult.thumbUrl || uploadResult.fileUrl
        }
      } else if (mode === 'edit' && postData) {
        // В режиме редактирования используем существующие медиа
        mediaUrl = postData.mediaUrl
        thumbnail = postData.thumbnail
      }

      console.log('[CreatePostModal] 🔥 FINAL MEDIA DEBUG:', {
        mediaUrl,
        thumbnail,
        requestId,
        contentSource: formData.contentSource,
        mode,
        hasFile: !!formData.file,
        isCDN: mediaUrl?.includes('b-cdn.net'),
        isBunnyStorage: mediaUrl?.includes('fonanastorage.b-cdn.net')
      })

      // Подготавливаем данные поста
      const postDataToSend = {
        userWallet: walletAddress,  // 🔧 ИСПРАВЛЕНИЕ: используем walletAddress с fallback логикой
        title: formData.title,
        content: formData.content, // Для Sora-2 content пустой
        type: postType, // Используем postType (может быть изменен для Sora-2)
        category: formData.category,
        tags: formData.tags,
        thumbnail,
        mediaUrl,
        requestId, // Добавляем requestId для Sora-2
        isLocked: formData.accessType !== 'free',
        accessType: formData.accessType,
        // Единое поле price для всех типов постов с ценой
        price: (formData.accessType === 'paid' || (formData.isSellable && formData.sellType === 'FIXED_PRICE')) ? formData.price : undefined,
        currency: (formData.accessType === 'paid' || (formData.isSellable && formData.sellType === 'FIXED_PRICE')) ? formData.currency : undefined,
        // Мапим accessType на minSubscriptionTier
        minSubscriptionTier: formData.accessType === 'vip' ? 'vip' : 
                            formData.accessType === 'premium' ? 'premium' :
                            formData.accessType === 'subscribers' ? 'basic' : 
                            undefined,
        // Добавляем формат изображения (только для изображений)
        imageAspectRatio: formData.type === 'image' ? formData.imageAspectRatio : undefined,
        // Новые поля для продаваемых постов
        isSellable: formData.isSellable,
        sellType: formData.isSellable ? formData.sellType : undefined,
        quantity: formData.isSellable ? formData.quantity : undefined,
        auctionStartPrice: formData.isSellable && formData.sellType === 'AUCTION' ? formData.auctionStartPrice : undefined,
        auctionStepPrice: formData.isSellable && formData.sellType === 'AUCTION' ? formData.auctionStepPrice : undefined,
        auctionDuration: formData.isSellable && formData.sellType === 'AUCTION' ? formData.auctionDuration : undefined,
        auctionDepositAmount: formData.isSellable && formData.sellType === 'AUCTION' ? formData.auctionDepositAmount : undefined
      }

      console.log(`[CreatePostModal] Sending ${mode} data:`, postDataToSend)
      
      const bodyString = JSON.stringify(postDataToSend)
      console.log('JSON body:', bodyString)

      // Выбираем метод и URL в зависимости от режима
      const url = mode === 'edit' ? `/api/posts/${postId}` : '/api/posts'
      const method = mode === 'edit' ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: bodyString
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Error ${mode === 'edit' ? 'updating' : 'creating'} post`)
      }

      const result = await response.json()
      const post = result.post || result
      console.log(`[CreatePostModal] Post ${mode === 'edit' ? 'updated' : 'created'}:`, post)
      
      toast.success(`Post ${mode === 'edit' ? 'updated' : 'created'} successfully!`)
      
      // Reset form только при создании
      if (mode === 'create') {
        setFormData({
          title: '',
          content: '',
          category: getSmartCategory('text'),
          tags: [],
          currentTag: '',
          file: null,
          preview: '',
          type: 'text',
          accessType: 'free',
          price: 0,
          currency: 'SOL',
          isSellable: false,
          sellType: 'FIXED_PRICE',
          quantity: 1,
          auctionStartPrice: 0,
          auctionStepPrice: 0.1,
          auctionDuration: 24,
          auctionDepositAmount: 0.01,
          imageAspectRatio: 'square',
          contentSource: 'upload',
          soraPrompt: '',
          soraSize: '720x1280',
          soraDuration: '4',
          soraReferenceImage: null,
          soraReferencePreview: ''
        })
      }

      // Close modal and update
      if (onClose) onClose()
      if (mode === 'edit' && onPostUpdated) {
        // Передаем обновленный пост в callback
        setTimeout(() => onPostUpdated(post), 500)
      } else if (mode === 'create' && onPostCreated) {
        // 🔥 OPTIMIZATION: Enhanced post creation handling for immediate feed update
        console.log('[CreatePostModal] Post created successfully, calling onPostCreated callback...')
        
        // 🔥 SAFETY: Проверяем, что пост содержит все необходимые данные
        if (!post.content && !post.mediaUrl) {
          console.warn('[CreatePostModal] Post missing content and media, skipping real-time update:', {
            hasContent: !!post.content,
            hasMedia: !!post.mediaUrl,
            postId: post.id
          })
          // Вызываем callback без real-time обновления
          onPostCreated(post)
          return
        }
        
        // Emit custom event for real-time feed updates
        const postCreatedEvent = new CustomEvent('post-created', {
          detail: { post }
        })
        window.dispatchEvent(postCreatedEvent)
        console.log('[CreatePostModal] Emitted post-created event for real-time updates')
        
        // Immediately call the callback to trigger feed refresh
        onPostCreated(post)
        
        // Set up fallback monitoring for real-time updates
        const fallbackTimer = setTimeout(() => {
          // Check if post appeared in feed via real-time
          const feedElement = document.querySelector(`[data-post-id="${post.id}"]`)
          if (!feedElement) {
            console.warn('[CreatePostModal] Real-time update not detected, using fallback refresh')
            // Fallback to manual refresh if real-time failed
            if (onPostCreated) onPostCreated(post)
          } else {
            console.log('[CreatePostModal] Post detected in feed via real-time update')
          }
        }, 2000) // Reduced to 2 second fallback timeout
        
        // Clear timeout if component unmounts
        return () => clearTimeout(fallbackTimer)
      }

    } catch (error) {
      console.error(`[CreatePostModal] Post ${mode} error:`, error)
      toast.error(error instanceof Error ? error.message : `Error ${mode === 'edit' ? 'updating' : 'creating'} post`)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      {/* Main Modal */}
      <div className={`fixed inset-0 bg-black/85 backdrop-blur-sm z-[100] flex items-start justify-center p-0 sm:p-4 overflow-y-auto animate-fade-in ${showCropModal ? 'pointer-events-none' : ''}`}>
        <div className="modal-content bg-white dark:bg-slate-900 backdrop-blur-xl w-full h-full sm:h-auto sm:max-w-4xl rounded-none sm:rounded-3xl my-0 sm:my-8 border-y sm:border border-gray-200 dark:border-slate-700/50 shadow-2xl animate-slideInUp relative overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
            {/* Loading overlay для режима редактирования */}
            {mode === 'edit' && isLoadingPost && (
              <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-none sm:rounded-3xl">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-gray-600 dark:text-slate-400">Loading post data...</p>
                </div>
              </div>
            )}
          {/* Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                {mode === 'edit' ? 'Edit post' : 'Create new post'}
              </h2>
              {mode === 'edit' && isLoadingPost && (
                <div className="text-sm text-gray-500 dark:text-slate-400">
                  Loading...
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
            >
              <XMarkIcon className="w-5 sm:w-6 h-5 sm:h-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-6">
              {/* Content Type Selection - Always visible first */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                  What do you want to create?
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'text', contentSource: 'upload' }))}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      formData.type === 'text'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
                    }`}
                  >
                    <DocumentTextIcon className="w-5 h-5 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
                    <div className="text-xs font-medium text-gray-900 dark:text-white">Text</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, contentSource: 'upload', type: 'image' }))}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      formData.contentSource === 'upload' && formData.type === 'image'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
                    }`}
                  >
                    <PhotoIcon className="w-5 h-5 mx-auto mb-1 text-green-600 dark:text-green-400" />
                    <div className="text-xs font-medium text-gray-900 dark:text-white">Image</div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, contentSource: 'upload', type: 'video' }))}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      formData.contentSource === 'upload' && formData.type === 'video'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
                    }`}
                  >
                    <VideoCameraIcon className="w-5 h-5 mx-auto mb-1 text-purple-600 dark:text-purple-400" />
                    <div className="text-xs font-medium text-gray-900 dark:text-white">Video</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, contentSource: 'sora2', type: 'video' }))}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      formData.contentSource === 'sora2'
                        ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
                        : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
                    }`}
                  >
                    <SparklesIcon className="w-5 h-5 mx-auto mb-1 text-pink-600 dark:text-pink-400" />
                    <div className="text-xs font-medium text-gray-900 dark:text-white">Sora-2</div>
                  </button>
                </div>
              </div>

              {/* Content type info - automatically detected */}
              {formData.type !== 'text' && formData.file && formData.contentSource === 'upload' && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    {formData.type === 'image' && <PhotoIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
                    {formData.type === 'video' && <VideoCameraIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
                    {formData.type === 'audio' && <MusicalNoteIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
                    <div>
                      <p className="text-sm font-medium text-purple-900 dark:text-purple-200">
                        {formData.type === 'image' ? 'Image' : formData.type === 'video' ? 'Video' : 'Audio'} content detected
                      </p>
                      <p className="text-xs text-purple-700 dark:text-purple-300">
                        {formData.file.name}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* File upload or Sora-2 generation - hidden for text posts */}
              {formData.type !== 'text' && formData.contentSource === 'upload' ? (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                    Upload media (optional)
                  </label>
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-2xl p-6 text-center cursor-pointer hover:border-purple-500/50 transition-colors bg-gray-50 dark:bg-slate-800/30"
                  >
                    {formData.preview ? (
                      <div className="relative">
                        {formData.type === 'image' && (
                          <img
                            src={formData.preview}
                            alt="Preview"
                            className="max-w-full h-40 object-cover rounded-xl mx-auto"
                          />
                        )}
                        {formData.type === 'video' && (
                          <video
                            src={formData.preview}
                            className="max-w-full h-40 object-cover rounded-xl mx-auto"
                            controls
                          />
                        )}
                        {formData.type === 'audio' && (
                          <div className="p-4 bg-gray-100 dark:bg-slate-700/50 rounded-xl">
                            <MusicalNoteIcon className="w-12 h-12 mx-auto text-pink-500 dark:text-pink-400 mb-2" />
                            <audio src={formData.preview} controls className="w-full" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setFormData(prev => ({ ...prev, file: null, preview: '' }))
                          }}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <PhotoIcon className="w-10 h-10 mx-auto text-gray-400 dark:text-slate-500 mb-2" />
                        <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                          Drag file or click
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-600 mt-1">
                          Max: {formData.type === 'video' ? '200MB' : formData.type === 'audio' ? '100MB' : '100MB'}
                        </p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      accept={
                        formData.type === 'video' ? 'video/*' :
                        formData.type === 'audio' ? 'audio/*' :
                        'image/*'
                      }
                      className="hidden"
                    />
                  </div>
                </div>
              ) : formData.type !== 'text' && formData.contentSource === 'sora2' ? (
                /* Sora-2 Generation Fields */
                <div className="space-y-4">
                  {/* Prompt */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Prompt for Sora-2
                    </label>
                    <textarea
                      value={formData.soraPrompt}
                      onChange={(e) => setFormData(prev => ({ ...prev, soraPrompt: e.target.value }))}
                      placeholder="Describe the video you want to create..."
                      className="w-full h-24 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                    />
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Duration
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['4', '8', '12'].map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, soraDuration: sec }))}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            formData.soraDuration === sec
                              ? 'bg-pink-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Size/Resolution */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Resolution
                    </label>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: '720x1280', label: '720x1280', desc: 'Portrait' },
                        { value: '1280x720', label: '1280x720', desc: 'Landscape' },
                        { value: '1080x1920', label: '1080x1920', desc: 'Full HD Portrait' },
                        { value: '1920x1080', label: '1920x1080', desc: 'Full HD' }
                      ].map((sizeOption) => (
                        <div></div>
                        /*
                        <button
                          key={sizeOption.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, soraSize: sizeOption.value }))}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            formData.soraSize === sizeOption.value
                              ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-pink-300'
                          }`}
                        >
                          <div className="font-medium text-sm text-gray-900 dark:text-white">
                            {sizeOption.label}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {sizeOption.desc}
                          </div>
                        </button>
                        */
                      ))}
                    </div> 
                  </div>

                  {/* Reference Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Reference Image (optional)
                    </label>
                    <div
                      onClick={() => document.getElementById('sora-reference-input')?.click()}
                      className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-pink-400 transition-colors"
                    >
                      {formData.soraReferencePreview ? (
                        <div className="space-y-3">
                          <img src={formData.soraReferencePreview} alt="Preview" className="max-h-40 mx-auto rounded-lg" />
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Image will be resized to {formData.soraSize}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setFormData(prev => ({ ...prev, soraReferenceImage: null, soraReferencePreview: '' }))
                            }}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <>
                          <PhotoIcon className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Click to select reference image
                          </p>
                        </>
                      )}
                    </div>
                    <input
                      id="sora-reference-input"
                      type="file"
                      accept="image/*"
                      onChange={handleSoraReferenceUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              ) : null}

              {/* Crop button for images - only for uploaded images */}
              {formData.type === 'image' && formData.preview && formData.contentSource === 'upload' && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setOriginalImage(formData.preview)
                      setShowCropModal(true)
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors flex items-center gap-2"
                  >
                    <ScissorsIcon className="w-4 h-4" />
                    Edit Crop & Format
                  </button>
                </div>
              )}

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-sans"
                  required
                >
                  <option value="" className="bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 font-sans">
                    Select category
                  </option>
                  {categories.map((category) => (
                    <option key={category} value={category} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-sans">
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Tags (max. 5)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-full text-sm flex items-center gap-1"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-red-500 dark:hover:text-red-400"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                {formData.tags.length < 5 && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.currentTag}
                      onChange={(e) => setFormData(prev => ({ ...prev, currentTag: e.target.value }))}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      placeholder="Add tag..."
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-colors"
                    >
                      <PlusIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Title {formData.type === 'text' ? '*' : '(optional)'}
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder={formData.type === 'text' ? "Enter post title" : "Add a catchy title (optional)"}
                  maxLength={100}
                  required={formData.type === 'text'}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Description {formData.type === 'text' ? '*' : '(optional)'}
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={4}
                  placeholder={formData.type === 'text' ? "Share your thoughts..." : "Add description (optional)"}
                  maxLength={2000}
                  required={formData.type === 'text'}
                />
                <p className="text-xs text-gray-500 dark:text-slate-600 mt-1">
                  {formData.content.length}/2000 characters
                </p>
              </div>

              {/* Access type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                  Content access
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {accessTypes.map((access) => (
                    <button
                      key={access.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ 
                        ...prev, 
                        accessType: access.value as any,
                        // Сбрасываем цену если выбран не платный доступ
                        price: access.value === 'paid' ? prev.price : 0
                      }))}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        formData.accessType === access.value
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 bg-gray-50 dark:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`p-1 rounded-lg bg-gradient-to-r ${access.color} bg-opacity-20`}>
                          <access.icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="font-medium text-gray-900 dark:text-white text-sm">{access.label}</div>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-slate-400 ml-7">{access.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price settings */}
              {formData.accessType === 'paid' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="1000"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="0.00"
                      required
                    />
                    {formData.price > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-purple-600 dark:text-purple-300">Курс SOL/USD: {isRateLoading ? '...' : `$${solToUsdRate.toFixed(2)}`}</span>
                        <span className="text-xs text-gray-400">(курс обновляется автоматически)</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Currency
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value as 'SOL' | 'USDC' }))}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-sans"
                    >
                      <option value="SOL" className="font-sans">SOL</option>
                      <option value="USDC" className="font-sans">USDC</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Секция для продаваемых постов */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <label className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    checked={formData.isSellable}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      isSellable: e.target.checked,
                      ...(e.target.checked ? {} : {
                        sellType: 'FIXED_PRICE' as const,
                        quantity: 1,
                        auctionStartPrice: 0,
                        auctionStepPrice: 0,
                        auctionDepositAmount: 0,
                        auctionDuration: 24
                      })
                    }))}
                    className="w-5 h-5 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <div>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      💰 Make this post sellable
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Продажа физических или цифровых товаров через пост. Это НЕ для открытия доступа к контенту поста.
                    </p>
                  </div>
                </label>

                {formData.isSellable && (
                  <div className="mt-4 space-y-4">
                    {/* Выбор типа продажи */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        Selling Method
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev, 
                            sellType: 'FIXED_PRICE',
                            auctionStartPrice: 0,
                            auctionStepPrice: 0,
                            auctionDepositAmount: 0,
                            auctionDuration: 24
                          }))}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            formData.sellType === 'FIXED_PRICE'
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                          }`}
                        >
                          <div className="font-medium text-gray-900 dark:text-white">💵 Fixed Price</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            One-time purchase
                          </div>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, sellType: 'AUCTION' }))}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            formData.sellType === 'AUCTION'
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                          }`}
                        >
                          <div className="font-medium text-gray-900 dark:text-white">🕒 Auction</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Highest bidder wins
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Настройки для фиксированной цены */}
                    {formData.sellType === 'FIXED_PRICE' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                            Selling Price (SOL)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max="1000"
                            value={formData.price}
                            onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                            className="w-full px-4 py-2 bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                            placeholder="0.00"
                            required={formData.isSellable}
                          />
                          {formData.price > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-purple-600 dark:text-purple-300">Курс SOL/USD: {isRateLoading ? '...' : `$${solToUsdRate.toFixed(2)}`}</span>
                              <span className="text-xs text-gray-400">(курс обновляется автоматически)</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                            Quantity
                          </label>
                          <input
                            type="number"
                            step="1"
                            min="1"
                            max="9999"
                            value={formData.quantity}
                            onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                            className="w-full px-4 py-2 bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                            placeholder="1"
                            required={formData.isSellable}
                          />
                        </div>
                      </div>
                    )}

                    {/* Настройки для аукциона */}
                    {formData.sellType === 'AUCTION' && (
                      <div className="space-y-4 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                              Starting Price (SOL)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={formData.auctionStartPrice}
                              onChange={(e) => setFormData(prev => ({ ...prev, auctionStartPrice: parseFloat(e.target.value) || 0 }))}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg"
                              placeholder="1.0"
                            />
                            {formData.auctionStartPrice > 0 && (
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-purple-600 dark:text-purple-300">Курс SOL/USD: {isRateLoading ? '...' : `$${solToUsdRate.toFixed(2)}`}</span>
                                <span className="text-xs text-gray-400">(курс обновляется автоматически)</span>
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                              Bid Increment (SOL)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={formData.auctionStepPrice}
                              onChange={(e) => setFormData(prev => ({ ...prev, auctionStepPrice: parseFloat(e.target.value) || 0 }))}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg"
                              placeholder="0.5"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            Duration (hours)
                          </label>
                          <select
                            value={formData.auctionDuration}
                            onChange={(e) => setFormData(prev => ({ ...prev, auctionDuration: parseInt(e.target.value) }))}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg"
                          >
                            <option value="1">1 hour</option>
                            <option value="6">6 hours</option>
                            <option value="12">12 hours</option>
                            <option value="24">24 hours</option>
                            <option value="48">48 hours</option>
                            <option value="72">72 hours</option>
                            <option value="168">7 days</option>
                          </select>
                        </div>
                        
                        <div className="p-3 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                          <p className="text-sm text-amber-800 dark:text-amber-200">
                            ⚠️ Participants pay a deposit to bid. The winner pays the full amount after the auction ends.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                console.log(windowSolana);
                
                console.log('🔍 [CreatePostModal DEBUG] Raw wallet state:', JSON.stringify({ 
                  connected, 
                  publicKeyString: publicKeyString || null, 
                  publicKeyExists: !!publicKeyString 
                }))
                console.log('🔧 [CreatePostModal DEBUG] REAL wallet state:', JSON.stringify({
                  realConnected,
                  realPublicKey: realPublicKey ? realPublicKey.toString() : null,
                  windowSolanaExists: !!windowSolana
                }))
                console.log('🔍 [CreatePostModal DEBUG] Upload state:', JSON.stringify({ isUploading }))
                console.log('🔍 [CreatePostModal DEBUG] Edit mode state:', JSON.stringify({ mode, isLoadingPost }))
                
                const condition1 = isUploading
                // 🔧 ИСПРАВЛЕНИЕ: Используем реальное состояние кошелька как fallback
                const condition2 = !connected && !publicKeyString && !realConnected && !realPublicKey
                const condition3 = mode === 'edit' && isLoadingPost
                const isDisabled = condition1 || condition2 || condition3
                
                console.log('🎯 [CreatePostModal DEBUG] Disable conditions:', JSON.stringify({ 
                  condition1_isUploading: condition1,
                  condition2_noWallet: condition2, 
                  condition3_editLoading: condition3,
                  finalDisabled: isDisabled,
                  connected_value: connected,
                  publicKeyString_value: publicKeyString || null,
                  realConnected_value: realConnected,
                  realPublicKey_value: realPublicKey ? realPublicKey.toString() : null
                }))
                
                if (isDisabled) {
                  console.log('❌ [CreatePostModal DEBUG] Button DISABLED because:', 
                    condition1 ? 'isUploading=true' : 
                    condition2 ? `no wallet connected (useWallet: connected=${connected}, publicKeyString=${!!publicKeyString}) AND (window.solana: connected=${realConnected}, publicKey=${!!realPublicKey})` : 
                    condition3 ? 'edit mode loading' : 'unknown')
                } else {
                  console.log('✅ [CreatePostModal DEBUG] Button ENABLED - wallet detected:', {
                    source: connected && publicKeyString ? 'useWallet' : realConnected && realPublicKey ? 'window.solana' : 'unknown'
                  })
                }
                
                return isDisabled
              })()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:from-purple-600 hover:to-pink-600 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === 'edit' ? 'Saving...' : 'Publishing...'}
                </>
              ) : (
                <>
                  <LockClosedIcon className="w-5 h-5" />
                  {mode === 'edit' ? 'Save Changes' : 'Publish'}
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
    
    {/* Image Crop Modal */}
    {showCropModal && originalImage && (
      <ImageCropModal
        image={originalImage}
        onCropComplete={handleCropComplete}
        onCancel={() => {
          setShowCropModal(false)
          setOriginalImage('')
          // If no preview set, clear the file as well
          if (!formData.preview) {
            setFormData(prev => ({ ...prev, file: null }))
          }
        }}
      />
    )}
    </>
  )
}
