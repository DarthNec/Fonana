'use client'

import React, { useState, useCallback, useEffect } from 'react'
import Cropper, { Point, Area } from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'
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
}

const aspectRatios: AspectRatio[] = [
  { name: 'Vertical', value: 3/4, icon: '📱' },
  { name: 'Square', value: 1, icon: '⬜' },
  { name: 'Horizontal', value: 16/9, icon: '🖼️' }
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-0 sm:p-4" style={{ zIndex: 100 }}>
      <div className="modal-content bg-white dark:bg-gradient-to-br dark:from-slate-800/95 dark:to-slate-900/95 backdrop-blur-xl rounded-none sm:rounded-3xl max-w-5xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col border-0 sm:border border-gray-200 dark:border-slate-700/50 shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700/50">
          <div className="flex items-center justify-between">
            <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
              Crop Image
            </h3>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
            Select aspect ratio and adjust the crop area
          </p>
        </div>

        {/* Aspect ratio selector */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700/50">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {aspectRatios.map((ratio) => (
              <button
                key={ratio.name}
                onClick={() => setSelectedRatio(ratio)}
                className={`flex-shrink-0 px-4 py-3 rounded-xl border-2 transition-all transform hover:scale-105 ${
                  selectedRatio.value === ratio.value
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25 border-transparent'
                    : 'bg-gray-50 dark:bg-slate-800/50 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-purple-500/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{ratio.icon}</div>
                  <div className="text-left">
                    <div className="font-semibold">{ratio.name}</div>
                    <div className="text-xs opacity-75">
                      {ratio.value === 3/4 ? '3:4' : ratio.value === 1 ? '1:1' : '16:9'}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Cropper */}
        <div className={styles.cropContainer}>
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
            />
          )}
        </div>

        {/* Zoom control */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-700/50">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Zoom:</span>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-purple-600"
            />
            <span className="text-sm font-bold text-purple-600 dark:text-purple-400 w-12 text-right">
              {Math.round((zoom - 1) * 100)}%
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-slate-700/50 flex justify-end gap-3 pb-20 sm:pb-6">
          <button
            onClick={onCancel}
            className="px-6 py-3 text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-slate-700/50 hover:bg-gray-200 dark:hover:bg-slate-600/50 rounded-xl font-medium transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleCropConfirm}
            disabled={isProcessing}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-medium transition-all transform hover:scale-105 flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-purple-500/25"
          >
            <CheckIcon className="w-5 h-5" />
            {isProcessing ? 'Processing...' : 'Apply Crop'}
          </button>
        </div>
      </div>
    </div>
  )
} 