'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useUserContext } from '@/lib/contexts/UserContext'
import { useWallet } from '@solana/wallet-adapter-react'
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

const categories = [
  'Art', 'Music', 'Gaming', 'Lifestyle', 'Fitness', 
  'Tech', 'DeFi', 'NFT', 'Trading', 'GameFi', 
  'Blockchain', 'Intimate', 'Education', 'Comedy'
]

interface CreatePostModalProps {
  onPostCreated?: () => void
  onClose?: () => void
}

export default function CreatePostModal({ onPostCreated, onClose }: CreatePostModalProps) {
  const { connected, publicKey } = useWallet()
  const { user } = useUserContext()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showCropModal, setShowCropModal] = useState(false)
  const [originalImage, setOriginalImage] = useState<string>('')
  
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
    category: '', // Пустая категория по умолчанию
    tags: [] as string[],
    currentTag: '',
    file: null as File | null,
    preview: '',
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
    imageAspectRatio: 'square' as 'vertical' | 'square' | 'horizontal'
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

  const handleFileUpload = (file: File) => {
    // Determine content type based on file
    let contentType: 'image' | 'video' | 'audio' = 'image'
    const maxSizes = {
      image: 10 * 1024 * 1024, // 10MB
      video: 100 * 1024 * 1024, // 100MB
      audio: 50 * 1024 * 1024 // 50MB
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
          file,
          type: contentType,
          preview: result,
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
        file,
        type: contentType,
        preview,
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
        file: croppedFile,
        preview: croppedImage,
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

  const uploadMedia = async (file: File): Promise<{ url: string, thumbUrl?: string, previewUrl?: string } | null> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', file.type.startsWith('video/') ? 'video' : 
                            file.type.startsWith('audio/') ? 'audio' : 'image')

    try {
      const response = await fetch('/api/posts/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error uploading file')
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Error uploading file')
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('Starting form submission...')
    console.log('Connected:', connected)
    console.log('PublicKey:', publicKey?.toString())
    console.log('Form data:', formData)
    
    if (!connected || !publicKey) {
      toast.error('Connect wallet')
      return
    }

    if (!publicKey) {
      toast.error('Please connect your wallet')
      return
    }

    // Валидация только для текстовых постов
    if (formData.type === 'text' && !formData.content.trim()) {
      toast.error('Please enter content for text post')
      return
    }

    // Для медиа контента проверяем наличие файла
    if (formData.type !== 'text' && !formData.file) {
      toast.error('Please select a file')
      return
    }

    // Title необязателен для медиа, но если есть - должен быть не пустой
    if (formData.title.trim() === '' && formData.type === 'text') {
      toast.error('Please enter a title for text post')
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

      // Upload media file if present
      if (formData.file) {
        const uploadResult = await uploadMedia(formData.file)
        if (!uploadResult || !uploadResult.url) {
          throw new Error('Failed to upload file')
        }
        
        mediaUrl = uploadResult.url
        
        // Use thumbUrl from upload result or fallback to placeholder
        if (uploadResult.thumbUrl) {
          thumbnail = uploadResult.thumbUrl
        } else if (formData.type === 'video') {
          thumbnail = '/placeholder-video-enhanced.png'
        } else if (formData.type === 'audio') {
          thumbnail = '/placeholder-audio.png'
        } else {
          // For images use optimized version or original
          thumbnail = uploadResult.thumbUrl || uploadResult.url
        }
      }

      // Create post
      const postData = {
        creatorWallet: publicKey.toString(),
        title: formData.title,
        content: formData.content,
        type: formData.type,
        category: formData.category,
        tags: formData.tags,
        thumbnail,
        mediaUrl,
        isLocked: formData.accessType !== 'free',
              accessType: formData.accessType, // Добавляем accessType для правильной валидации на бэкенде
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

      console.log('Sending post data:', postData)
      
      const bodyString = JSON.stringify(postData)
      console.log('JSON body:', bodyString)

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: bodyString
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error creating post')
      }

      const { post } = await response.json()
      console.log('Post created:', post)
      
      toast.success('Post created successfully!')
      
      // Reset form
      setFormData({
        title: '',
        content: '',
        category: '',
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
        imageAspectRatio: 'square'
      })

      // Close modal and update
      if (onClose) onClose()
      if (onPostCreated) {
        setTimeout(onPostCreated, 500)
      }

    } catch (error) {
      console.error('Post creation error:', error)
      toast.error(error instanceof Error ? error.message : 'Error creating post')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      {/* Main Modal */}
      <div className={`fixed inset-0 bg-black/85 backdrop-blur-sm z-[100] flex items-start justify-center p-0 sm:p-4 overflow-y-auto animate-fade-in ${showCropModal ? 'pointer-events-none' : ''}`}>
        <div className="modal-content bg-white dark:bg-slate-900 backdrop-blur-xl rounded-none sm:rounded-3xl max-w-4xl w-full my-0 sm:my-8 border-y sm:border border-gray-200 dark:border-slate-700/50 shadow-2xl min-h-screen sm:min-h-0 animate-slideInUp">
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
              Create new post
            </h2>
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
              {/* Content type info - automatically detected */}
              {formData.type !== 'text' && formData.file && (
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

              {/* File upload - always shown */}
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
                        Max: {formData.type === 'video' ? '100MB' : formData.type === 'audio' ? '50MB' : '10MB'}
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

              {/* Crop button for images */}
              {formData.type === 'image' && formData.preview && (
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
              disabled={isUploading || !connected}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:from-purple-600 hover:to-pink-600 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <LockClosedIcon className="w-5 h-5" />
                  Publish
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
