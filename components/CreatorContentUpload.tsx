'use client'

import React, { useState, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { toast } from 'react-hot-toast'
import { PhotoIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'
import { addPost } from '../lib/mockData'

const categories = ['Art', 'Music', 'Gaming', 'Lifestyle', 'Fitness', 'Tech', 'DeFi', 'NFT', 'Trading', 'GameFi', 'Blockchain', 'Intimate']

interface ContentUploadProps {
  creatorId: number
  onPostCreated?: () => void
  onClose?: () => void
}

export default function CreatorContentUpload({ creatorId, onPostCreated, onClose }: ContentUploadProps) {
  const { connected } = useWallet()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Art' as string,
    tags: [] as string[],
    currentTag: '',
    file: null as File | null,
    preview: '',
    accessType: 'free' as 'free' | 'premium' | 'paid',
    price: 0,
    currency: 'SOL' as 'SOL' | 'USDC'
  })

  const handleFileUpload = (file: File) => {
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File size must be less than 10MB')
      return
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'audio/mp3', 'audio/wav']
    if (!validTypes.includes(file.type)) {
      toast.error('Unsupported file type')
      return
    }

    setFormData(prev => ({
      ...prev,
      file,
      preview: URL.createObjectURL(file)
    }))
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
    if (formData.currentTag.trim() && !formData.tags.includes(formData.currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, prev.currentTag.trim()],
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!connected) {
      toast.error('Please connect your wallet')
      return
    }

    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Please fill in title and description')
      return
    }

    if (formData.accessType === 'paid' && (!formData.price || formData.price <= 0)) {
      toast.error('Please set a price for paid content')
      return
    }

    setIsUploading(true)

    try {
      // In a real app, this would upload file to IPFS/Arweave
      const imageUrl = formData.preview || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&h=300&fit=crop'
      
      const newPost = {
        title: formData.title,
        content: formData.description,
        category: formData.category,
        image: imageUrl,
        type: formData.file?.type.startsWith('video/') ? 'video' as const : 'image' as const,
        isLocked: formData.accessType !== 'free',
        price: formData.accessType === 'paid' ? formData.price : undefined,
        currency: formData.accessType === 'paid' ? formData.currency : undefined,
        tags: formData.tags,
        isPremium: formData.accessType === 'premium',
        likes: 0,
        comments: 0
      }

      console.log('Creating post with data:', newPost)
      
      // Add the post to mock data
      const createdPost = addPost(creatorId, newPost)
      console.log('Post created:', createdPost)
      
      toast.success('Content uploaded successfully!')
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: 'Art',
        tags: [],
        currentTag: '',
        file: null,
        preview: '',
        accessType: 'free',
        price: 0,
        currency: 'SOL'
      })

      // Close modal and refresh
      if (onClose) onClose()
      if (onPostCreated) {
        setTimeout(() => {
          onPostCreated()
        }, 1500)
      }

    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload content')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="w-full">
      <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="heading-lg">Create New Content</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100/50 rounded-xl transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload Area */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-indigo-400 transition-colors"
            >
              {formData.preview ? (
                <div className="relative">
                  <img
                    src={formData.preview}
                    alt="Preview"
                    className="max-w-full h-48 object-cover rounded-xl mx-auto image-content"
                  />
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
                  <PhotoIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    Drag & drop your content here
                  </p>
                  <p className="text-sm text-gray-500">
                    or click to browse files
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Supports: JPG, PNG, GIF, MP4, MP3, WAV (max 10MB)
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept="image/*,video/*,audio/*"
                className="hidden"
              />
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                Content Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="form-input"
                placeholder="Enter a catchy title for your content"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="form-textarea"
                rows={4}
                placeholder="Describe your content..."
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="form-input"
                required
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="badge badge-primary flex items-center gap-1"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-red-500"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.currentTag}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentTag: e.target.value }))}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="form-input flex-1"
                  placeholder="Add a tag..."
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="btn-secondary"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Access Type */}
            <div>
              <label className="block text-sm font-medium mb-3" style={{ color: 'hsl(var(--foreground))' }}>
                Content Access
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'free', label: 'Free', desc: 'Anyone can view' },
                  { value: 'premium', label: 'Premium', desc: 'Subscribers only' },
                  { value: 'paid', label: 'Pay per view', desc: 'One-time payment' }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, accessType: option.value as any }))}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData.accessType === option.value
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Price Setting */}
            {formData.accessType === 'paid' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                    Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    className="form-input"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value as 'SOL' | 'USDC' }))}
                    className="form-input"
                  >
                    <option value="SOL">SOL</option>
                    <option value="USDC">USDC</option>
                  </select>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isUploading}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Uploading...' : 'Publish Content'}
              </button>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
    </div>
  )
} 