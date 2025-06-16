'use client'

import React, { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { 
  XMarkIcon, 
  PhotoIcon, 
  TagIcon,
  CurrencyDollarIcon,
  LockClosedIcon,
  LockOpenIcon,
  UsersIcon,
  StarIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { useUser } from '@/lib/hooks/useUser'
import toast from 'react-hot-toast'

interface EditPostModalProps {
  isOpen: boolean
  onClose: () => void
  post: any
  onPostUpdated?: () => void
}

const categories = [
  'Art', 'Music', 'Photography', 'Writing', 
  'Gaming', 'Fitness', 'Cooking', 'Technology',
  'Fashion', 'Travel', 'Education', 'Other'
]

const accessTypes = [
  { value: 'free', label: 'Free', icon: LockOpenIcon, description: 'Available to everyone' },
  { value: 'subscribers', label: 'Subscribers', icon: UsersIcon, description: 'Basic tier and above' },
  { value: 'premium', label: 'Premium', icon: StarIcon, description: 'Premium tier and above' },
  { value: 'vip', label: 'VIP Only', icon: SparklesIcon, description: 'VIP tier only' },
  { value: 'paid', label: 'Paid', icon: CurrencyDollarIcon, description: 'One-time purchase' },
]

export default function EditPostModal({ isOpen, onClose, post, onPostUpdated }: EditPostModalProps) {
  const { user } = useUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Предотвращаем закрытие модалки если она не открыта
  if (!isOpen) return null
  
  // Form data
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('')
  const [accessType, setAccessType] = useState('free')
  const [price, setPrice] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [removeExistingMedia, setRemoveExistingMedia] = useState(false)

  // Load post data when modal opens
  useEffect(() => {
    if (isOpen && post) {
      setTitle(post.title || '')
      setContent(post.content || '')
      setCategory(post.category || '')
      setTags(post.tags || [])
      setMediaPreview(post.image || post.mediaUrl || null)
      
      // Determine access type from post data
      if (!post.isLocked) {
        setAccessType('free')
      } else if (post.price && post.price > 0) {
        setAccessType('paid')
        setPrice(post.price.toString())
      } else if (post.requiredTier === 'vip' || post.isPremium) {
        setAccessType('vip')
      } else if (post.requiredTier === 'premium') {
        setAccessType('premium')
      } else if (post.requiredTier === 'basic') {
        setAccessType('subscribers')
      } else {
        setAccessType('subscribers')
      }
    }
  }, [isOpen, post])

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault() // Предотвращаем всплытие события
    e.stopPropagation() // Останавливаем распространение события
    
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error('File size must be less than 50MB')
        return
      }
      
      console.log('[EditPostModal] Loading file:', file.name)
      setMediaFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        console.log('[EditPostModal] File loaded successfully')
        setMediaPreview(e.target?.result as string)
      }
      reader.onerror = (e) => {
        console.error('[EditPostModal] File reading error:', e)
        toast.error('Failed to read file')
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveMedia = () => {
    setMediaFile(null)
    setMediaPreview(null)
    setRemoveExistingMedia(true)
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required')
      return
    }

    if (accessType === 'paid' && (!price || parseFloat(price) <= 0)) {
      toast.error('Please set a valid price for paid content')
      return
    }

    setIsSubmitting(true)

    try {
      // Upload media if new file selected
      let mediaUrl = removeExistingMedia ? null : post.mediaUrl
      if (mediaFile) {
        const formData = new FormData()
        formData.append('file', mediaFile)
        
        const uploadResponse = await fetch('/api/posts/upload', {
          method: 'POST',
          body: formData,
        })

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload media')
        }

        const uploadData = await uploadResponse.json()
        mediaUrl = uploadData.url
      }

      // Update post
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userWallet: user?.wallet,
          title,
          content,
          category,
          mediaUrl,
          tags,
          accessType,
          price: accessType === 'paid' ? parseFloat(price) : null,
          // Map access type to proper fields
          isLocked: accessType !== 'free',
          isPremium: accessType === 'vip',
          minSubscriptionTier: 
            accessType === 'vip' ? 'vip' :
            accessType === 'premium' ? 'premium' :
            accessType === 'subscribers' ? 'basic' :
            null
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update post')
      }

      toast.success('Post updated successfully!')
      onPostUpdated?.()
      onClose()
    } catch (error) {
      console.error('Error updating post:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update post')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
            <Dialog.Title className="text-2xl font-bold text-gray-900 dark:text-white">
              Edit Post
            </Dialog.Title>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Title */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600/50 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300"
                placeholder="Give your post a catchy title..."
              />
            </div>

            {/* Content */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 bg-white dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600/50 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300 resize-none"
                placeholder="Share your thoughts..."
              />
            </div>

            {/* Media Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Media
              </label>
              {mediaPreview ? (
                <div className="relative">
                  <img
                    src={mediaPreview}
                    alt="Media preview"
                    className="w-full h-64 object-cover rounded-2xl"
                  />
                  <button
                    onClick={handleRemoveMedia}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 dark:border-slate-600 border-dashed rounded-2xl cursor-pointer bg-gray-50 dark:bg-slate-700/30 hover:bg-gray-100 dark:hover:bg-slate-700/50">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <PhotoIcon className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      PNG, JPG, GIF or MP4 (MAX. 50MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,video/*"
                    onChange={handleMediaChange}
                    onClick={(e) => e.stopPropagation()}
                  />
                </label>
              )}
            </div>

            {/* Category */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600/50 rounded-2xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Access Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Access Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {accessTypes.map((type) => {
                  const Icon = type.icon
                  return (
                    <button
                      key={type.value}
                      onClick={() => setAccessType(type.value)}
                      className={`relative p-4 rounded-2xl border-2 transition-all ${
                        accessType === type.value
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-300 dark:border-slate-600 hover:border-purple-400'
                      }`}
                    >
                      <Icon className="w-6 h-6 text-gray-700 dark:text-slate-300 mb-2" />
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {type.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        {type.description}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Price (for paid content) */}
            {accessType === 'paid' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Price (SOL)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600/50 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300"
                  placeholder="0.00"
                />
              </div>
            )}

            {/* Tags */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Tags
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  className="flex-1 px-4 py-2 bg-white dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600/50 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300"
                  placeholder="Add a tag..."
                />
                <button
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm"
                  >
                    #{tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="text-purple-500 hover:text-purple-700"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-slate-700">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-2xl font-medium hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all duration-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`flex-1 px-6 py-3 rounded-2xl font-medium transition-all duration-300 ${
                isSubmitting
                  ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Updating...
                </span>
              ) : (
                'Update Post'
              )}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
} 