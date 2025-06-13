'use client'

import React, { useState, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useUser } from '@/lib/hooks/useUser'
import { toast } from 'react-hot-toast'
import { 
  PhotoIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  MusicalNoteIcon,
  XMarkIcon,
  PlusIcon,
  GlobeAltIcon,
  UsersIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  LockClosedIcon,
  StarIcon
} from '@heroicons/react/24/outline'

const categories = [
  'Art', 'Music', 'Gaming', 'Lifestyle', 'Fitness', 
  'Tech', 'DeFi', 'NFT', 'Trading', 'GameFi', 
  'Blockchain', 'Intimate', 'Education', 'Comedy'
]

interface CreatePostModalProps {
  onPostCreated?: () => void
  onClose?: () => void
}

export default function CreatePostModal({ onPostCreated, onClose }: CreatePostModalProps) {
  const { connected, publicKey } = useWallet()
  const { user } = useUser()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'Art',
    tags: [] as string[],
    currentTag: '',
    file: null as File | null,
    preview: '',
    type: 'text' as 'text' | 'image' | 'video' | 'audio',
    accessType: 'free' as 'free' | 'subscribers' | 'premium' | 'paid' | 'vip',
    price: 0,
    currency: 'SOL' as 'SOL' | 'USDC'
  })

  const contentTypes = [
    { id: 'text', label: 'Текст', icon: DocumentTextIcon, color: 'text-blue-400' },
    { id: 'image', label: 'Изображение', icon: PhotoIcon, color: 'text-green-400' },
    { id: 'video', label: 'Видео', icon: VideoCameraIcon, color: 'text-purple-400' },
    { id: 'audio', label: 'Аудио', icon: MusicalNoteIcon, color: 'text-pink-400' },
  ]

  const accessTypes = [
    { 
      value: 'free', 
      label: 'Бесплатно', 
      desc: 'Доступно всем',
      icon: GlobeAltIcon,
      color: 'from-green-500 to-emerald-500'
    },
    { 
      value: 'subscribers', 
      label: 'Для подписчиков', 
      desc: 'Basic и выше',
      icon: UsersIcon,
      color: 'from-blue-500 to-cyan-500'
    },
    { 
      value: 'premium', 
      label: 'Premium', 
      desc: 'Premium и VIP',
      icon: SparklesIcon,
      color: 'from-purple-500 to-pink-500'
    },
    { 
      value: 'vip', 
      label: 'VIP контент', 
      desc: 'Только VIP',
      icon: StarIcon,
      color: 'from-yellow-500 to-orange-500'
    },
    { 
      value: 'paid', 
      label: 'Платный', 
      desc: 'Разовая покупка',
      icon: CurrencyDollarIcon,
      color: 'from-red-500 to-rose-500'
    }
  ]

  const handleFileUpload = (file: File) => {
    // Определяем тип контента по файлу
    let contentType: 'image' | 'video' | 'audio' = 'image'
    const maxSizes = {
      image: 10 * 1024 * 1024, // 10MB
      video: 100 * 1024 * 1024, // 100MB
      audio: 50 * 1024 * 1024 // 50MB
    }

    if (file.type.startsWith('video/')) {
      contentType = 'video'
    } else if (file.type.startsWith('audio/')) {
      contentType = 'audio'
    }

    const maxSize = maxSizes[contentType]
    if (file.size > maxSize) {
      toast.error(`Размер файла не должен превышать ${maxSize / (1024 * 1024)}MB`)
      return
    }

    setFormData(prev => ({
      ...prev,
      file,
      type: contentType,
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
    const tag = formData.currentTag.trim().toLowerCase()
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 5) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag],
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

  const uploadMedia = async (file: File): Promise<string | null> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', file.type.startsWith('video/') ? 'video' : 
                            file.type.startsWith('audio/') ? 'audio' : 'image')

    try {
      const response = await fetch('/api/posts/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ошибка загрузки файла')
      }

      const data = await response.json()
      return data.url
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Ошибка загрузки файла')
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!connected || !publicKey) {
      toast.error('Подключите кошелек')
      return
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Заполните название и описание')
      return
    }

    if (formData.accessType === 'paid' && (!formData.price || formData.price <= 0)) {
      toast.error('Укажите цену для платного контента')
      return
    }

    setIsUploading(true)

    try {
      let mediaUrl = null
      let thumbnail = null

      // Загружаем медиа файл если есть
      if (formData.file) {
        mediaUrl = await uploadMedia(formData.file)
        if (!mediaUrl) {
          throw new Error('Не удалось загрузить файл')
        }
        
        // Для видео и аудио используем превью как thumbnail
        if (formData.type === 'video' || formData.type === 'audio') {
          thumbnail = '/placeholder-' + formData.type + '.png'
        } else {
          thumbnail = mediaUrl
        }
      }

      // Создаем пост
      const postData = {
        wallet: publicKey.toString(),
        title: formData.title,
        content: formData.content,
        type: formData.type,
        category: formData.category,
        tags: formData.tags,
        thumbnail,
        mediaUrl,
        isLocked: formData.accessType !== 'free',
        price: formData.accessType === 'paid' ? formData.price : undefined,
        currency: formData.accessType === 'paid' ? formData.currency : undefined,
        isPremium: formData.accessType === 'vip',
        tier: formData.accessType
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ошибка создания поста')
      }

      const { post } = await response.json()
      console.log('Post created:', post)
      
      toast.success('Пост успешно создан!')
      
      // Сбрасываем форму
      setFormData({
        title: '',
        content: '',
        category: 'Art',
        tags: [],
        currentTag: '',
        file: null,
        preview: '',
        type: 'text',
        accessType: 'free',
        price: 0,
        currency: 'SOL'
      })

      // Закрываем модалку и обновляем
      if (onClose) onClose()
      if (onPostCreated) {
        setTimeout(onPostCreated, 500)
      }

    } catch (error) {
      console.error('Post creation error:', error)
      toast.error(error instanceof Error ? error.message : 'Ошибка создания поста')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-3xl max-w-4xl w-full my-8 border border-slate-700/50 shadow-2xl">
        <form onSubmit={handleSubmit} className="p-6 lg:p-8 space-y-6">
          {/* Заголовок */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Создать новый пост
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-700/50 rounded-xl transition-colors text-slate-400 hover:text-white"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Левая колонка */}
            <div className="space-y-6">
              {/* Выбор типа контента */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Тип контента
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {contentTypes.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: type.id as any }))}
                      className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                        formData.type === type.id
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                      }`}
                    >
                      <type.icon className={`w-5 h-5 ${formData.type === type.id ? type.color : 'text-slate-400'}`} />
                      <span className={`text-sm font-medium ${formData.type === type.id ? 'text-white' : 'text-slate-400'}`}>
                        {type.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Загрузка файла (если не текст) */}
              {formData.type !== 'text' && (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center cursor-pointer hover:border-purple-500/50 transition-colors bg-slate-800/30"
                >
                  {formData.preview ? (
                    <div className="relative">
                      {formData.type === 'image' && (
                        <img
                          src={formData.preview}
                          alt="Preview"
                          className="max-w-full h-40 object-cover rounded-xl mx-auto"
                        />
                      )}
                      {formData.type === 'video' && (
                        <video
                          src={formData.preview}
                          className="max-w-full h-40 object-cover rounded-xl mx-auto"
                          controls
                        />
                      )}
                      {formData.type === 'audio' && (
                        <div className="p-4 bg-slate-700/50 rounded-xl">
                          <MusicalNoteIcon className="w-12 h-12 mx-auto text-pink-400 mb-2" />
                          <audio src={formData.preview} controls className="w-full" />
                        </div>
                      )}
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
                      <PhotoIcon className="w-10 h-10 mx-auto text-slate-500 mb-2" />
                      <p className="text-sm font-medium text-slate-300">
                        Перетащите файл или нажмите
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        Макс: {formData.type === 'video' ? '100MB' : formData.type === 'audio' ? '50MB' : '10MB'}
                      </p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    accept={
                      formData.type === 'video' ? 'video/*' :
                      formData.type === 'audio' ? 'audio/*' :
                      'image/*'
                    }
                    className="hidden"
                  />
                </div>
              )}

              {/* Категория */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Категория
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Теги */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Теги (макс. 5)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm flex items-center gap-1"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-red-400"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                {formData.tags.length < 5 && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.currentTag}
                      onChange={(e) => setFormData(prev => ({ ...prev, currentTag: e.target.value }))}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="flex-1 px-3 py-1.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      placeholder="Добавить тег..."
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-colors"
                    >
                      <PlusIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Правая колонка */}
            <div className="space-y-6">
              {/* Название */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Название *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Введите название поста"
                  maxLength={100}
                  required
                />
              </div>

              {/* Описание */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Описание *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={4}
                  placeholder="Опишите ваш контент..."
                  maxLength={2000}
                  required
                />
                <p className="text-xs text-slate-600 mt-1">
                  {formData.content.length}/2000 символов
                </p>
              </div>

              {/* Тип доступа */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Доступ к контенту
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {accessTypes.map((access) => (
                    <button
                      key={access.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, accessType: access.value as any }))}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        formData.accessType === access.value
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`p-1 rounded-lg bg-gradient-to-r ${access.color} bg-opacity-20`}>
                          <access.icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="font-medium text-white text-sm">{access.label}</div>
                      </div>
                      <div className="text-xs text-slate-400 ml-7">{access.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Настройка цены */}
              {formData.accessType === 'paid' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Цена
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="1000"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Валюта
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value as 'SOL' | 'USDC' }))}
                      className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="SOL">SOL</option>
                      <option value="USDC">USDC</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex gap-3 pt-4 border-t border-slate-700/50">
            <button
              type="submit"
              disabled={isUploading || !connected}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:from-purple-600 hover:to-pink-600 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Публикация...
                </>
              ) : (
                <>
                  <LockClosedIcon className="w-5 h-5" />
                  Опубликовать
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white font-medium rounded-xl transition-colors"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
