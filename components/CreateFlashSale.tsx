'use client'

import React, { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { toast } from 'react-hot-toast'
import { 
  BoltIcon, 
  XMarkIcon,
  ClockIcon,
  PercentBadgeIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline'

interface CreateFlashSaleProps {
  postId?: string
  subscriptionPlan?: 'basic' | 'premium' | 'vip'
  onClose: () => void
  onCreated?: () => void
}

interface Post {
  id: string
  title: string
  price: number
}

export default function CreateFlashSale({ 
  postId, 
  subscriptionPlan, 
  onClose, 
  onCreated 
}: CreateFlashSaleProps) {
  const { publicKey } = useWallet()
  const [isCreating, setIsCreating] = useState(false)
  const [saleType, setSaleType] = useState<'post' | 'subscription'>('post')
  const [selectedPostId, setSelectedPostId] = useState(postId || '')
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'premium' | 'vip'>(subscriptionPlan || 'basic')
  const [userPosts, setUserPosts] = useState<Post[]>([])
  const [isLoadingPosts, setIsLoadingPosts] = useState(true)
  
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

  const subscriptionPlans = [
    { value: 'basic', label: 'Basic Tier', icon: '⭐' },
    { value: 'premium', label: 'Premium Tier', icon: '💎' },
    { value: 'vip', label: 'VIP Tier', icon: '👑' }
  ]

  // Load user's posts
  useEffect(() => {
    if (!publicKey) return
    
    const loadPosts = async () => {
      try {
        const response = await fetch(`/api/posts?creatorId=${publicKey.toString()}`)
        if (response.ok) {
          const data = await response.json()
          // Filter only paid posts
          const paidPosts = data.posts.filter((post: any) => post.price && post.price > 0)
          setUserPosts(paidPosts.map((post: any) => ({
            id: post.id,
            title: post.title,
            price: post.price
          })))
        }
      } catch (error) {
        console.error('Error loading posts:', error)
      } finally {
        setIsLoadingPosts(false)
      }
    }
    
    loadPosts()
  }, [publicKey])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!publicKey) {
      toast.error('Connect wallet first')
      return
    }

    if (saleType === 'post' && !selectedPostId) {
      toast.error('Please select a post')
      return
    }

    setIsCreating(true)

    try {
      const response = await fetch('/api/flash-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorWallet: publicKey.toString(),
          postId: saleType === 'post' ? selectedPostId : undefined,
          subscriptionPlan: saleType === 'subscription' ? selectedPlan : undefined,
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
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto animate-slideInUp">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
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
          {/* Sale Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Flash Sale Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSaleType('post')}
                className={`
                  p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2
                  ${saleType === 'post'
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                    : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                  }
                `}
              >
                <DocumentTextIcon className="w-6 h-6" />
                <span className="font-medium">Post</span>
                <span className="text-xs opacity-75">Discount on a specific post</span>
              </button>
              
              <button
                type="button"
                onClick={() => setSaleType('subscription')}
                className={`
                  p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2
                  ${saleType === 'subscription'
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                    : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                  }
                `}
              >
                <CreditCardIcon className="w-6 h-6" />
                <span className="font-medium">Subscription</span>
                <span className="text-xs opacity-75">Discount on subscription tier</span>
              </button>
            </div>
          </div>

          {/* Post Selection */}
          {saleType === 'post' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Post
              </label>
              {isLoadingPosts ? (
                <div className="text-center py-4">Loading posts...</div>
              ) : userPosts.length > 0 ? (
                <select
                  value={selectedPostId}
                  onChange={(e) => setSelectedPostId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                >
                  <option value="">Choose a post...</option>
                  {userPosts.map(post => (
                    <option key={post.id} value={post.id}>
                      {post.title} (${post.price})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  No paid posts found. Create paid posts first.
                </div>
              )}
            </div>
          )}

          {/* Subscription Plan Selection */}
          {saleType === 'subscription' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Select Subscription Tier
              </label>
              <div className="space-y-2">
                {subscriptionPlans.map(plan => (
                  <button
                    key={plan.value}
                    type="button"
                    onClick={() => setSelectedPlan(plan.value as 'basic' | 'premium' | 'vip')}
                    className={`
                      w-full p-3 rounded-xl border-2 transition-all flex items-center justify-between
                      ${selectedPlan === plan.value
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{plan.icon}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{plan.label}</span>
                    </div>
                    {selectedPlan === plan.value && (
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

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