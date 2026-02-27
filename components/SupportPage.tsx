'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/store/appStore'
import { useWallet } from '@/lib/hooks/useSafeWallet'
import { toast } from 'react-hot-toast'
import { 
  PaperAirplaneIcon, 
  PhotoIcon, 
  XMarkIcon,
  ExclamationTriangleIcon,
  TicketIcon, 
  ClockIcon,
  ChatBubbleLeftEllipsisIcon,
  CheckCircleIcon,
  PlusIcon,
  EyeIcon,
  XCircleIcon,
  ArrowLeftIcon,
  QuestionMarkCircleIcon,
  UserIcon,
  ShoppingBagIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

interface SupportTicket {
  id: string
  userId: string
  userWallet: string
  username: string
  subject: string
  description: string
  images: string[]
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  createdAt: string
  updatedAt: string
  responses: SupportTicketResponse[]
}

interface SupportTicketResponse {
  id: string
  ticketId: string
  adminId: string
  adminWallet: string
  adminUsername: string
  message: string
  isAdminResponse: boolean
  createdAt: string
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Форма создания тикета
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

  useEffect(() => {
    if (user?.id && publicKeyString) {
      fetchTickets()
    }
  }, [user?.id, publicKeyString])

  // Проверяем, может ли пользователь создать тикет
  if (!user?.id || !publicKeyString) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-4 sm:p-8 max-w-md w-full text-center">
          <ExclamationTriangleIcon className="w-12 h-12 sm:w-16 sm:h-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access limited
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-slate-300 mb-6">
            To create a support ticket, you must be a registered user with a connected wallet.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 text-sm sm:text-base"
          >
            Return to home
          </button>
        </div>
      </div>
    )
  }

  const fetchTickets = async () => {
    try {
      const userWallet = user?.wallet || user?.solanaWallet || publicKeyString
      if (!userWallet) {
        toast.error('Wallet not found')
        return
      }

      const response = await fetch(`/api/support/tickets?userId=me&userWallet=${userWallet}`)
      if (response.ok) {
        const data = await response.json()
        setTickets(data)
      } else {
        toast.error('Error loading tickets')
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
      toast.error('Error loading tickets')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const validFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (validFiles.length + images.length > 5) {
      toast.error('Maximum 5 images')
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
      toast.error('Please fill in all required fields')
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
        toast.success('Support ticket successfully sent!')
        // Очищаем форму и обновляем список тикетов
        setSubject('')
        setDescription('')
        setImages([])
        setPreviewUrls([])
        fetchTickets()
      } else {
        const error = await response.text()
        toast.error(`Error: ${error}`)
      }
    } catch (error) {
      console.error('Error submitting support ticket:', error)
      toast.error('An error occurred while sending the support ticket')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'RESOLVED': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'CLOSED': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN': return <ClockIcon className="w-4 h-4" />
      case 'IN_PROGRESS': return <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />
      case 'RESOLVED': return <CheckCircleIcon className="w-4 h-4" />
      case 'CLOSED': return <XCircleIcon className="w-4 h-4" />
      default: return <ClockIcon className="w-4 h-4" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'OPEN': return 'Open'
      case 'IN_PROGRESS': return 'In progress'
      case 'RESOLVED': return 'Resolved'
      case 'CLOSED': return 'Closed'
      default: return status
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-900 dark:text-white text-base sm:text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  // Основной render - всегда показываем список + форму
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-20 md:pb-0">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        {/* Шапка */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <TicketIcon className="w-7 h-7 md:w-8 md:h-8 text-purple-600" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Support Center
            </h1>
          </div>
          <p className="text-sm md:text-base text-gray-600 dark:text-slate-400">
            Create tickets and track your support requests
          </p>
        </div>

        {/* Grid: Форма слева, Тикеты справа */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ФОРМА СОЗДАНИЯ ТИКЕТА */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Create new ticket
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Тема */}
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-slate-700 dark:text-white transition-all text-sm"
                  placeholder="Briefly describe the problem"
                  maxLength={100}
                  required
                />
              </div>

              {/* Описание */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-slate-700 dark:text-white transition-all resize-none text-sm"
                  placeholder="Describe your problem in detail..."
                  maxLength={1000}
                  required
                />
                <div className="text-right text-xs text-gray-500 mt-1">
                  {description.length}/1000
                </div>
              </div>

              {/* Загрузка изображений */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Images (optional)
                </label>
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={images.length >= 5}
                  className="w-full border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-4 hover:border-purple-500 dark:hover:border-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PhotoIcon className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-600 dark:text-slate-400">
                    {images.length >= 5 ? 'Max 5 images' : 'Click to upload (max 5)'}
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

                {/* Превью */}
                {previewUrls.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {previewUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-16 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Кнопка отправки */}
              <button
                type="submit"
                disabled={isSubmitting || !subject.trim() || !description.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-sm"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <PaperAirplaneIcon className="w-4 h-4" />
                    Send request
                  </>
                )}
              </button>
            </form>
          </div>

          {/* СПИСОК ТИКЕТОВ */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              My tickets {tickets.length > 0 && `(${tickets.length})`}
            </h2>

          {tickets.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3">
                <TicketIcon className="w-8 h-8 text-gray-400 dark:text-slate-500" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                No tickets yet
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Fill out the form on the left to create your first ticket
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className={`border rounded-lg p-3 cursor-pointer transition-all ${
                    selectedTicket?.id === ticket.id
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-slate-600 hover:border-purple-300 dark:hover:border-purple-500'
                  }`}
                  onClick={() => setSelectedTicket(selectedTicket?.id === ticket.id ? null : ticket)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                      {ticket.subject}
                    </h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${getStatusColor(ticket.status)}`}>
                      {getStatusIcon(ticket.status)}
                      {getStatusText(ticket.status)}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 dark:text-slate-300 mb-2 line-clamp-2 text-xs">
                    {ticket.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                    <span>{formatDate(ticket.createdAt)}</span>
                    <span>{ticket.responses.length} responses</span>
                  </div>

                  {/* Детали тикета */}
                  {selectedTicket?.id === ticket.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-600">
                      {/* Изображения */}
                      {ticket.images.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2 text-sm sm:text-base">Прикрепленные изображения:</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                            {ticket.images.map((image, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={image}
                                  alt={`Image ${index + 1}`}
                                  className="w-full h-16 sm:h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => window.open(image, '_blank')}
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                                  <EyeIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Ответы */}
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3 text-sm sm:text-base">Answer history:</h4>
                        <div className="space-y-2 sm:space-y-3">
                          {ticket.responses.map((response) => (
                            <div
                              key={response.id}
                              className={`p-2 sm:p-3 rounded-lg ${
                                response.isAdminResponse
                                  ? 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500'
                                  : 'bg-gray-50 dark:bg-slate-700 border-l-4 border-gray-400'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-1">
                                <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                                  {response.isAdminResponse ? 'Поддержка' : response.adminUsername}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-slate-400">
                                  {formatDate(response.createdAt)}
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300">
                                {response.message}
                              </p>
                            </div>
                          ))}

                          {ticket.responses.length === 0 && (
                            <p className="text-gray-500 dark:text-slate-400 text-xs sm:text-sm">
                              No answers yet. We will respond as soon as possible.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          </div>
        </div>

        {/* FAQ SECTION */}
        <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <QuestionMarkCircleIcon className="w-7 h-7 text-purple-600" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Account & Authentication */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-purple-600" />
                Account & Authentication
              </h3>
              
              <div className="space-y-3">
                <details className="group">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                      <div className="mt-0.5 text-purple-600 group-open:rotate-90 transition-transform">▶</div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          How do I connect my wallet?
                        </p>
                      </div>
                    </div>
                  </summary>
                  <div className="ml-7 mr-3 mb-2 text-sm text-gray-600 dark:text-slate-400">
                    Click "Connect Wallet" in the top right corner or profile menu. We support Phantom wallet. Make sure you have it installed as a browser extension. If you're on mobile, you can also use Guest mode to explore the platform.
                  </div>
                </details>

                <details className="group">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                      <div className="mt-0.5 text-purple-600 group-open:rotate-90 transition-transform">▶</div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          What is Guest mode?
                        </p>
                      </div>
                    </div>
                  </summary>
                  <div className="ml-7 mr-3 mb-2 text-sm text-gray-600 dark:text-slate-400">
                    Guest mode allows you to explore Fonana without connecting a wallet. You can view posts, creators, and interact with content. However, features like purchasing posts, subscribing to creators, and sending tips require a connected wallet.
                  </div>
                </details>

                <details className="group">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                      <div className="mt-0.5 text-purple-600 group-open:rotate-90 transition-transform">▶</div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          Can I upgrade from Guest to Wallet user?
                        </p>
                      </div>
                    </div>
                  </summary>
                  <div className="ml-7 mr-3 mb-2 text-sm text-gray-600 dark:text-slate-400">
                    Yes! Click "Connect Wallet" in the profile menu. Your guest account will be automatically linked to your wallet, and all your data (likes, bookmarks) will be preserved.
                  </div>
                </details>
              </div>
            </div>

            {/* Subscriptions & Payments */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <ShoppingBagIcon className="w-5 h-5 text-purple-600" />
                Subscriptions & Payments
              </h3>
              
              <div className="space-y-3">
                <details className="group">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                      <div className="mt-0.5 text-purple-600 group-open:rotate-90 transition-transform">▶</div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          How do subscriptions work?
                        </p>
                      </div>
                    </div>
                  </summary>
                  <div className="ml-7 mr-3 mb-2 text-sm text-gray-600 dark:text-slate-400">
                    Creators can offer free or paid subscriptions. Free subscriptions give you access to basic content, while paid subscriptions (Bronze, Silver, Gold) unlock premium posts and exclusive content. Subscriptions are managed via Solana blockchain.
                  </div>
                </details>

                <details className="group">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                      <div className="mt-0.5 text-purple-600 group-open:rotate-90 transition-transform">▶</div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          What payment methods are supported?
                        </p>
                      </div>
                    </div>
                  </summary>
                  <div className="ml-7 mr-3 mb-2 text-sm text-gray-600 dark:text-slate-400">
                    All payments are made using SOL (Solana's native cryptocurrency) through your connected Phantom wallet. Make sure you have enough SOL in your wallet for subscriptions and purchases.
                  </div>
                </details>

                <details className="group">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                      <div className="mt-0.5 text-purple-600 group-open:rotate-90 transition-transform">▶</div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          Can I purchase individual posts?
                        </p>
                      </div>
                    </div>
                  </summary>
                  <div className="ml-7 mr-3 mb-2 text-sm text-gray-600 dark:text-slate-400">
                    Yes! Some posts are available for individual purchase. Look for the "Unlock" button on locked posts. You can buy specific content without subscribing to the creator.
                  </div>
                </details>
              </div>
            </div>

            {/* Content & Features */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-purple-600" />
                Content & Features
              </h3>
              
              <div className="space-y-3">
                <details className="group">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                      <div className="mt-0.5 text-purple-600 group-open:rotate-90 transition-transform">▶</div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          What types of content can I post?
                        </p>
                      </div>
                    </div>
                  </summary>
                  <div className="ml-7 mr-3 mb-2 text-sm text-gray-600 dark:text-slate-400">
                    You can post images, videos, and AI-generated content. Creators can also create Stories and mark posts as Premium or Sellable. We support various categories: Art, Music, Gaming, Tech, Lifestyle, and more.
                  </div>
                </details>

                <details className="group">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                      <div className="mt-0.5 text-purple-600 group-open:rotate-90 transition-transform">▶</div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          How do Tips work?
                        </p>
                      </div>
                    </div>
                  </summary>
                  <div className="ml-7 mr-3 mb-2 text-sm text-gray-600 dark:text-slate-400">
                    You can send SOL tips to creators you love! Click the tip icon on any post and choose an amount (0.01, 0.05, 0.1 SOL or custom). Tips go directly to the creator's wallet and are recorded on-chain.
                  </div>
                </details>

                <details className="group">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                      <div className="mt-0.5 text-purple-600 group-open:rotate-90 transition-transform">▶</div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          What are Remixes?
                        </p>
                      </div>
                    </div>
                  </summary>
                  <div className="ml-7 mr-3 mb-2 text-sm text-gray-600 dark:text-slate-400">
                    Remixes allow you to create derivative content based on existing posts. Click "Remix" on a post to add your own spin - edit images, add effects, or create variations. Original creators are always credited.
                  </div>
                </details>
              </div>
            </div>

            {/* Technical & Support */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <TicketIcon className="w-5 h-5 text-purple-600" />
                Technical & Support
              </h3>
              
              <div className="space-y-3">
                <details className="group">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                      <div className="mt-0.5 text-purple-600 group-open:rotate-90 transition-transform">▶</div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          What if my transaction fails?
                        </p>
                      </div>
                    </div>
                  </summary>
                  <div className="ml-7 mr-3 mb-2 text-sm text-gray-600 dark:text-slate-400">
                    Transaction failures usually occur due to insufficient SOL balance or network congestion. Make sure you have enough SOL to cover transaction fees (usually 0.000005 SOL). If the issue persists, create a support ticket above.
                  </div>
                </details>

                <details className="group">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                      <div className="mt-0.5 text-purple-600 group-open:rotate-90 transition-transform">▶</div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          How do I become a Creator?
                        </p>
                      </div>
                    </div>
                  </summary>
                  <div className="ml-7 mr-3 mb-2 text-sm text-gray-600 dark:text-slate-400">
                    Currently, creator accounts are invitation-only or require application. Connect your wallet and check your profile settings - if you have creator access, you'll see the "Create Post" button and Dashboard. Contact us for creator applications.
                  </div>
                </details>

                <details className="group">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                      <div className="mt-0.5 text-purple-600 group-open:rotate-90 transition-transform">▶</div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          Where can I see my purchase history?
                        </p>
                      </div>
                    </div>
                  </summary>
                  <div className="ml-7 mr-3 mb-2 text-sm text-gray-600 dark:text-slate-400">
                    Go to the "Purchases" section in the sidebar. There you'll find all your bought posts and active subscriptions. All transactions are also recorded on the Solana blockchain and can be verified via your wallet.
                  </div>
                </details>

                <details className="group">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                      <div className="mt-0.5 text-purple-600 group-open:rotate-90 transition-transform">▶</div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          How do I report inappropriate content?
                        </p>
                      </div>
                    </div>
                  </summary>
                  <div className="ml-7 mr-3 mb-2 text-sm text-gray-600 dark:text-slate-400">
                    Click the three dots menu on any post and select "Report". Choose the reason (spam, inappropriate content, copyright violation, etc.) and submit. Our moderation team reviews reports within 24 hours. For urgent issues, create a support ticket above.
                  </div>
                </details>
              </div>
            </div>
          </div>

          {/* Still need help? */}
          {/*
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-700 text-center">
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              Didn't find what you were looking for?
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-500">
              Use the form above to create a support ticket, and our team will get back to you as soon as possible.
            </p>
          </div> */}
        </div>
      </div>
    </div>
  )
} 