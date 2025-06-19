'use client'

import React, { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { toast } from 'react-hot-toast'
import { 
  BoltIcon, 
  XMarkIcon,
  ClockIcon,
  PercentBadgeIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'

interface CreateFlashSaleProps {
  postId?: string
  subscriptionPlan?: 'basic' | 'premium' | 'vip'
  onClose: () => void
  onCreated?: () => void
}

export default function CreateFlashSale({ 
  postId, 
  subscriptionPlan, 
  onClose, 
  onCreated 
}: CreateFlashSaleProps) {
  const { publicKey } = useWallet()
  const [isCreating, setIsCreating] = useState(false)
  
  const [formData, setFormData] = useState({
    discount: 20,
    duration: 60, // минуты
    maxRedemptions: ''
  })

  const presetDiscounts = [10, 20, 30, 40, 50]
  const presetDurations = [
    { value: 15, label: '15 min' },
    { value: 30, label: '30 min' },
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' },
    { value: 360, label: '6 hours' },
    { value: 1440, label: '24 hours' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!publicKey) {
      toast.error('Connect wallet first')
      return
    }

    setIsCreating(true)

    try {
      const response = await fetch('/api/flash-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorWallet: publicKey.toString(),
          postId,
          subscriptionPlan,
          discount: formData.discount,
          duration: formData.duration,
          maxRedemptions: formData.maxRedemptions ? parseInt(formData.maxRedemptions) : null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create flash sale')
      }

      toast.success(`Flash Sale created! ${formData.discount}% OFF for ${formData.duration} minutes`)
      
      if (onCreated) onCreated()
      onClose()
    } catch (error) {
      console.error('Error creating flash sale:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create flash sale')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl">
                <BoltIcon className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Create Flash Sale
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Discount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <PercentBadgeIcon className="w-5 h-5 inline mr-2" />
              Discount Percentage
            </label>
            
            {/* Preset buttons */}
            <div className="flex gap-2 mb-3">
              {presetDiscounts.map(discount => (
                <button
                  key={discount}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, discount }))}
                  className={`
                    px-4 py-2 rounded-lg font-medium transition-all
                    ${formData.discount === discount
                      ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  {discount}%
                </button>
              ))}
            </div>
            
            {/* Custom input */}
            <input
              type="range"
              min="10"
              max="90"
              step="5"
              value={formData.discount}
              onChange={(e) => setFormData(prev => ({ ...prev, discount: parseInt(e.target.value) }))}
              className="w-full accent-orange-500"
            />
            <div className="text-center mt-2 text-3xl font-bold text-orange-600 dark:text-orange-400">
              {formData.discount}% OFF
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <ClockIcon className="w-5 h-5 inline mr-2" />
              Duration
            </label>
            
            <div className="grid grid-cols-3 gap-2">
              {presetDurations.map(duration => (
                <button
                  key={duration.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, duration: duration.value }))}
                  className={`
                    px-4 py-2 rounded-lg font-medium transition-all
                    ${formData.duration === duration.value
                      ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  {duration.label}
                </button>
              ))}
            </div>
          </div>

          {/* Max redemptions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <UserGroupIcon className="w-5 h-5 inline mr-2" />
              Maximum Redemptions (optional)
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              placeholder="Unlimited"
              value={formData.maxRedemptions}
              onChange={(e) => setFormData(prev => ({ ...prev, maxRedemptions: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Leave empty for unlimited redemptions
            </p>
          </div>

          {/* Summary */}
          <div className="bg-gradient-to-r from-orange-500/10 to-pink-500/10 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Flash Sale Summary
            </h3>
            <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <li>• {formData.discount}% discount</li>
              <li>• Active for {formData.duration < 60 ? `${formData.duration} minutes` : `${formData.duration / 60} hours`}</li>
              <li>• {formData.maxRedemptions || 'Unlimited'} redemptions</li>
              <li>• Starts immediately</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-medium rounded-xl hover:from-orange-600 hover:to-pink-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <BoltIcon className="w-5 h-5" />
                  Create Flash Sale
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 