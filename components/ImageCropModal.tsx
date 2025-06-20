'use client'

import React, { useState, useCallback } from 'react'
import Cropper, { Point, Area } from 'react-easy-crop'
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'

interface ImageCropModalProps {
  image: string
  onCropComplete: (croppedImage: string, aspectRatio?: number) => void
  onCancel: () => void
}

interface AspectRatio {
  value: number
  label: string
  icon: string
  width: number
  height: number
}

const aspectRatios: AspectRatio[] = [
  { value: 1, label: 'Square', icon: '1:1', width: 1, height: 1 },
  { value: 16/9, label: 'Landscape', icon: '16:9', width: 16, height: 9 },
  { value: 4/3, label: 'Classic', icon: '4:3', width: 4, height: 3 },
  { value: 9/16, label: 'Portrait', icon: '9:16', width: 9, height: 16 },
  { value: 3/4, label: 'Portrait Classic', icon: '3:4', width: 3, height: 4 },
  { value: 2/3, label: 'Phone', icon: '2:3', width: 2, height: 3 },
]

export default function ImageCropModal({ image, onCropComplete, onCancel }: ImageCropModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>(aspectRatios[0])
  const [isProcessing, setIsProcessing] = useState(false)

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

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Crop Image
            </h3>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Select aspect ratio and adjust the crop area
          </p>
        </div>

        {/* Aspect ratio selector */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {aspectRatios.map((ratio) => (
              <button
                key={ratio.label}
                onClick={() => setSelectedRatio(ratio)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg border transition-all ${
                  selectedRatio.value === ratio.value
                    ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`border-2 ${
                    selectedRatio.value === ratio.value
                      ? 'border-purple-500'
                      : 'border-gray-400 dark:border-gray-600'
                  }`} style={{
                    width: ratio.width * 3,
                    height: ratio.height * 3,
                  }} />
                  <div className="text-sm">
                    <div className="font-medium">{ratio.icon}</div>
                    <div className="text-xs opacity-75">{ratio.label}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Cropper */}
        <div className="relative flex-1 bg-black">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={selectedRatio.value}
            onCropChange={onCropChange}
            onCropComplete={onCropCompleteHandler}
            onZoomChange={setZoom}
          />
        </div>

        {/* Zoom control */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">Zoom:</span>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12 text-right">
              {Math.round((zoom - 1) * 100)}%
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCropConfirm}
            disabled={isProcessing}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <CheckIcon className="w-4 h-4" />
            {isProcessing ? 'Processing...' : 'Apply Crop'}
          </button>
        </div>
      </div>
    </div>
  )
} 