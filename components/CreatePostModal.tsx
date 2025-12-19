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
  ScissorsIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline'
import ImageCropModal from './ImageCropModal'
import { useSolRate } from '@/lib/hooks/useSolRate'
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg'

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
  const [isCompressing, setIsCompressing] = useState(false)
  const [compressionProgress, setCompressionProgress] = useState(0)
  const ffmpegRef = useRef<any>(null)
  
  // ✅ КРИТИЧЕСКАЯ ПРОВЕРКА: предотвращаем React Error #185
  console.log(user);
  if (!user) {
    return null
  }
  
  // Состояния для режима редактирования
  const [isLoadingPost, setIsLoadingPost] = useState(false)
  const [postData, setPostData] = useState<any>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  
  // Состояния для генераций AI
  const [availableGenerations, setAvailableGenerations] = useState<number | null>(null)
  const [isLoadingGenerations, setIsLoadingGenerations] = useState(false)
  const [showGenerationTooltip, setShowGenerationTooltip] = useState(false)
  
  // Состояния для оптимизации промптов
  const [showPromptWarning, setShowPromptWarning] = useState(false)
  const [optimizedPromptData, setOptimizedPromptData] = useState<{
    optimizedPrompt: string
    originalPrompt: string
    warningMessage: string
    modifiedContent: string[]
  } | null>(null)
  const [isOptimizingPrompt, setIsOptimizingPrompt] = useState(false)
  
  // 🎯 UX IMPROVEMENT: Tooltip для Content Access
  const [showAccessTooltip, setShowAccessTooltip] = useState(false)
  
  // 🎯 UX IMPROVEMENT: Preview Mode (кроме Sora-2)
  const [showPreview, setShowPreview] = useState(false)
  
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
    category: getSmartCategory('image'), // 🎯 UX IMPROVEMENT: Image по умолчанию (более популярный тип)
    tags: [] as string[],
    currentTag: '',
    file: null as File | null, // Оригинальный файл для отправки на сервер
    preview: '', // Base64 для preview
    type: 'image' as 'text' | 'image' | 'video' | 'audio', // 🎯 UX IMPROVEMENT: Image по умолчанию
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
  

  // Загрузка доступных генераций при открытии модалки
  useEffect(() => {
    const fetchGenerations = async () => {
      if (!publicKeyString) {
        console.log('[CreatePostModal] No wallet connected, skipping generations fetch')
        return
      }
      
      setIsLoadingGenerations(true)
      try {
        console.log('[CreatePostModal] Fetching available generations for:', publicKeyString)
        
        const response = await fetch(`/api/user/generations?userWallet=${publicKeyString}`)
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to fetch generations')
        }
        
        const data = await response.json()
        console.log('[CreatePostModal] Generations fetched:', data.availableGenerationCount)
        
        setAvailableGenerations(data.availableGenerationCount)
      } catch (error) {
        console.error('[CreatePostModal] Error fetching generations:', error)
        toast.error('Failed to load generation count')
        setAvailableGenerations(0)
      } finally {
        setIsLoadingGenerations(false)
      }
    }
    
    fetchGenerations()
  }, [publicKeyString])

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
        soraSize: '1080x1920',
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

  // Инициализация FFmpeg
  useEffect(() => {
    const loadFFmpeg = async () => {
      if (!ffmpegRef.current) {
        const ffmpeg = createFFmpeg({ 
          log: true,
          progress: ({ ratio }) => {
            setCompressionProgress(Math.round(ratio * 100))
          }
        })
        ffmpegRef.current = ffmpeg
      }
    }
    loadFFmpeg()
  }, [])

  // Функция сжатия видео
  const compressVideo = async (file: File): Promise<File> => {
    try {
      setIsCompressing(true)
      setCompressionProgress(0)
      
      const ffmpeg = ffmpegRef.current
      
      if (!ffmpeg) {
        throw new Error('FFmpeg not initialized')
      }
      
      // Загружаем FFmpeg, если еще не загружен
      if (!ffmpeg.isLoaded()) {
        console.log('[CreatePostModal] Loading FFmpeg...')
        toast.loading('Initializing video compressor...', { id: 'ffmpeg-load' })
        await ffmpeg.load()
        toast.dismiss('ffmpeg-load')
        console.log('[CreatePostModal] FFmpeg loaded successfully')
      }
      
      console.log('[CreatePostModal] Starting video compression:', {
        originalSize: (file.size / (1024 * 1024)).toFixed(2) + 'MB',
        fileName: file.name
      })
      
      toast.loading('Compressing video...', { id: 'compress' })
      
      // Записываем входной файл
      ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(file))
      
      // Сжимаем видео
      await ffmpeg.run(
        '-i', 'input.mp4',
        '-vcodec', 'libx264',
        '-b:v', '1000k',  // битрейт видео (примерно 1 Мбит/с)
        '-vf', 'scale=1280:-1', // уменьшение разрешения
        '-preset', 'fast',
        'output.mp4'
      )
      
      // Читаем выходной файл
      const data = ffmpeg.FS('readFile', 'output.mp4')
      const compressedBlob = new Blob([data.buffer], { type: 'video/mp4' })
      
      // Очищаем файловую систему FFmpeg
      try {
        ffmpeg.FS('unlink', 'input.mp4')
        ffmpeg.FS('unlink', 'output.mp4')
      } catch (e) {
        console.warn('[CreatePostModal] Error cleaning up FFmpeg files:', e)
      }
      
      const compressedFile = new File([compressedBlob], file.name, {
        type: 'video/mp4'
      })
      
      console.log('[CreatePostModal] Video compressed successfully:', {
        originalSize: (file.size / (1024 * 1024)).toFixed(2) + 'MB',
        compressedSize: (compressedFile.size / (1024 * 1024)).toFixed(2) + 'MB',
        reduction: (((file.size - compressedFile.size) / file.size) * 100).toFixed(1) + '%'
      })
      
      toast.dismiss('compress')
      toast.success(`Video compressed: ${(file.size / (1024 * 1024)).toFixed(1)}MB → ${(compressedFile.size / (1024 * 1024)).toFixed(1)}MB`)
      
      return compressedFile
    } catch (error) {
      console.error('[CreatePostModal] Video compression error:', error)
      toast.dismiss('compress')
      toast.error('Failed to compress video. Uploading original file.')
      return file // Возвращаем оригинальный файл в случае ошибки
    } finally {
      setIsCompressing(false)
      setCompressionProgress(0)
    }
  }

  const handleFileUpload = async (file: File) => {
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
      // For video and audio, check if compression is needed
      let processedFile = file
      
      // Сжимаем видео, если размер больше 20МБ
      if (contentType === 'video' && file.size > 20 * 1024 * 1024) {
        console.log('[CreatePostModal] Video size exceeds 20MB, starting compression...')
        processedFile = await compressVideo(file)
      }
      
      const preview = URL.createObjectURL(processedFile)
      setFormData(prev => ({
        ...prev,
        file: processedFile, // Сохраняем обработанный файл для отправки на сервер
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

  const uploadMedia = async (file: File, accessType: string): Promise<{ fileUrl: string, thumbUrl?: string, previewUrl?: string, blurUrl?: string } | null> => {
    const formData = new FormData()
    formData.append('file', file) // Отправляем оригинальный файл на сервер
    formData.append('type', file.type.startsWith('video/') ? 'video' : 
                            file.type.startsWith('audio/') ? 'audio' : 'image')
    formData.append('accessType', accessType) // Отправляем тип доступа для определения нужен ли blur

    try {
      console.log('🎯 [CreatePostModal] Starting file upload to BunnyStorage:', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        accessType
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

  // Функция для обработки выбора "Оставить" оптимизированный промпт
  const handleAcceptOptimizedPrompt = async () => {
    if (!optimizedPromptData) return
    
    console.log('[CreatePostModal] User accepted optimized prompt')
    setShowPromptWarning(false)
    setIsUploading(true)
    
    try {
      // Генерируем видео с оптимизированным промптом
      const videoId = await generateSoraVideo(optimizedPromptData.optimizedPrompt)
      if (!videoId) {
        throw new Error('Failed to generate Sora-2 video')
      }
      
      // Продолжаем создание поста с requestId
      await continuePostCreation(videoId, 'ai-video')
      
    } catch (error) {
      console.error('[CreatePostModal] Error after accepting optimized prompt:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create post')
      setIsUploading(false)
    } finally {
      setOptimizedPromptData(null)
    }
  }
  
  // Функция для обработки выбора "Отказаться"
  const handleRejectOptimizedPrompt = () => {
    console.log('[CreatePostModal] User rejected optimized prompt')
    setShowPromptWarning(false)
    setOptimizedPromptData(null)
    setIsUploading(false)
    toast('Пожалуйста, измените промпт и попробуйте снова', {
      icon: 'ℹ️'
    })
  }
  
  // Вспомогательная функция для продолжения создания поста после генерации видео
  const continuePostCreation = async (videoId: string, postType: string) => {
    const windowSolana = typeof window !== 'undefined' ? (window as any).solana : null
    const realPublicKey = windowSolana?.publicKey
    const walletAddress = publicKeyString || realPublicKey?.toString()
    
    if (!walletAddress) {
      throw new Error('Wallet not connected')
    }
    
    const postData = {
      userWallet: walletAddress,
      type: postType,
      title: formData.title,
      content: formData.content,
      category: formData.category,
      tags: formData.tags,
      accessType: formData.accessType,
      price: formData.accessType === 'paid' ? formData.price : 0,
      currency: formData.currency,
      mediaUrl: null,
      thumbnail: '/placeholder-video-enhanced.png',
      previewUrl: null,
      blurUrl: null,
      requestId: videoId,
      isSellable: formData.isSellable,
      sellType: formData.isSellable ? formData.sellType : null,
      quantity: formData.isSellable ? formData.quantity : null,
      auctionStartPrice: formData.sellType === 'AUCTION' ? formData.auctionStartPrice : null,
      auctionStepPrice: formData.sellType === 'AUCTION' ? formData.auctionStepPrice : null,
      auctionDuration: formData.sellType === 'AUCTION' ? formData.auctionDuration : null,
      auctionDepositAmount: formData.sellType === 'AUCTION' ? formData.auctionDepositAmount : null,
    }
    
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData)
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create post')
    }
    
    const result = await response.json()
    const newPost = result.post || result
    
    toast.success('Post created successfully!')
    
    if (onClose) onClose()
    if (onPostCreated) {
      const postCreatedEvent = new CustomEvent('post-created', {
        detail: { post: newPost }
      })
      window.dispatchEvent(postCreatedEvent)
      onPostCreated(newPost)
    }
    
    setIsUploading(false)
  }

  // Функция для оптимизации промпта через OpenAI
  const optimizePrompt = async (prompt: string): Promise<{ optimizedPrompt: string, hasWarning: boolean, warningMessage: string | null, modifiedContent: string[] } | null> => {
    try {
      console.log('[CreatePostModal] Optimizing prompt via OpenAI...')
      setIsOptimizingPrompt(true)
      
      const response = await fetch('/api/sora/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to optimize prompt')
      }

      const data = await response.json()
      console.log('[CreatePostModal] Prompt optimization result:', {
        hasWarning: data.hasWarning,
        modifiedCount: data.modifiedContent?.length || 0
      })

      return {
        optimizedPrompt: data.optimizedPrompt,
        hasWarning: data.hasWarning,
        warningMessage: data.warningMessage,
        modifiedContent: data.modifiedContent || []
      }

    } catch (error) {
      console.error('[CreatePostModal] Prompt optimization error:', error)
      toast.error('Failed to optimize prompt, using original')
      return null
    } finally {
      setIsOptimizingPrompt(false)
    }
  }

  // Функция для генерации видео через Sora-2
  const generateSoraVideo = async (promptToUse?: string): Promise<string | null> => {
    try {
      const finalPrompt = promptToUse || formData.soraPrompt
      console.log('[CreatePostModal] Starting Sora-2 video generation via API...', {
        promptLength: finalPrompt.length
      })

      // Подготавливаем данные для API
      let referenceImageBase64 = null
      
      // Если есть референсное изображение, конвертируем его в base64
      if (formData.soraReferenceImage) {
        const [width, height] = formData.soraSize.split('x').map(Number)
        console.log(`[CreatePostModal] Resizing reference image to ${width}x${height}...`)
        const resizedBlob = await resizeImage(formData.soraReferenceImage, width, height)
        
        // Конвертируем blob в base64
        referenceImageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(resizedBlob)
        })
        
        console.log('[CreatePostModal] Reference image converted to base64')
      }

      // Отправляем запрос на наш внутренний API
      const response = await fetch('/api/sora/mobile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: finalPrompt, // Используем оптимизированный промпт
          seconds: formData.soraDuration,
          size: formData.soraSize,
          referenceImage: referenceImageBase64
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate video')
      }

      const data = await response.json()
      console.log('[CreatePostModal] Sora-2 API response:', data)
      
      const generatedVideoId = data.videoId
      
      if (!generatedVideoId) {
        throw new Error('Video ID not found in response')
      }

      toast.success('🎥 Sora-2 video generation started!')
      return generatedVideoId

    } catch (error) {
      console.error('[CreatePostModal] Sora-2 generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate video')
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
      let previewUrl = null
      let blurUrl = null
      let requestId = null
      let postType = formData.type

      // Обработка Sora-2 генерации
      if (formData.contentSource === 'sora2') {
        console.log('[CreatePostModal] Processing Sora-2 video generation...')
        
        // Сначала оптимизируем промпт через OpenAI
        // const optimizationResult = await optimizePrompt(formData.soraPrompt)
        const optimizationResult = {
          optimizedPrompt: formData.soraPrompt,
          hasWarning: false,
          warningMessage: null,
          modifiedContent: []
        }
        if (!optimizationResult) {
          throw new Error('Failed to optimize prompt')
        }
        

        console.log('[CreatePostModal] Optimization result:', optimizationResult)
        
        // Если есть предупреждение, показываем попап и ждём решения пользователя
        if (optimizationResult.hasWarning) {
          console.log('[CreatePostModal] Prompt has warning, showing dialog...')
          
          // Сохраняем данные для попапа
          setOptimizedPromptData({
            optimizedPrompt: optimizationResult.optimizedPrompt,
            originalPrompt: formData.soraPrompt,
            warningMessage: optimizationResult.warningMessage || '',
            modifiedContent: optimizationResult.modifiedContent
          })
          setShowPromptWarning(true)
          setIsUploading(false) // Останавливаем загрузку, ждём решения пользователя
          return // Прерываем выполнение, продолжим после выбора пользователя
        }
        
        // Если предупреждений нет, сразу используем оптимизированный промпт
        console.log('[CreatePostModal] No warnings, using optimized prompt')
        const videoId = await generateSoraVideo(optimizationResult.optimizedPrompt)
        if (!videoId) {
          throw new Error('Failed to generate Sora-2 video')
        }
        
        requestId = videoId
        postType = 'ai-video' as any // Тип ai-video для Sora-2
        mediaUrl = null // URL будет null, видео придет через webhook
        thumbnail = '/placeholder-video-enhanced.png' // Плейсхолдер на время генерации
        
        console.log('[CreatePostModal] Sora-2 video generation initiated:', {
          requestId,
          usedOptimizedPrompt: true
        })
      }
      // Upload media file if present (только для новых файлов и не Sora-2)
      else if (formData.file) {
        const uploadResult = await uploadMedia(formData.file, formData.accessType) // Передаем accessType для определения нужен ли blur
        if (!uploadResult || !uploadResult.fileUrl) {
          throw new Error('Failed to upload file')
        }
        
        console.log('[CreatePostModal] 🔥 UPLOAD RESULT DEBUG:', {
          uploadResult,
          fileUrl: uploadResult.fileUrl,
          thumbUrl: uploadResult.thumbUrl,
          previewUrl: uploadResult.previewUrl,
          blurUrl: uploadResult.blurUrl,
          accessType: formData.accessType,
          shouldHaveBlur: formData.accessType !== 'free',
          isCDN: uploadResult.fileUrl?.includes('b-cdn.net')
        })
        
        mediaUrl = uploadResult.fileUrl
        previewUrl = uploadResult.previewUrl || null
        blurUrl = uploadResult.blurUrl || null
        
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
        previewUrl = postData.previewUrl
        blurUrl = postData.blurUrl
      }

      console.log('[CreatePostModal] 🔥 FINAL MEDIA DEBUG:', {
        mediaUrl,
        thumbnail,
        previewUrl,
        blurUrl,
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
        previewUrl, // Добавляем previewUrl для превью видео и изображений
        blurUrl, // Добавляем blurUrl для размытого превью
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
      
      // Обновляем счетчик генераций после успешного создания Sora-2 поста
      if (mode === 'create' && formData.contentSource === 'sora2' && availableGenerations !== null) {
        setAvailableGenerations(availableGenerations - 1)
        console.log('[CreatePostModal] Updated generation count:', availableGenerations - 1)
      }
      
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
      {/* Video Compression Overlay */}
      {isCompressing && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[150] flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
            <div className="text-center">
              <VideoCameraIcon className="w-16 h-16 mx-auto mb-4 text-purple-500 animate-pulse" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Compressing Video
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                This may take a few moments...
              </p>
              
              {/* Progress Bar */}
              <div className="relative w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 ease-out"
                  style={{ width: `${compressionProgress}%` }}
                />
              </div>
              
              <p className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                {compressionProgress}%
              </p>
            </div>
          </div>
        </div>
      )}
      
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
                    disabled={availableGenerations === 0}
                    className={`p-3 rounded-xl border-2 transition-all relative ${
                      formData.contentSource === 'sora2'
                        ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
                        : availableGenerations === 0
                        ? 'border-gray-200 dark:border-slate-700 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
                    }`}
                  >
                    {/* 🎯 UX IMPROVEMENT: Badge с количеством генераций */}
                    {availableGenerations !== null && (
                      <div className={`absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        availableGenerations > 0 
                          ? 'bg-green-500 text-white' 
                          : 'bg-red-500 text-white'
                      }`}>
                        {availableGenerations}
                      </div>
                    )}
                    <SparklesIcon className="w-5 h-5 mx-auto mb-1 text-pink-600 dark:text-pink-400" />
                    <div className="text-xs font-medium text-gray-900 dark:text-white">Sora-2</div>
                  </button>
                </div>
              </div>

              {/* 🎯 UX IMPROVEMENT: Debug блок удалён - preview уже показывает контент */}

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
                        ⚠️ No generations available. You cannot create Sora-2 videos.
                      </p>
                    )}
                  </div>
                  
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

              {/* 🎯 UX IMPROVEMENT: Tags скрыты - низкое использование
              {/* Tags */}
              {/* <div>
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
              </div> */}
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

              {/* Access type - 🎯 UX IMPROVEMENT: Простой dropdown с tooltip */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  <span>Content access</span>
                  {/* Tooltip с объяснением */}
                  <div 
                    className="relative"
                    onMouseEnter={() => setShowAccessTooltip(true)}
                    onMouseLeave={() => setShowAccessTooltip(false)}
                  >
                    <QuestionMarkCircleIcon className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help transition-colors" />
                    {showAccessTooltip && (
                      <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2 text-xs text-white bg-gray-900 dark:bg-gray-800 rounded-lg shadow-lg border border-gray-700">
                        <div className="relative">
                          <p className="font-medium mb-1">Content Access Levels:</p>
                          <ul className="space-y-0.5 text-gray-200">
                            <li>• <strong>Free</strong> - Everyone can see</li>
                            <li>• <strong>Subscribers</strong> - Basic tier+</li>
                            <li>• <strong>Premium</strong> - Premium tier+</li>
                            <li>• <strong>VIP</strong> - Only VIP subscribers</li>
                            <li>• <strong>Paid</strong> - One-time purchase</li>
                          </ul>
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-800 border-r border-b border-gray-700 transform rotate-45"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </label>
                <select
                  value={formData.accessType}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    accessType: e.target.value as any,
                    // Сбрасываем цену если выбран не платный доступ
                    price: e.target.value === 'paid' ? prev.price : 0
                  }))}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-sans"
                >
                  <option value="free" className="font-sans">🌍 Free - Available to all</option>
                  <option value="subscribers" className="font-sans">👥 For subscribers - Basic and above</option>
                  <option value="premium" className="font-sans">✨ Premium - Premium and VIP</option>
                  <option value="vip" className="font-sans">⭐ VIP content - Only VIP</option>
                  <option value="paid" className="font-sans">💰 Paid - One-time purchase</option>
                </select>
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

              
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-slate-700/50 pb-safe sm:pb-0">
            {/* 🎯 UX IMPROVEMENT: Preview button - показываем только когда есть что показывать */}
            {formData.contentSource === 'upload' && mode === 'create' && (
              // Для текста: нужны title И content. Для медиа: нужен файл
              formData.type === 'text' 
                ? (formData.title && formData.content)
                : (formData.file || formData.preview)
            ) && (
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="px-6 py-3 bg-gray-100 dark:bg-slate-700/50 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white font-medium rounded-xl transition-colors"
              >
                👁️ Preview
              </button>
            )}
            
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
                console.log('🔍 [CreatePostModal DEBUG] Compression state:', JSON.stringify({ isCompressing }))
                
                const condition1 = isUploading || isCompressing
                // 🔧 ИСПРАВЛЕНИЕ: Используем реальное состояние кошелька как fallback
                const condition2 = !connected && !publicKeyString && !realConnected && !realPublicKey
                const condition3 = mode === 'edit' && isLoadingPost
                // Проверка генераций для Sora-2
                const condition4 = formData.contentSource === 'sora2' && (availableGenerations === null || availableGenerations <= 0)
                const isDisabled = condition1 || condition2 || condition3 || condition4
                
                console.log('🎯 [CreatePostModal DEBUG] Disable conditions:', JSON.stringify({ 
                  condition1_isUploading: condition1,
                  condition2_noWallet: condition2, 
                  condition3_editLoading: condition3,
                  condition4_noGenerations: condition4,
                  finalDisabled: isDisabled,
                  connected_value: connected,
                  publicKeyString_value: publicKeyString || null,
                  realConnected_value: realConnected,
                  realPublicKey_value: realPublicKey ? realPublicKey.toString() : null,
                  contentSource: formData.contentSource,
                  availableGenerations: availableGenerations
                }))
                
                if (isDisabled) {
                  console.log('❌ [CreatePostModal DEBUG] Button DISABLED because:', 
                    condition1 ? 'isUploading=true' : 
                    condition2 ? `no wallet connected (useWallet: connected=${connected}, publicKeyString=${!!publicKeyString}) AND (window.solana: connected=${realConnected}, publicKey=${!!realPublicKey})` : 
                    condition3 ? 'edit mode loading' : 
                    condition4 ? 'no generations available for Sora-2' : 'unknown')
                } else {
                  console.log('✅ [CreatePostModal DEBUG] Button ENABLED - wallet detected:', {
                    source: connected && publicKeyString ? 'useWallet' : realConnected && realPublicKey ? 'window.solana' : 'unknown',
                    hasGenerations: formData.contentSource === 'sora2' ? availableGenerations : 'N/A'
                  })
                }
                
                return isDisabled
              })()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:from-purple-600 hover:to-pink-600 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {isCompressing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Compressing video... {compressionProgress}%
                </>
              ) : isUploading ? (
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
    
    {/* Prompt Warning Modal */}
    {showPromptWarning && optimizedPromptData && (
      <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-gray-200 dark:border-slate-700/50 shadow-2xl animate-slideInUp overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-3xl">⚠️</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  Prompt Content Warning
                </h3>
                <p className="text-sm text-white/80 mt-1">
                  Your prompt was modified to comply with our guidelines
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Warning Message */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p className="text-sm text-red-900 dark:text-red-200 leading-relaxed">
                {optimizedPromptData.warningMessage}
              </p>
            </div>

            {/* Modified Content Tags */}
            {optimizedPromptData.modifiedContent.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Detected issues:
                </p>
                <div className="flex flex-wrap gap-2">
                  {optimizedPromptData.modifiedContent.map((item, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs font-medium"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Original Prompt */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                ❌ Ваш оригинальный промпт:
              </p>
              <div className="bg-gray-100 dark:bg-slate-800 rounded-xl p-4">
                <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                  {optimizedPromptData.originalPrompt}
                </p>
              </div>
            </div>

            {/* Optimized Prompt */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                ✅ Исправленный промпт:
              </p>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                <p className="text-sm text-green-900 dark:text-green-200 leading-relaxed">
                  {optimizedPromptData.optimizedPrompt}
                </p>
              </div>
            </div>

            {/* Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <p className="text-xs text-blue-900 dark:text-blue-200">
                💡 Мы автоматически оптимизировали ваш промпт для лучших результатов и соблюдения правил платформы.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700/50 flex gap-3">
            <button
              onClick={handleAcceptOptimizedPrompt}
              disabled={isUploading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <SparklesIcon className="w-5 h-5" />
                  Оставить исправленный
                </>
              )}
            </button>
            <button
              onClick={handleRejectOptimizedPrompt}
              disabled={isUploading}
              className="px-6 py-3 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Отказаться
            </button>
          </div>
        </div>
      </div>
    )}
    
    {/* 🎯 UX IMPROVEMENT: Preview Modal (показывает как пост будет выглядеть) */}
    {showPreview && (
      <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-slate-700/50 shadow-2xl animate-slideInUp">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700/50 p-6 flex items-center justify-between z-10">
            <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
              👁️ Post Preview
            </h3>
            <button
              onClick={() => setShowPreview(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-gray-600 dark:text-slate-400" />
            </button>
          </div>

          {/* Preview Content - Instagram-style как в оригинальном PostContent */}
          <div className="p-6">
            {/* Post Card Preview */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-lg">
              
              {/* Media Content с Instagram-style header поверх */}
              {formData.preview ? (
                <div className="relative aspect-square sm:aspect-video bg-gray-100 dark:bg-slate-800">
                  {/* Media */}
                  {formData.type === 'image' && (
                    <img
                      src={formData.preview}
                      alt={formData.title || 'Preview'}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {formData.type === 'video' && (
                    <video
                      src={formData.preview}
                      className="w-full h-full object-cover"
                      controls
                    />
                  )}
                  {formData.type === 'audio' && (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 p-8">
                      <MusicalNoteIcon className="w-16 h-16 text-white mb-4" />
                      <div className="w-full max-w-sm">
                        <audio src={formData.preview} controls className="w-full" />
                      </div>
                    </div>
                  )}
                  
                  {/* Instagram-style Header поверх контента */}
                  <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/80 via-black/60 to-transparent pt-3 pb-16 px-3 sm:px-4">
                    <div className="flex items-center gap-3">
                      {/* Avatar с белым ring */}
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.fullName || user.nickname || 'User'}
                          className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-cover ring-2 ring-white shadow-lg flex-shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold ring-2 ring-white shadow-lg flex-shrink-0">
                          {(user?.fullName?.[0] || user?.nickname?.[0] || 'U').toUpperCase()}
                        </div>
                      )}
                      
                      {/* Name & Time */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white text-sm sm:text-base drop-shadow-lg truncate">
                          {user?.fullName || user?.nickname || 'Username'}
                        </div>
                        <div className="text-[10px] sm:text-xs text-white/90 drop-shadow-md">
                          Just now
                        </div>
                      </div>
                      
                      {/* Access Type Badge */}
                      {formData.accessType !== 'free' && (
                        <div className={`px-2 py-1 rounded-lg text-xs font-medium backdrop-blur-sm ${
                          formData.accessType === 'paid' 
                            ? 'bg-red-500/90 text-white'
                            : formData.accessType === 'vip'
                            ? 'bg-yellow-500/90 text-white'
                            : formData.accessType === 'premium'
                            ? 'bg-purple-500/90 text-white'
                            : 'bg-blue-500/90 text-white'
                        }`}>
                          {formData.accessType === 'paid' && `💰 ${formData.price} ${formData.currency}`}
                          {formData.accessType === 'vip' && '⭐ VIP'}
                          {formData.accessType === 'premium' && '✨ Premium'}
                          {formData.accessType === 'subscribers' && '👥 Subscribers'}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Instagram-style Footer снизу контента */}
                  <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 via-black/60 to-transparent pt-16 px-3 sm:px-4 pb-3">
                    {/* Title */}
                    {formData.title && (
                      <h3 className="font-bold text-white drop-shadow-lg mb-1.5 text-base sm:text-lg line-clamp-2">
                        {formData.title}
                      </h3>
                    )}
                    
                    {/* Description */}
                    {formData.content && (
                      <p className="text-white/90 drop-shadow-md mb-2.5 text-xs sm:text-sm line-clamp-2">
                        {formData.content}
                      </p>
                    )}
                    
                    {/* Actions - как в оригинале */}
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-4">
                        {/* Like button */}
                        <button className="flex items-center gap-2 text-white group">
                          <div className="rounded-lg hover:bg-white/20 transition-colors p-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium">0</span>
                        </button>
                        
                        {/* Comment button */}
                        <button className="flex items-center gap-2 text-white group">
                          <div className="rounded-lg hover:bg-white/20 transition-colors p-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium">0</span>
                        </button>
                        
                        {/* View count */}
                        <div className="flex items-center gap-2 text-white/80">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span className="text-sm font-medium">0</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Text-only post */
                <div className="p-4">
                  {/* Header for text posts */}
                  <div className="flex items-center gap-3 mb-4">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.fullName || user.nickname || 'User'}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                        {(user?.fullName?.[0] || user?.nickname?.[0] || 'U').toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {user?.fullName || user?.nickname || 'Username'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Just now
                      </div>
                    </div>
                    {formData.accessType !== 'free' && (
                      <div className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        formData.accessType === 'paid' 
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          : formData.accessType === 'vip'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                          : formData.accessType === 'premium'
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      }`}>
                        {formData.accessType === 'paid' && `💰 ${formData.price} ${formData.currency}`}
                        {formData.accessType === 'vip' && '⭐ VIP'}
                        {formData.accessType === 'premium' && '✨ Premium'}
                        {formData.accessType === 'subscribers' && '👥 Subscribers'}
                      </div>
                    )}
                  </div>
                  
                  {/* Title */}
                  {formData.title && (
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">
                      {formData.title}
                    </h3>
                  )}
                  
                  {/* Content */}
                  {formData.content && (
                    <p className="text-base text-gray-700 dark:text-slate-300 whitespace-pre-wrap mb-4">
                      {formData.content}
                    </p>
                  )}
                  
                  {/* Category */}
                  {formData.category && (
                    <div className="flex items-center gap-2 mb-4">
                      <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
                        {formData.category}
                      </span>
                    </div>
                  )}
                  
                  {/* Actions for text posts */}
                  <div className="pt-3 border-t border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-6">
                      <button className="flex items-center gap-2 text-gray-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors group">
                        <div className="rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors p-2">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium group-hover:text-red-500 dark:group-hover:text-red-400">0</span>
                      </button>
                      
                      <button className="flex items-center gap-2 text-gray-600 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors group">
                        <div className="rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors p-2">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium group-hover:text-blue-500 dark:group-hover:text-blue-400">0</span>
                      </button>
                      
                      <div className="flex items-center gap-2 text-gray-500 dark:text-slate-500">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="text-sm font-medium">0</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Info Message */}
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                💡 This is how your post will appear in the feed. You can go back to edit or publish it now.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="sticky bottom-0 p-6 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700/50 flex gap-3">
            <button
              onClick={() => setShowPreview(false)}
              className="flex-1 px-6 py-3 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 font-medium rounded-xl transition-colors"
            >
              ← Back to Edit
            </button>
            <button
              onClick={(e) => {
                setShowPreview(false)
                // Trigger form submit
                const form = document.querySelector('form')
                if (form) {
                  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
                }
              }}
              disabled={isUploading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Publishing...' : '🚀 Publish Now'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
