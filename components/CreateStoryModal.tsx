'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useUser } from '@/lib/store/appStore'
import { useStableWallet } from '@/lib/hooks/useStableWallet'
import { toast } from 'react-hot-toast'
import { 
  PhotoIcon,
  VideoCameraIcon,
  XMarkIcon,
  ScissorsIcon
} from '@heroicons/react/24/outline'
import ImageCropModal from './ImageCropModal'

interface CreateStoryModalProps {
  onClose?: () => void
  onStoryCreated?: (story?: any) => void
}

export default function CreateStoryModal({ onClose, onStoryCreated }: CreateStoryModalProps) {
  const { connected, publicKeyString } = useStableWallet()
  const user = useUser()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showCropModal, setShowCropModal] = useState(false)
  const [originalImage, setOriginalImage] = useState<string>('')
  
  // ✅ Проверка пользователя
  if (!user) {
    return null
  }
  
  const [formData, setFormData] = useState({
    file: null as File | null,
    preview: '',
    type: 'image' as 'image' | 'video'
  })

  // Блокировка скролла на мобильных
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.body.classList.add('modal-open')
      
      return () => {
        document.body.classList.remove('modal-open')
      }
    }
  }, [])

  const handleFileUpload = async (file: File) => {
    let contentType: 'image' | 'video' = 'image'
    const maxSizes = {
      image: 100 * 1024 * 1024, // 100MB
      video: 200 * 1024 * 1024, // 200MB
    }

    if (file.type.startsWith('video/')) {
      contentType = 'video'
    }

    const maxSize = maxSizes[contentType]
    if (file.size > maxSize) {
      toast.error(`File size should not exceed ${maxSize / (1024 * 1024)}MB`)
      return
    }

    // Обработка изображений
    if (contentType === 'image') {
      console.log('[CreateStoryModal] Processing image file:', file.name, 'size:', file.size)
      
      if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/i)) {
        toast.error('Unsupported image format. Please use JPEG, PNG, GIF, or WebP.')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        if (!result) {
          console.error('[CreateStoryModal] Failed to read file')
          toast.error('Failed to read image file')
          return
        }

        if (!result.startsWith('data:image/')) {
          console.error('[CreateStoryModal] Invalid image data URL format')
          toast.error('Invalid image format')
          return
        }

        console.log('[CreateStoryModal] Image loaded successfully')
        
        setOriginalImage(result)
        setFormData(prev => ({
          ...prev,
          file,
          type: contentType,
          preview: result
        }))
        
        // Открываем модалку кропа
        setTimeout(() => {
          console.log('[CreateStoryModal] Opening crop modal with image')
          setShowCropModal(true)
        }, 100)
      }
      
      reader.onerror = (e) => {
        console.error('[CreateStoryModal] FileReader error:', e)
        toast.error('Failed to read image file')
      }
      
      reader.readAsDataURL(file)
    } else {
      // Для видео
      const preview = URL.createObjectURL(file)
      setFormData(prev => ({
        ...prev,
        file,
        type: contentType,
        preview
      }))
    }
  }

  const handleCropComplete = async (croppedImage: string, aspectRatio?: number) => {
    try {
      console.log('[CreateStoryModal] Processing cropped image')
      
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

      const croppedFile = new File([blob], formData.file?.name || 'cropped-image.jpg', {
        type: 'image/jpeg'
      })
      
      setFormData(prev => ({
        ...prev,
        file: croppedFile,
        preview: croppedImage
      }))
      setShowCropModal(false)
      setOriginalImage('')
      
      toast.success('Image cropped successfully!')
    } catch (error) {
      console.error('[CreateStoryModal] Error processing cropped image:', error)
      toast.error(`Error processing image: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setShowCropModal(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('[CreateStoryModal] Starting story creation...')
    
    // Проверка кошелька
    const windowSolana = typeof window !== 'undefined' ? (window as any).solana : null
    const realConnected = windowSolana?.isConnected || false
    const realPublicKey = windowSolana?.publicKey
    
    const hasWalletConnection = (connected && publicKeyString) || (realConnected && realPublicKey)
    const walletAddress = publicKeyString || realPublicKey?.toString()
    
    if (!hasWalletConnection || !walletAddress) {
      toast.error('Connect wallet')
      return
    }

    if (!formData.file) {
      toast.error('Please select a file')
      return
    }

    setIsUploading(true)

    try {
      console.log('[CreateStoryModal] Uploading story to server...')
      
      // Создаем FormData для отправки
      const uploadFormData = new FormData()
      uploadFormData.append('file', formData.file)
      uploadFormData.append('userWallet', walletAddress)
      
      // Отправляем на сервер
      const response = await fetch('/api/stories', {
        method: 'POST',
        body: uploadFormData
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create story')
      }
      
      const result = await response.json()
      console.log('[CreateStoryModal] Story created:', result.story)
      
      toast.success('Story created successfully!')
      
      // Reset form
      setFormData({
        file: null,
        preview: '',
        type: 'image'
      })

      if (onClose) onClose()
      if (onStoryCreated) {
        onStoryCreated(result.story)
      }

    } catch (error) {
      console.error('[CreateStoryModal] Story creation error:', error)
      toast.error(error instanceof Error ? error.message : 'Error creating story')
    } finally {
      setIsUploading(false)
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
              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                Create Story
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              >
                <XMarkIcon className="w-5 sm:w-6 h-5 sm:h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* File upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                  Upload photo or video
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
                          className="max-w-full h-60 object-cover rounded-xl mx-auto"
                        />
                      )}
                      {formData.type === 'video' && (
                        <video
                          src={formData.preview}
                          className="max-w-full h-60 object-cover rounded-xl mx-auto"
                          controls
                        />
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
                      <div className="flex justify-center gap-4 mb-4">
                        <PhotoIcon className="w-10 h-10 text-purple-500" />
                        <VideoCameraIcon className="w-10 h-10 text-pink-500" />
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                        Drag file or click
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-600 mt-1">
                        Max: Image 100MB, Video 200MB
                      </p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    accept="image/*,video/*"
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
                    Edit Crop
                  </button>
                </div>
              )}

              {/* Info */}
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                <p className="text-sm text-purple-900 dark:text-purple-200">
                  📸 Stories are visible for 24 hours
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-slate-700/50 pb-safe sm:pb-0">
              <button
                type="submit"
                disabled={isUploading || !formData.file}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:from-purple-600 hover:to-pink-600 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Publishing...
                  </>
                ) : (
                  'Publish Story'
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
            if (!formData.preview) {
              setFormData(prev => ({ ...prev, file: null }))
            }
          }}
        />
      )}
    </>
  )
}

