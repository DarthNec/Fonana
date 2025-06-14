'use client'

import { useState, useRef } from 'react'
import { XMarkIcon, UserIcon, PhotoIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { User } from '@/lib/hooks/useUser'
import Avatar from './Avatar'
import toast from 'react-hot-toast'

interface ProfileSetupModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (profileData: {
    nickname: string
    fullName?: string
    bio?: string
    avatar?: string
    backgroundImage?: string
    website?: string
    twitter?: string
    telegram?: string
    location?: string
  }) => Promise<User | undefined>
  userWallet: string
}

export default function ProfileSetupModal({
  isOpen,
  onClose,
  onSave,
  userWallet,
}: ProfileSetupModalProps) {
  const [formData, setFormData] = useState({
    nickname: '',
    fullName: '',
    bio: '',
    avatar: '',
    backgroundImage: '',
    website: '',
    twitter: '',
    telegram: '',
    location: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  
  // Drag & Drop states
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bgFileInputRef = useRef<HTMLInputElement>(null)
  
  // Success states
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')

  if (!isOpen) return null

  // Generate random nickname
  const generateRandomNickname = () => {
    const adjectives = [
      'Magic', 'Crypto', 'Cosmic', 'Digital', 'Neon', 'Quantum', 
      'Solar', 'Lunar', 'Stellar', 'Nova', 'Pixel', 'Vector',
      'Matrix', 'Phantom', 'Shadow', 'Lightning', 'Thunder', 'Storm'
    ]
    const nouns = [
      'Warrior', 'Hunter', 'Master', 'Creator', 'Builder', 'Artist',
      'Wizard', 'Knight', 'Guardian', 'Pioneer', 'Explorer', 'Voyager',
      'Dreamer', 'Visionary', 'Innovator', 'Genius', 'Legend', 'Hero'
    ]
    
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
    const noun = nouns[Math.floor(Math.random() * nouns.length)]
    const number = Math.floor(Math.random() * 999) + 1
    
    return `${adj}${noun}${number}`
  }

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      await uploadFile(file, 'avatar')
    }
  }

  const handleBackgroundChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      await uploadFile(file, 'background')
    }
  }

  const uploadFile = async (file: File, type: 'avatar' | 'background') => {
    setIsUploading(true)
    setUploadError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const endpoint = type === 'avatar' ? '/api/upload/avatar' : '/api/upload/background'
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const urlField = type === 'avatar' ? 'avatarUrl' : 'backgroundUrl'
        const targetField = type === 'avatar' ? 'avatar' : 'backgroundImage'
        handleChange(targetField, data[urlField])
        toast.success(`${type === 'avatar' ? 'Avatar' : 'Background'} uploaded`)
      } else {
        setUploadError(data.error || `Error uploading ${type === 'avatar' ? 'avatar' : 'background'}`)
        toast.error(data.error || 'Error uploading file')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadError('Error uploading file')
      toast.error('Error uploading file')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    const newErrors: { [key: string]: string } = {}
    if (!formData.nickname.trim()) {
      newErrors.nickname = 'Nickname is required'
    }
    if (formData.nickname.length < 3) {
      newErrors.nickname = 'Nickname must be at least 3 characters long'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    setSaveError('')
    
    try {
      // Generate fullName if not specified
      const fullName = formData.fullName.trim() || `User ${userWallet.slice(0, 4)}...${userWallet.slice(-4)}`

      await onSave({
        nickname: formData.nickname.trim(),
        fullName: fullName,
        bio: formData.bio.trim() || undefined,
        avatar: formData.avatar.trim() || undefined,
        backgroundImage: formData.backgroundImage.trim() || undefined,
        website: formData.website.trim() || undefined,
        twitter: formData.twitter.trim() || undefined,
        telegram: formData.telegram.trim() || undefined,
        location: formData.location.trim() || undefined,
      })
      
      // Show success and close modal after 2 seconds
      setSaveSuccess(true)
      setTimeout(() => {
        setSaveSuccess(false)
        onClose()
      }, 2000)
      
    } catch (error) {
      console.error('Error saving profile:', error)
      setSaveError('An error occurred while saving profile. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative w-full max-w-2xl bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-700/50 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white">
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Welcome!
                </span>
              </h2>
              <p className="text-slate-400 mt-1">Set up your profile</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar and Background Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Avatar */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Avatar
                </label>
                <div className="flex items-center gap-4">
                  <Avatar
                    src={formData.avatar}
                    alt="Profile"
                    seed={formData.nickname || userWallet}
                    size={80}
                    rounded="2xl"
                  />
                  <div>
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 cursor-pointer">
                      <PhotoIcon className="w-5 h-5" />
                      Change
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleAvatarChange}
                        disabled={isUploading}
                      />
                    </label>
                    <p className="text-slate-400 text-xs mt-1">JPG, PNG up to 5MB</p>
                  </div>
                </div>
              </div>

              {/* Background Image */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Background Image
                </label>
                <div className="space-y-2">
                  {formData.backgroundImage && (
                    <div className="relative w-full h-20 rounded-xl overflow-hidden">
                      <img 
                        src={formData.backgroundImage} 
                        alt="Background" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 cursor-pointer">
                    <PhotoIcon className="w-5 h-5" />
                    {formData.backgroundImage ? 'Change Background' : 'Upload Background'}
                    <input 
                      ref={bgFileInputRef}
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleBackgroundChange}
                      disabled={isUploading}
                    />
                  </label>
                  <p className="text-slate-400 text-xs">1920x400px, up to 10MB</p>
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nickname (required field) */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nickname *
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) => handleChange('nickname', e.target.value)}
                    placeholder="Your nickname"
                    className={`w-full pl-10 pr-16 py-3 bg-slate-700/50 border rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                      errors.nickname ? 'border-red-500' : 'border-slate-600/50'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => handleChange('nickname', generateRandomNickname())}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-400 hover:text-purple-300 transition-colors"
                    title="Generate random nickname"
                  >
                    <SparklesIcon className="w-5 h-5" />
                  </button>
                </div>
                {errors.nickname && (
                  <p className="text-red-400 text-sm mt-1">{errors.nickname}</p>
                )}
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                About Yourself
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
                placeholder="Tell us about yourself..."
                rows={3}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
              />
            </div>

            {/* Social Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Twitter
                </label>
                <input
                  type="text"
                  value={formData.twitter}
                  onChange={(e) => handleChange('twitter', e.target.value)}
                  placeholder="@username"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Telegram
                </label>
                <input
                  type="text"
                  value={formData.telegram}
                  onChange={(e) => handleChange('telegram', e.target.value)}
                  placeholder="@username"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="City, Country"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Wallet Info */}
            <div className="bg-slate-700/30 rounded-xl p-4">
              <p className="text-sm text-slate-400">Wallet connected:</p>
              <p className="text-white font-mono text-xs mt-1 break-all">
                {userWallet}
              </p>
            </div>

            {/* Success/Error Messages */}
            {saveSuccess && (
              <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-green-400 font-medium">Profile successfully saved!</p>
                  <p className="text-green-300 text-sm">Modal will close automatically...</p>
                </div>
              </div>
            )}

            {saveError && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <p className="text-red-400 font-medium">Save Error</p>
                  <p className="text-red-300 text-sm">{saveError}</p>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white font-medium rounded-xl transition-all"
              >
                Skip
              </button>
              <button
                type="submit"
                disabled={isLoading || !formData.nickname.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-medium rounded-xl transition-all disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>

          {/* Footer */}
          <p className="text-xs text-slate-500 text-center mt-6">
            You can change this information later in your profile settings
          </p>
        </div>
      </div>
    </div>
  )
} 