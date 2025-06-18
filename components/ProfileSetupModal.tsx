'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { 
  UserIcon, 
  PhotoIcon, 
  LinkIcon,
  CheckCircleIcon,
  XCircleIcon,
  GlobeAltIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import Avatar from '@/components/Avatar'
import toast from 'react-hot-toast'
import { isValidNickname, isReservedNickname } from '@/lib/utils/links'

interface ProfileSetupModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (profileData: ProfileData) => void
  userWallet: string
}

interface ProfileData {
  nickname: string
  fullName: string
  bio: string
  avatar?: string
  backgroundImage?: string
  website?: string
  twitter?: string
  telegram?: string
}

export default function ProfileSetupModal({ 
  isOpen, 
  onClose, 
  onComplete,
  userWallet 
}: ProfileSetupModalProps) {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState<ProfileData>({
    nickname: '',
    fullName: '',
    bio: '',
    avatar: undefined,
    website: '',
    twitter: '',
    telegram: ''
  })

  // Nickname validation
  const [nicknameStatus, setNicknameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'reserved'>('idle')
  const [nicknameCheckTimeout, setNicknameCheckTimeout] = useState<NodeJS.Timeout | null>(null)

  const checkNicknameAvailability = async (nickname: string) => {
    if (!nickname) {
      setNicknameStatus('idle')
      return
    }

    // Validate format
    if (!isValidNickname(nickname)) {
      setNicknameStatus('invalid')
      return
    }

    // Check reserved names
    if (isReservedNickname(nickname)) {
      setNicknameStatus('reserved')
      return
    }

    setNicknameStatus('checking')
    
    try {
      const response = await fetch(`/api/user?nickname=${nickname}`)
      const data = await response.json()
      
      if (data.user) {
        setNicknameStatus('taken')
      } else {
        setNicknameStatus('available')
      }
    } catch (error) {
      setNicknameStatus('idle')
    }
  }

  const handleNicknameChange = (value: string) => {
    const formatted = value.toLowerCase().replace(/[^a-z0-9_-]/g, '')
    setFormData(prev => ({ ...prev, nickname: formatted }))
    
    // Clear previous timeout
    if (nicknameCheckTimeout) {
      clearTimeout(nicknameCheckTimeout)
    }
    
    // Set new timeout to check after user stops typing
    const timeout = setTimeout(() => {
      checkNicknameAvailability(formatted)
    }, 500)
    
    setNicknameCheckTimeout(timeout)
  }

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        
        const response = await fetch('/api/upload/avatar', {
          method: 'POST',
          body: formData
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to upload avatar')
        }
        
        setFormData(prev => ({ ...prev, avatar: data.avatarUrl }))
        toast.success('Avatar uploaded!')
      } catch (error) {
        console.error('Error uploading avatar:', error)
        toast.error('Failed to upload avatar')
      }
    }
  }

  const canProceed = () => {
    if (step === 1) {
      return formData.nickname && 
             nicknameStatus === 'available' && 
             formData.fullName
    }
    return true
  }

  const handleNext = () => {
    if (step < 3) {
      // Если переходим с шага 2 и био пустое, генерируем дефолтное
      if (step === 2 && !formData.bio.trim()) {
        setFormData(prev => ({
          ...prev,
          bio: `Fonana creator and Web3 enthusiast. Join me on this journey!`
        }))
      }
      setStep(step + 1)
    } else {
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    if (nicknameStatus !== 'available') {
      toast.error('Please choose an available nickname')
      return
    }

    setIsSubmitting(true)
    try {
      await onComplete(formData)
      toast.success('Profile created successfully!')
    } catch (error) {
      console.error('Error creating profile:', error)
      toast.error('Failed to create profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onClose={() => {
        // Разрешаем закрытие только если заполнены обязательные поля (после шага 1)
        if (step > 1 && formData.nickname && formData.fullName) {
          onClose()
        }
      }}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl">
          <div className="p-6">
            {/* Header */}
            <div className="text-center mb-6 relative">
              {/* Close button - показываем только после шага 1 */}
              {step > 1 && formData.nickname && formData.fullName && (
                <button
                  onClick={onClose}
                  className="absolute right-0 top-0 p-2 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                  aria-label="Close"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome to Fonana! 🎉
              </h2>
              <p className="text-gray-600 dark:text-slate-400">
                Let's set up your profile
              </p>
            </div>

            {/* Progress indicators */}
            <div className="flex justify-center gap-2 mb-8">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-2 w-12 rounded-full transition-all duration-300 ${
                    i <= step
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                      : 'bg-gray-200 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>

            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-6">
                {/* Avatar */}
                <div className="text-center">
                  <div className="relative inline-block">
                    <Avatar
                      src={formData.avatar}
                      alt="Your avatar"
                      seed={formData.nickname || userWallet}
                      size={96}
                      rounded="3xl"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform"
                    >
                      <PhotoIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />
                </div>

                {/* Nickname */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Choose your unique nickname
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LinkIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={formData.nickname}
                      onChange={(e) => handleNicknameChange(e.target.value)}
                      className={`w-full pl-10 pr-10 py-3 bg-white dark:bg-slate-700/50 border rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300 ${
                        nicknameStatus === 'taken' || nicknameStatus === 'invalid' || nicknameStatus === 'reserved'
                          ? 'border-red-500'
                          : nicknameStatus === 'available'
                          ? 'border-green-500'
                          : 'border-gray-300 dark:border-slate-600/50'
                      }`}
                      placeholder="your-unique-name"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      {nicknameStatus === 'checking' && (
                        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      )}
                      {nicknameStatus === 'available' && (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      )}
                      {(nicknameStatus === 'taken' || nicknameStatus === 'invalid' || nicknameStatus === 'reserved') && (
                        <XCircleIcon className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  </div>
                  {nicknameStatus === 'available' && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      ✓ fonana.me/{formData.nickname} is available!
                    </p>
                  )}
                  {nicknameStatus === 'taken' && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      This nickname is already taken
                    </p>
                  )}
                  {nicknameStatus === 'invalid' && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      Use only letters, numbers, hyphens and underscores
                    </p>
                  )}
                  {nicknameStatus === 'reserved' && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      This nickname is reserved
                    </p>
                  )}
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600/50 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300"
                    placeholder="Your name"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Bio */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Tell us about yourself
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600/50 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300 resize-none"
                    placeholder="Share something about yourself..."
                  />
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                    {formData.bio.length}/500
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Social Links */}
            {step === 3 && (
              <div className="space-y-6">
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
                  Add your social links (optional)
                </p>

                {/* Website */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Website
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <GlobeAltIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                      className="w-full pl-10 px-4 py-3 bg-white dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600/50 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300"
                      placeholder="https://your-website.com"
                    />
                  </div>
                </div>

                {/* Twitter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Twitter
                  </label>
                  <input
                    type="text"
                    value={formData.twitter}
                    onChange={(e) => setFormData(prev => ({ ...prev, twitter: e.target.value.replace('@', '') }))}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600/50 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300"
                    placeholder="username"
                  />
                </div>

                {/* Telegram */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Telegram
                  </label>
                  <input
                    type="text"
                    value={formData.telegram}
                    onChange={(e) => setFormData(prev => ({ ...prev, telegram: e.target.value.replace('@', '') }))}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600/50 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300"
                    placeholder="username"
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-8">
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-2xl font-medium hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all duration-300"
                >
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={!canProceed() || isSubmitting}
                className={`flex-1 px-6 py-3 rounded-2xl font-medium transition-all duration-300 ${
                  canProceed() && !isSubmitting
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                    : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating...
                  </span>
                ) : step === 3 ? (
                  'Complete Setup'
                ) : (
                  'Next'
                )}
              </button>
            </div>

            {/* Skip option for optional steps */}
            {(step === 2 || step === 3) && (
              <button
                onClick={handleNext}
                className="w-full mt-3 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 transition-colors"
              >
                Skip this step
              </button>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
} 