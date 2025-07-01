'use client'

import React, { useState, useCallback, useEffect } from 'react'
import Cropper, { Point, Area } from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import { 
  XMarkIcon, 
  CheckIcon, 
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import styles from './ImageCropModal.module.css'
import { toast } from 'react-hot-toast'

interface ImageCropModalProps {
  image: string
  onCropComplete: (croppedImage: string, aspectRatio?: number) => void
  onCancel: () => void
}

interface AspectRatio {
  name: string
  value: number
  icon: string
  description: string
}

const aspectRatios: AspectRatio[] = [
  { name: 'Vertical', value: 3/4, icon: '📱', description: 'Best for mobile & TikTok' },
  { name: 'Square', value: 1, icon: '⬜', description: 'Perfect for Instagram' },
  { name: 'Horizontal', value: 16/9, icon: '🖼️', description: 'Great for YouTube & web' }
]

export default function ImageCropModal({ image, onCropComplete, onCancel }: ImageCropModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>(aspectRatios[0])
  const [isProcessing, setIsProcessing] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Check if image loads properly
  useEffect(() => {
    if (!image) {
      console.error('[ImageCropModal] No image provided')
      setImageError(true)
      return
    }

    // КРИТИЧЕСКИЙ ФИКС: проверяем формат изображения
    if (!image.startsWith('data:image/') && !image.startsWith('blob:') && !image.startsWith('http')) {
      console.error('[ImageCropModal] Invalid image format:', image.substring(0, 50))
      setImageError(true)
      toast.error('Invalid image format')
      return
    }

    // Create a test image to verify the URL works
    const testImg = new Image()
    testImg.onload = () => {
      console.log('[ImageCropModal] Test image loaded successfully:', {
        width: testImg.width,
        height: testImg.height,
        src: testImg.src.substring(0, 50)
      })
      setImageError(false)
    }
    testImg.onerror = (e) => {
      console.error('[ImageCropModal] Test image failed to load:', {
        error: e,
        imageSrc: image.substring(0, 50)
      })
      setImageError(true)
      toast.error('Failed to load image. Please try another image.')
    }
    testImg.src = image
  }, [image])

  const onCropChange = useCallback((location: Point) => {
    setCrop(location)
  }, [])

  const onCropCompleteHandler = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image()
      image.addEventListener('load', () => resolve(image))
      image.addEventListener('error', error => reject(error))
      image.setAttribute('crossOrigin', 'anonymous')
      image.src = url
    })

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area | null
  ): Promise<string> => {
    if (!pixelCrop) return imageSrc

    console.log('[ImageCropModal] Starting crop with:', { imageSrc, pixelCrop })

    // КРИТИЧЕСКИЙ ФИКС: дополнительная валидация параметров кропа
    if (pixelCrop.width <= 0 || pixelCrop.height <= 0) {
      console.error('[ImageCropModal] Invalid crop dimensions:', pixelCrop)
      throw new Error('Invalid crop dimensions')
    }

    const image = await createImage(imageSrc)
    console.log('[ImageCropModal] Image loaded:', image.width, 'x', image.height)
    
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('No 2d context')
    }

    // ФИКС: убедимся что размеры canvas корректны
    const cropWidth = Math.floor(pixelCrop.width)
    const cropHeight = Math.floor(pixelCrop.height)
    
    if (cropWidth <= 0 || cropHeight <= 0) {
      console.error('[ImageCropModal] Invalid canvas dimensions:', cropWidth, cropHeight)
      throw new Error('Invalid canvas dimensions')
    }

    canvas.width = cropWidth
    canvas.height = cropHeight

    console.log('[ImageCropModal] Canvas size:', canvas.width, 'x', canvas.height)

    // ФИКС: проверяем что координаты кропа не выходят за границы изображения
    const sourceX = Math.max(0, Math.floor(pixelCrop.x))
    const sourceY = Math.max(0, Math.floor(pixelCrop.y))
    const sourceWidth = Math.min(cropWidth, image.width - sourceX)
    const sourceHeight = Math.min(cropHeight, image.height - sourceY)

    console.log('[ImageCropModal] Drawing from:', { sourceX, sourceY, sourceWidth, sourceHeight }, 'to canvas')

    // Очищаем canvas перед рисованием
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Заполняем белым фоном на случай прозрачности
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height
    )

    // ФИКС: проверяем что что-то нарисовано на canvas
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const isEmpty = imageData.data.every((pixel, index) => {
      // Проверяем только каждый 4-й пиксель (альфа канал) или RGB значения
      return index % 4 === 3 ? pixel === 255 : pixel === 255
    })

    if (isEmpty) {
      console.error('[ImageCropModal] Canvas appears to be empty after drawing')
      // Не выбрасываем ошибку, попытаемся сохранить как есть
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (!blob) {
          console.error('[ImageCropModal] Failed to create blob from canvas')
          // Попытаемся создать fallback изображение
          canvas.toBlob(fallbackBlob => {
            if (!fallbackBlob) {
              reject(new Error('Canvas is empty - unable to create image'))
              return
            }
            const croppedImageUrl = URL.createObjectURL(fallbackBlob)
            console.log('[ImageCropModal] Created fallback blob URL:', croppedImageUrl)
            resolve(croppedImageUrl)
          }, 'image/png', 0.9)
          return
        }
        const croppedImageUrl = URL.createObjectURL(blob)
        console.log('[ImageCropModal] Successfully created blob URL:', croppedImageUrl)
        resolve(croppedImageUrl)
      }, 'image/jpeg', 0.9)
    })
  }

  const handleCropConfirm = async () => {
    try {
      // КРИТИЧЕСКИЙ ФИКС: дополнительная валидация перед кропом
      if (!image || imageError) {
        console.error('[ImageCropModal] Cannot crop - image not loaded or has error')
        toast.error('Изображение не загружено. Попробуйте еще раз.')
        return
      }
      
      if (!croppedAreaPixels) {
        console.error('[ImageCropModal] Cannot crop - no crop area defined')
        toast.error('Пожалуйста, выберите область для обрезки')
        return
      }
      
      setIsProcessing(true)
      const croppedImage = await getCroppedImg(image, croppedAreaPixels)
      onCropComplete(croppedImage, selectedRatio.value)
    } catch (error) {
      console.error('Error cropping image:', error)
      toast.error('Ошибка при обработке изображения. Попробуйте другое изображение.')
    } finally {
      setIsProcessing(false)
    }
  }

  // Debug log
  console.log('[ImageCropModal] Image URL:', image)

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[100] flex items-center justify-center p-0 sm:p-4 animate-fade-in" style={{ zIndex: 100 }}>
      <div className="modal-content bg-white dark:bg-slate-900 backdrop-blur-xl rounded-none sm:rounded-3xl max-w-5xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col border-0 sm:border border-gray-200 dark:border-slate-700/50 shadow-2xl animate-slideInUp">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                Perfect Your Image
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1 flex items-center gap-1">
                <InformationCircleIcon className="w-4 h-4" />
                Select aspect ratio and adjust crop area for best results
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800/50 rounded-xl transition-colors text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Aspect ratio selector - modern design */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700/50">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {aspectRatios.map((ratio) => (
              <button
                key={ratio.name}
                onClick={() => setSelectedRatio(ratio)}
                className={`flex-shrink-0 px-5 py-4 rounded-2xl border-2 transition-all transform hover:scale-105 min-w-[140px] ${
                  selectedRatio.value === ratio.value
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25 border-transparent'
                    : 'bg-white dark:bg-slate-800/50 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-purple-500/50'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="text-3xl">{ratio.icon}</div>
                  <div className="text-center">
                    <div className="font-semibold">{ratio.name}</div>
                    <div className="text-xs opacity-75">
                      {ratio.value === 3/4 ? '3:4' : ratio.value === 1 ? '1:1' : '16:9'}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {/* Description for selected format */}
          <p className="text-xs text-center text-gray-500 dark:text-slate-500 mt-3">
            {selectedRatio.description}
          </p>
        </div>

        {/* Cropper - with grid */}
        <div className={`${styles.cropContainer} relative bg-black flex-1`}>
          {imageError ? (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <div className="text-center">
                <p className="text-lg mb-2">Failed to load image</p>
                <p className="text-sm opacity-70">Please try uploading again</p>
              </div>
            </div>
          ) : (
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              aspect={selectedRatio.value}
              onCropChange={onCropChange}
              onCropComplete={onCropCompleteHandler}
              onZoomChange={setZoom}
              onMediaLoaded={() => {
                console.log('[ImageCropModal] Image loaded successfully in Cropper')
                setImageError(false)
              }}
              showGrid={true}
              classes={{
                containerClassName: styles.cropperContainer,
                cropAreaClassName: styles.cropArea
              }}
            />
          )}
        </div>

        {/* Zoom control - modern design */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-700/50">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setZoom(Math.max(1, zoom - 0.1))}
              className="p-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-all hover:scale-110 text-gray-600 dark:text-slate-400"
            >
              <MagnifyingGlassMinusIcon className="w-5 h-5" />
            </button>
            
            <div className="flex-1 relative">
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div 
                className="absolute top-1/2 -translate-y-1/2 h-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg pointer-events-none transition-all"
                style={{ width: `${((zoom - 1) / 2) * 100}%` }}
              />
            </div>
            
            <button
              onClick={() => setZoom(Math.min(3, zoom + 0.1))}
              className="p-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-all hover:scale-110 text-gray-600 dark:text-slate-400"
            >
              <MagnifyingGlassPlusIcon className="w-5 h-5" />
            </button>
            
            <span className="text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent w-12 text-right">
              {Math.round((zoom - 1) * 100)}%
            </span>
          </div>
        </div>

        {/* Actions - modern buttons */}
        <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-slate-700/50 flex justify-between items-center pb-24 sm:pb-6">
          <p className="text-xs text-gray-500 dark:text-slate-500 hidden sm:block">
            💡 Tip: Use pinch to zoom on mobile devices
          </p>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={onCancel}
              className="flex-1 sm:flex-none px-6 py-3 text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl font-medium transition-all border border-gray-200 dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleCropConfirm}
              disabled={isProcessing}
              className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-medium transition-all transform hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-purple-500/25 min-w-[120px]"
            >
              <CheckIcon className="w-5 h-5" />
              {isProcessing ? 'Processing...' : 'Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 