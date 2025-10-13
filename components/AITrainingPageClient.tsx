'use client'
import { useState, useRef, useEffect } from 'react'
import { 
  PhotoIcon, 
  SparklesIcon, 
  PlayIcon,
  VideoCameraIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import axios from 'axios'
import { useUser } from '@/lib/store/appStore'

interface Generation {
  id: string
  type: 'video' | 'image'
  prompt: string
  url: string
  thumbnail?: string
  createdAt: Date
  status: 'generating' | 'completed' | 'failed'
  model: string
  requestId?: string
  settings: {
    seconds?: string
    size?: string
    referenceImage?: string
  }
}

export default function AITrainingPage() {
  const user = useUser()
  const [generations, setGenerations] = useState<Generation[]>([])
  const [isLoadingGenerations, setIsLoadingGenerations] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [generationType, setGenerationType] = useState<'video' | 'image'>('video')
  
  // Video generation state
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState('sora-2')
  const [seconds, setSeconds] = useState('4')
  const [size, setSize] = useState('720x1280')
  const [inputReference, setInputReference] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [videoId, setVideoId] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Загрузка генераций пользователя при монтировании компонента
  useEffect(() => {
    const fetchGenerations = async () => {
      if (!user?.id) {
        setIsLoadingGenerations(false)
        return
      }

      try {
        const response = await fetch(`/api/aicreation?userId=${user.id}`)
        const data = await response.json()

        if (data.success && data.creations) {
          // Преобразуем данные из БД в формат Generation
          const formattedGenerations: Generation[] = data.creations.map((creation: any) => ({
            id: creation.id,
            type: creation.type,
            prompt: creation.prompt,
            url: '', // URL будет заполнен позже при скачивании
            createdAt: new Date(creation.createdAt),
            status: creation.status === 'completed' ? 'completed' : 
                    creation.status === 'failed' ? 'failed' : 'generating',
            model: creation.model,
            requestId: creation.requestId,
            settings: {
              size: creation.size
            }
          }))

          setGenerations(formattedGenerations)
          console.log(`Loaded ${formattedGenerations.length} generations`)

          // Автоматически загружаем видео для всех генераций без URL
          const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY
          if (apiKey) {
            formattedGenerations.forEach((gen) => {
              if (!gen.url && gen.requestId) {
                console.log(`[Init] Starting download attempts for video ${gen.requestId}`)
                downloadVideo(gen.requestId, apiKey, gen.id)
              }
            })
          }
        }
      } catch (error) {
        console.error('Failed to load generations:', error)
        toast.error('Failed to load your generations')
      } finally {
        setIsLoadingGenerations(false)
      }
    }

    fetchGenerations()
  }, [user?.id])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setInputReference(file)
      
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Функция для изменения размера изображения
  const resizeImage = (file: File, targetWidth: number, targetHeight: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        const img = new Image()
        
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = targetWidth
          canvas.height = targetHeight
          
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }
          
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
          
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to create blob'))
            }
          }, 'image/png')
        }
        
        img.onerror = () => {
          reject(new Error('Failed to load image'))
        }
        
        img.src = e.target?.result as string
      }
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }
      
      reader.readAsDataURL(file)
    })
  }

  const generateVideo = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    if (!user?.id) {
      toast.error('Please connect your wallet first')
      return
    }

    setIsGenerating(true)
    
    const newGeneration: Generation = {
      id: Date.now().toString(),
      type: 'video',
      prompt,
      url: '',
      createdAt: new Date(),
      status: 'generating',
      model,
      settings: {
        seconds,
        size,
        referenceImage: imagePreview
      }
    }
    
    setGenerations(prev => [newGeneration, ...prev])

    try {
      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY
      
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY not found')
      }

      const formData = new FormData()
      formData.append('model', model)
      formData.append('prompt', prompt)
      formData.append('seconds', seconds)
      formData.append('size', size)

      if (inputReference) {
        const [width, height] = size.split('x').map(Number)
        console.log(`Resizing image to ${width}x${height}...`)
        const resizedBlob = await resizeImage(inputReference, width, height)
        formData.append('input_reference', resizedBlob, 'reference.png')
      }

      const response = await axios.post(
        'https://api.openai.com/v1/videos',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      console.log('Generation response:', response.data)
      
      const generatedVideoId = response.data.id || response.data.video_id
      
      if (generatedVideoId) {
        setVideoId(generatedVideoId)
        
        // Создаем запись в базе данных
        try {
          await fetch('/api/aicreation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: user.id,
              type: 'video',
              requestId: generatedVideoId,
              model: 'sora2',
              size: size,
              prompt: prompt,
              status: 'created'
            })
          })
          console.log('AI Creation record created in database')
        } catch (dbError) {
          console.error('Failed to create database record:', dbError)
          // Не прерываем процесс, если запись в БД не удалась
        }
        
        // Начинаем попытки скачивания видео
        await downloadVideo(generatedVideoId, apiKey, newGeneration.id)
        setShowCreateModal(false);
      } else {
        throw new Error('Video ID not found in response')
      }

    } catch (err: any) {
      console.error('Error generating video:', err)
      
      setGenerations(prev => prev.map(gen => 
        gen.id === newGeneration.id 
          ? { ...gen, status: 'failed' as const }
          : gen
      ))
      
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to generate video')
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadVideo = async (videoIdToDownload: string, apiKey: string, generationId: string, retryCount: number = 0) => {
    try {
      console.log(`[Download] Attempting to download video ${videoIdToDownload}, attempt ${retryCount + 1}`)
      
      const response = await axios.get(
        `https://api.openai.com/v1/videos/${videoIdToDownload}/content`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          responseType: 'blob',
        }
      )

      const blob = new Blob([response.data], { type: 'video/mp4' })
      const url = URL.createObjectURL(blob)
      
      setGenerations(prev => prev.map(gen => 
        gen.id === generationId 
          ? { ...gen, url, status: 'completed' as const }
          : gen
      ))
      
      toast.success('🎥 Video generated successfully!')
      setShowCreateModal(false)
      resetForm()
      
      console.log('[Download] Video downloaded successfully')
    } catch (err: any) {
      console.error(`[Download] Error downloading video (attempt ${retryCount + 1}):`, err)
      
      // Повторная попытка через 30 секунд
      console.log('[Download] Scheduling retry in 30 seconds...')
      setTimeout(() => {
        downloadVideo(videoIdToDownload, apiKey, generationId, retryCount + 1)
      }, 30000)
    }
  }

  const resetForm = () => {
    setPrompt('')
    setInputReference(null)
    setImagePreview('')
    setSeconds('4')
    setSize('720x1280')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 sm:pt-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  AI Generations
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Create stunning videos and images with AI
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all inline-flex items-center gap-2"
            >
              <SparklesIcon className="w-5 h-5" />
              Создать генерацию
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoadingGenerations ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Загрузка генераций...</p>
            </div>
          </div>
        ) : generations.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <SparklesIcon className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Ещё нет ни одной генерации
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Создайте свою первую AI генерацию, чтобы увидеть её здесь
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {generations.map((generation) => (
              <div key={generation.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="h-[300px] bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  {generation.status === 'generating' ? (
                    <div className="text-center p-[10px]">
                      <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">Generating...</p>
                    </div>
                  ) : generation.status === 'completed' && generation.url ? (
                    <video
                      src={generation.url}
                      controls
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center p-[10px]">
                      <p className="text-sm text-red-500">Generation failed</p>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-900 dark:text-white font-medium mb-2 line-clamp-2">
                    {generation.prompt}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <span>{generation.model}</span>
                    <span>{generation.settings.size || 'N/A'}</span>
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(generation.createdAt).toLocaleDateString('ru-RU', { 
                      day: 'numeric', 
                      month: 'short', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  {generation.status === 'completed' && generation.url && (
                    <div className="mt-3 flex gap-2">
                      <a
                        href={generation.url}
                        download={`ai-video-${generation.id}.mp4`}
                        className="flex-1 px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors flex items-center justify-center gap-2"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        Download
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Создать AI генерацию
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Тип генерации
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setGenerationType('video')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      generationType === 'video'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'
                    }`}
                  >
                    <VideoCameraIcon className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                    <div className="font-medium text-sm text-gray-900 dark:text-white">Видео</div>
                  </button>
                  <button
                    onClick={() => setGenerationType('image')}
                    disabled
                    className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-600 opacity-50 cursor-not-allowed"
                  >
                    <PhotoIcon className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                    <div className="font-medium text-sm text-gray-400">Изображение</div>
                    <div className="text-xs text-gray-400">(скоро)</div>
                  </button>
                </div>
              </div>

              {/* Model (Sora-2 selected by default) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Модель
                </label>
                <div className="px-4 py-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-purple-900 dark:text-purple-100">Sora-2</span>
                    <span className="text-sm text-purple-700 dark:text-purple-300">OpenAI</span>
                  </div>
                </div>
              </div>

              {/* Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Промпт
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Опишите видео, которое хотите создать..."
                  className="w-full h-24 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Длительность
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['4', '8', '12'].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => setSeconds(sec)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        seconds === sec
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Size/Resolution */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Разрешение
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: '720x1280', label: '720x1280', desc: 'Portrait' },
                    { value: '1280x720', label: '1280x720', desc: 'Landscape' },
                    { value: '1080x1920', label: '1080x1920', desc: 'Full HD Portrait' },
                    { value: '1920x1080', label: '1920x1080', desc: 'Full HD' }
                  ].map((sizeOption) => (
                    <button
                      key={sizeOption.value}
                      onClick={() => setSize(sizeOption.value)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        size === sizeOption.value
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'
                      }`}
                    >
                      <div className="font-medium text-sm text-gray-900 dark:text-white">
                        {sizeOption.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {sizeOption.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Референсное изображение (опционально)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-purple-400 transition-colors"
                >
                  {imagePreview ? (
                    <div className="space-y-3">
                      <img src={imagePreview} alt="Preview" className="max-h-40 mx-auto rounded-lg" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Изображение будет изменено до размера {size}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setInputReference(null)
                          setImagePreview('')
                        }}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Удалить
                      </button>
                    </div>
                  ) : (
                    <>
                      <PhotoIcon className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Нажмите для выбора изображения
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Generate Button */}
              <button
                onClick={generateVideo}
                disabled={isGenerating || !prompt.trim()}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Генерация...
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-5 h-5" />
                    Сгенерировать видео
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
