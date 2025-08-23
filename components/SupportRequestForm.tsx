'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/store/appStore'
import { useWallet } from '@/lib/hooks/useSafeWallet'
import { toast } from 'react-hot-toast'
import { 
  PaperAirplaneIcon, 
  PhotoIcon, 
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface SupportTicket {
  id: string
  userId: string
  userWallet: string
  username: string
  subject: string
  description: string
  images: string[]
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  createdAt: Date
  updatedAt: Date
}

export default function SupportRequestForm() {
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const user = useUser()
  const { connected, publicKey } = useWallet()
  const router = useRouter()
  
  const publicKeyString = publicKey?.toBase58() ?? null

  // Проверяем, может ли пользователь создать тикет
  if (!user?.id || !publicKeyString) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Доступ ограничен
          </h2>
          <p className="text-gray-600 dark:text-slate-300 mb-6">
            Для создания обращения в поддержку необходимо быть авторизованным пользователем с подключенным кошельком.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
          >
            Вернуться на главную
          </button>
        </div>
      </div>
    )
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const validFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (validFiles.length + images.length > 5) {
      toast.error('Максимум 5 изображений')
      return
    }

    const newImages = [...images, ...validFiles]
    setImages(newImages)

    // Создаем превью для новых изображений
    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewUrls(prev => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
    setPreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!subject.trim() || !description.trim()) {
      toast.error('Пожалуйста, заполните все обязательные поля')
      return
    }

    setIsSubmitting(true)

    try {
      // Сначала загружаем изображения
      const imageUrls: string[] = []
      
      for (const image of images) {
        const formData = new FormData()
        formData.append('file', image)
        formData.append('type', 'support')
        
        const uploadResponse = await fetch('/api/support/upload', {
          method: 'POST',
          body: formData
        })
        
        if (uploadResponse.ok) {
          const result = await uploadResponse.json()
          imageUrls.push(result.url || result.fileUrl)
        }
      }

      // Создаем тикет
      const ticketData = {
        userId: user.id,
        userWallet: publicKeyString,
        username: user.nickname || user.fullName || 'Unknown',
        subject: subject.trim(),
        description: description.trim(),
        images: imageUrls
      }

      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ticketData)
      })

      if (response.ok) {
        toast.success('Обращение успешно отправлено!')
        router.push('/dashboard')
      } else {
        const error = await response.text()
        toast.error(`Ошибка: ${error}`)
      }
    } catch (error) {
      console.error('Error submitting support ticket:', error)
      toast.error('Произошла ошибка при отправке обращения')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-900 dark:to-slate-800 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Обращение в поддержку
            </h1>
            <p className="text-gray-600 dark:text-slate-300">
              Опишите вашу проблему, и мы постараемся помочь как можно скорее
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Тема */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Тема <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-slate-700 dark:text-white transition-all duration-300"
                placeholder="Кратко опишите проблему"
                maxLength={100}
                required
              />
            </div>

            {/* Описание */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Описание проблемы <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-slate-700 dark:text-white transition-all duration-300 resize-none"
                placeholder="Подробно опишите проблему, которую вы испытываете..."
                maxLength={1000}
                required
              />
              <div className="text-right text-sm text-gray-500 mt-1">
                {description.length}/1000
              </div>
            </div>

            {/* Загрузка изображений */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Изображения (необязательно)
              </label>
              
              {/* Кнопка загрузки */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={images.length >= 5}
                className="w-full border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-6 hover:border-purple-500 dark:hover:border-purple-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PhotoIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-slate-400">
                  {images.length >= 5 
                    ? 'Достигнут лимит изображений (5)'
                    : 'Нажмите для загрузки изображений (максимум 5)'
                  }
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Поддерживаемые форматы: JPG, PNG, GIF
                </p>
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              {/* Превью изображений */}
              {previewUrls.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Информация о пользователе */}
            <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Информация о пользователе</h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
                <p><span className="font-medium">ID:</span> {user.id}</p>
                <p><span className="font-medium">Кошелек:</span> {publicKeyString}</p>
                <p><span className="font-medium">Имя:</span> {user.nickname || user.fullName || 'Не указано'}</p>
              </div>
            </div>

            {/* Кнопка отправки */}
            <button
              type="submit"
              disabled={isSubmitting || !subject.trim() || !description.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Отправка...
                </>
              ) : (
                <>
                  <PaperAirplaneIcon className="w-5 h-5" />
                  Отправить обращение
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
} 