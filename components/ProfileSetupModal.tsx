'use client'

import { useState, useRef } from 'react'
import { XMarkIcon, UserIcon, PhotoIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { User } from '@/lib/hooks/useUser'

interface ProfileSetupModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (profileData: {
    nickname: string
    fullName?: string
    bio?: string
    avatar?: string
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
    bio: '',
    avatar: '',
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
  
  // Success states
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')

  if (!isOpen) return null

  // Генерация случайного никнейма
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

  // Drag & Drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleAvatarDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      uploadAvatarFile(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      uploadAvatarFile(files[0])
    }
  }

  const uploadAvatarFile = async (file: File) => {
    setIsUploading(true)
    setUploadError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        handleChange('avatar', data.url)
      } else {
        setUploadError(data.error || 'Ошибка загрузки файла')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadError('Ошибка загрузки файла')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Валидация
    const newErrors: { [key: string]: string } = {}
    if (!formData.nickname.trim()) {
      newErrors.nickname = 'Никнейм обязателен'
    }
    if (formData.nickname.length < 3) {
      newErrors.nickname = 'Никнейм должен содержать минимум 3 символа'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    setSaveError('')
    
    try {
      // Генерируем fullName из адреса кошелька
      const generateFullName = (wallet: string) => {
        return `User ${wallet.slice(0, 4)}...${wallet.slice(-4)}`
      }

      await onSave({
        nickname: formData.nickname.trim(),
        fullName: generateFullName(userWallet),
        bio: formData.bio.trim() || undefined,
        avatar: formData.avatar.trim() || undefined,
        website: formData.website.trim() || undefined,
        twitter: formData.twitter.trim() || undefined,
        telegram: formData.telegram.trim() || undefined,
        location: formData.location.trim() || undefined,
      })
      
      // Показываем успех и закрываем модалку через 2 секунды
      setSaveSuccess(true)
      setTimeout(() => {
        setSaveSuccess(false)
        onClose()
      }, 2000)
      
    } catch (error) {
      console.error('Error saving profile:', error)
      setSaveError('Произошла ошибка при сохранении профиля. Попробуйте еще раз.')
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
        <div className="relative w-full max-w-md bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-700/50">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white">
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Добро пожаловать!
                </span>
              </h2>
              <p className="text-slate-400 mt-1">Настройте свой профиль</p>
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
            {/* Никнейм (обязательное поле) */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Никнейм *
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => handleChange('nickname', e.target.value)}
                  placeholder="Ваш никнейм"
                  className={`w-full pl-10 pr-16 py-3 bg-slate-700/50 border rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                    errors.nickname ? 'border-red-500' : 'border-slate-600/50'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => handleChange('nickname', generateRandomNickname())}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-400 hover:text-purple-300 transition-colors"
                  title="Сгенерировать случайный никнейм"
                >
                  <SparklesIcon className="w-5 h-5" />
                </button>
              </div>
              {errors.nickname && (
                <p className="text-red-400 text-sm mt-1">{errors.nickname}</p>
              )}
            </div>

            {/* Аватар */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Аватар
              </label>
              
              {/* Avatar Upload Zone */}
              <div
                onDrop={handleAvatarDrop}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`relative w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                  isDragging 
                    ? 'border-purple-400 bg-purple-500/10' 
                    : 'border-slate-600/50 hover:border-purple-500/50'
                }`}
              >
                {isUploading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                    <span className="ml-3 text-slate-300">Загрузка...</span>
                  </div>
                ) : formData.avatar ? (
                  <div className="relative w-full h-full">
                    <img
                      src={formData.avatar}
                      alt="Avatar preview"
                      className="w-full h-full object-cover rounded-xl"
                      onError={(e) => {
                        console.error('Image load error:', e)
                        // Для локальной разработки пробуем альтернативный путь
                        const currentTarget = e.currentTarget as HTMLImageElement
                        if (!currentTarget.dataset.retried) {
                          currentTarget.dataset.retried = 'true'
                          // Если не загрузился обычный путь, пробуем с префиксом
                          currentTarget.src = `${window.location.origin}${formData.avatar}`
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleChange('avatar', '')
                      }}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                    >
                      ×
                    </button>
                    <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                      <span className="text-white text-sm">Нажмите для замены</span>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                    <PhotoIcon className="w-8 h-8 mb-2" />
                    <p className="text-sm font-medium">Перетащите изображение</p>
                    <p className="text-xs">или нажмите для выбора</p>
                    <p className="text-xs mt-1 text-slate-500">JPG, PNG, GIF до 5MB</p>
                  </div>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              
              {uploadError && (
                <p className="text-red-400 text-sm mt-1">{uploadError}</p>
              )}
            </div>

            {/* Описание */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                О себе
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
                placeholder="Расскажите о себе..."
                rows={3}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
              />
            </div>

            {/* Wallet Info */}
            <div className="bg-slate-700/30 rounded-xl p-4">
              <p className="text-sm text-slate-400">Кошелек подключен:</p>
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
                  <p className="text-green-400 font-medium">Профиль успешно сохранен!</p>
                  <p className="text-green-300 text-sm">Модалка закроется автоматически...</p>
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
                  <p className="text-red-400 font-medium">Ошибка сохранения</p>
                  <p className="text-red-300 text-sm">{saveError}</p>
                </div>
              </div>
            )}

            {/* Кнопки */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white font-medium rounded-xl transition-all"
              >
                Пропустить
              </button>
              <button
                type="submit"
                disabled={isLoading || !formData.nickname.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-medium rounded-xl transition-all disabled:cursor-not-allowed"
              >
                {isLoading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </form>

          {/* Footer */}
          <p className="text-xs text-slate-500 text-center mt-6">
            Вы можете изменить эту информацию позже в настройках профиля
          </p>
        </div>
      </div>
    </div>
  )
} 