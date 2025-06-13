'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { 
  PhotoIcon, 
  VideoCameraIcon, 
  DocumentTextIcon,
  LockClosedIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  CloudArrowUpIcon,
  UsersIcon,
  StarIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface ContentItem {
  id: string
  title: string
  description: string
  type: 'image' | 'video' | 'text' | 'nft'
  access: 'public' | 'subscribers' | 'premium'
  price?: number
  currency?: 'SOL' | 'USDC'
  file?: File
  createdAt: Date
}

export function ContentCreator() {
  const { connected } = useWallet()
  const [isCreating, setIsCreating] = useState(false)
  const [content, setContent] = useState<ContentItem[]>([])
  const [newContent, setNewContent] = useState<Partial<ContentItem>>({
    type: 'image',
    access: 'public'
  })

  const contentTypes = [
    { id: 'image', label: 'Image', icon: PhotoIcon, gradient: 'from-blue-500 to-cyan-500' },
    { id: 'video', label: 'Video', icon: VideoCameraIcon, gradient: 'from-purple-500 to-pink-500' },
    { id: 'text', label: 'Text', icon: DocumentTextIcon, gradient: 'from-green-500 to-emerald-500' },
    { id: 'nft', label: 'NFT', icon: GlobeAltIcon, gradient: 'from-orange-500 to-red-500' }
  ] as const

  const accessLevels = [
    { id: 'public', label: 'Public', icon: GlobeAltIcon, description: 'Available to everyone', gradient: 'from-green-500 to-emerald-500' },
    { id: 'subscribers', label: 'Subscribers', icon: UsersIcon, description: 'For subscribers only', gradient: 'from-blue-500 to-cyan-500' },
    { id: 'premium', label: 'Premium', icon: StarIcon, description: 'One-time purchase', gradient: 'from-purple-500 to-pink-500' }
  ] as const

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setNewContent(prev => ({ ...prev, file }))
    }
  }

  const handleCreateContent = async () => {
    if (!connected) {
      toast.error('Подключите кошелёк')
      return
    }

    if (!newContent.title || !newContent.description) {
      toast.error('Заполните все обязательные поля')
      return
    }

    setIsCreating(true)
    
    try {
      // Здесь будет логика загрузки файла и создания контента
      const contentItem: ContentItem = {
        id: Date.now().toString(),
        title: newContent.title!,
        description: newContent.description!,
        type: newContent.type || 'image',
        access: newContent.access || 'public',
        price: newContent.price,
        currency: newContent.currency,
        file: newContent.file,
        createdAt: new Date()
      }

      setContent(prev => [contentItem, ...prev])
      setNewContent({ type: 'image', access: 'public' })
      toast.success('Контент успешно создан!')
    } catch (error) {
      console.error('Error creating content:', error)
      toast.error('Ошибка при создании контента')
    } finally {
      setIsCreating(false)
    }
  }

  if (!connected) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8 text-center">
        <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <LockClosedIcon className="h-10 w-10 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">Wallet Connection Required</h3>
        <p className="text-slate-400 text-lg">Connect your wallet to create content</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Content Creation Form */}
      <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8">
        <div className="space-y-8">
          {/* Content Type Selection */}
          <div>
            <label className="block text-lg font-bold text-white mb-6">
              Content Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {contentTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setNewContent(prev => ({ ...prev, type: type.id as 'text' | 'image' | 'video' | 'nft' }))}
                  className={`p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-105 ${
                    newContent.type === type.id
                      ? `border-purple-500 bg-gradient-to-br ${type.gradient} bg-opacity-20`
                      : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                  }`}
                >
                  <type.icon className={`w-8 h-8 mx-auto mb-3 ${
                    newContent.type === type.id ? 'text-white' : 'text-slate-400'
                  }`} />
                  <div className={`font-semibold ${
                    newContent.type === type.id ? 'text-white' : 'text-slate-300'
                  }`}>
                    {type.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-lg font-bold text-white mb-4">
              Title *
            </label>
            <input
              type="text"
              value={newContent.title || ''}
              onChange={(e) => setNewContent(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter content title"
              className="w-full px-6 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-lg font-bold text-white mb-4">
              Description *
            </label>
            <textarea
              value={newContent.description || ''}
              onChange={(e) => setNewContent(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your content in detail"
              rows={6}
              className="w-full px-6 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 resize-none"
              required
            />
          </div>

          {/* File Upload */}
          {newContent.type !== 'text' && (
            <div>
              <label className="block text-lg font-bold text-white mb-4">
                File
              </label>
              <div className="relative">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  accept={newContent.type === 'image' ? 'image/*' : newContent.type === 'video' ? 'video/*' : '*/*'}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-slate-600 rounded-2xl bg-slate-700/30 hover:border-purple-500 hover:bg-slate-600/30 transition-all duration-300">
                  <div className="text-center">
                    <CloudArrowUpIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-300 font-medium">
                      {newContent.file ? newContent.file.name : 'Choose file'}
                    </p>
                    <p className="text-slate-500 text-sm mt-1">
                      Click to select file
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Access Level */}
          <div>
            <label className="block text-lg font-bold text-white mb-6">
              Access Level
            </label>
            <div className="space-y-4">
              {accessLevels.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => setNewContent(prev => ({ ...prev, access: level.id as 'public' | 'subscribers' | 'premium' }))}
                  className={`w-full p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] ${
                    newContent.access === level.id
                      ? `border-purple-500 bg-gradient-to-br ${level.gradient} bg-opacity-20`
                      : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <level.icon className={`w-8 h-8 ${
                      newContent.access === level.id ? 'text-white' : 'text-slate-400'
                    }`} />
                    <div className="text-left">
                      <div className={`font-bold text-lg ${
                        newContent.access === level.id ? 'text-white' : 'text-slate-300'
                      }`}>
                        {level.label}
                      </div>
                      <div className={`text-sm ${
                        newContent.access === level.id ? 'text-slate-200' : 'text-slate-400'
                      }`}>
                        {level.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Premium Pricing */}
          {newContent.access === 'premium' && (
            <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-600">
              <h3 className="text-lg font-bold text-white mb-4">Premium Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newContent.price || ''}
                    onChange={(e) => setNewContent(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Currency *
                  </label>
                  <select
                    value={newContent.currency || 'USDC'}
                    onChange={(e) => setNewContent(prev => ({ ...prev, currency: e.target.value as 'SOL' | 'USDC' }))}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                    required
                  >
                    <option value="SOL">SOL</option>
                    <option value="USDC">USDC</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleCreateContent}
            disabled={isCreating}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold py-6 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 hover:shadow-xl hover:shadow-purple-500/25 flex items-center justify-center gap-3"
          >
            {isCreating ? (
              <>
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Creating...
              </>
            ) : (
              <>
                <RocketLaunchIcon className="w-6 h-6" />
                Create Content
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content List */}
      {content.length > 0 && (
        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8">
          <h3 className="text-2xl font-bold text-white mb-6">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              My Content
            </span>
          </h3>
          <div className="space-y-6">
            {content.map((item) => (
              <div key={item.id} className="bg-slate-700/30 backdrop-blur-sm border border-slate-600/50 rounded-2xl p-6 hover:bg-slate-700/50 transition-all duration-300 hover:scale-[1.01]">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-bold text-white text-lg mb-2">{item.title}</h4>
                    <p className="text-slate-300 mb-4 leading-relaxed">{item.description}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r ${
                        contentTypes.find(t => t.id === item.type)?.gradient || 'from-purple-500 to-pink-500'
                      } text-white`}>
                        {contentTypes.find(t => t.id === item.type)?.label}
                      </span>
                      <span className="px-4 py-2 bg-slate-600/50 text-slate-200 rounded-xl text-sm font-medium">
                        {accessLevels.find(a => a.id === item.access)?.label}
                      </span>
                      {item.price && (
                        <span className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl text-sm font-semibold">
                          {item.price} {item.currency}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-slate-400 bg-slate-700/50 px-3 py-2 rounded-lg">
                    {item.createdAt.toLocaleDateString('ru-RU')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 