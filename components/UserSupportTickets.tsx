'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { useUser } from '@/lib/store/appStore'
import { 
  TicketIcon, 
  ClockIcon,
  ChatBubbleLeftEllipsisIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  EyeIcon
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

export default function UserSupportTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const user = useUser()

  useEffect(() => {
    fetchTickets()
  }, [])

  const fetchTickets = async () => {
    try {
      // Получаем wallet из Zustand store или других источников
      const userWallet = user?.wallet || user?.solanaWallet
      if (!userWallet) {
        toast.error('Кошелек не найден')
        return
      }

      const response = await fetch(`/api/support/tickets?userId=me&userWallet=${userWallet}`)
      if (response.ok) {
        const data = await response.json()
        setTickets(data)
      } else {
        toast.error('Ошибка при загрузке тикетов')
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
      toast.error('Ошибка при загрузке тикетов')
    } finally {
      setIsLoading(false)
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
      case 'OPEN': return 'Открыт'
      case 'IN_PROGRESS': return 'В работе'
      case 'RESOLVED': return 'Решен'
      case 'CLOSED': return 'Закрыт'
      default: return status
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TicketIcon className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Мои обращения в поддержку
          </h2>
        </div>
        <a
          href="/support"
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Новое обращение
        </a>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-slate-400">
          <TicketIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">У вас пока нет обращений</p>
          <p className="text-sm">Создайте первое обращение в поддержку, если у вас есть вопросы</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className={`border rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                selectedTicket?.id === ticket.id
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-slate-600 hover:border-purple-300 dark:hover:border-purple-500'
              }`}
              onClick={() => setSelectedTicket(selectedTicket?.id === ticket.id ? null : ticket)}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-medium text-gray-900 dark:text-white text-lg">
                  {ticket.subject}
                </h3>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ticket.status)}`}>
                  {getStatusIcon(ticket.status)}
                  {getStatusText(ticket.status)}
                </span>
              </div>
              
              <p className="text-gray-600 dark:text-slate-300 mb-3 line-clamp-2">
                {ticket.description}
              </p>
              
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-slate-400">
                <span>Создан: {formatDate(ticket.createdAt)}</span>
                <span>{ticket.responses.length} ответов</span>
              </div>

              {/* Детали тикета */}
              {selectedTicket?.id === ticket.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-600">
                  {/* Изображения */}
                  {ticket.images.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">Прикрепленные изображения:</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {ticket.images.map((image, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={image}
                              alt={`Image ${index + 1}`}
                              className="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(image, '_blank')}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                              <EyeIcon className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ответы */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">История ответов:</h4>
                    <div className="space-y-3">
                      {ticket.responses.map((response) => (
                        <div
                          key={response.id}
                          className={`p-3 rounded-lg ${
                            response.isAdminResponse
                              ? 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500'
                              : 'bg-gray-50 dark:bg-slate-700 border-l-4 border-gray-400'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {response.isAdminResponse ? 'Поддержка' : response.adminUsername}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-slate-400">
                              {formatDate(response.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-slate-300">
                            {response.message}
                          </p>
                        </div>
                      ))}

                      {ticket.responses.length === 0 && (
                        <p className="text-gray-500 dark:text-slate-400 text-sm">
                          Пока нет ответов на ваше обращение. Мы ответим в ближайшее время.
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
  )
} 