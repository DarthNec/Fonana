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

    // Create a test image to verify the URL works
    const testImg = new Image()
    testImg.onload = () => {
      console.log('[ImageCropModal] Test image loaded successfully')
      setImageError(false)
    }
    testImg.onerror = () => {
      console.error('[ImageCropModal] Test image failed to load:', image)
      setImageError(true)
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

    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('No 2d context')
    }

    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    )

    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (!blob) {
          reject(new Error('Canvas is empty'))
          return
        }
        const croppedImageUrl = URL.createObjectURL(blob)
        resolve(croppedImageUrl)
      }, 'image/jpeg')
    })
  }

  const handleCropConfirm = async () => {
    try {
      setIsProcessing(true)
      const croppedImage = await getCroppedImg(image, croppedAreaPixels)
      onCropComplete(croppedImage, selectedRatio.value)
    } catch (error) {
      console.error('Error cropping image:', error)
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
                console.log('[ImageCropModal] Image loaded successfully')
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