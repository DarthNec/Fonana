'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { 
  ShieldCheckIcon, 
  TicketIcon, 
  ChatBubbleLeftEllipsisIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowLeftIcon,
  PaperAirplaneIcon,
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

export default function AdminDashboardPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [newResponse, setNewResponse] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Проверяем авторизацию админа
    const adminAuth = localStorage.getItem('adminAuth')
    if (!adminAuth) {
      router.push('/admin-access')
      return
    }

    fetchTickets()
  }, [router])

  const fetchTickets = async () => {
    try {
      // Получаем данные админа из localStorage
      const adminAuth = localStorage.getItem('adminAuth')
      if (!adminAuth) {
        router.push('/admin-access')
        return
      }

      const adminData = JSON.parse(adminAuth)
      const adminWallet = adminData.wallet

      const response = await fetch(`/api/support/tickets?userWallet=${adminWallet}`)
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

  const handleStatusUpdate = async (ticketId: string, newStatus: string) => {
    try {
      // Получаем данные админа из localStorage
      const adminAuth = localStorage.getItem('adminAuth')
      if (!adminAuth) {
        toast.error('Ошибка авторизации')
        return
      }

      const adminData = JSON.parse(adminAuth)
      const adminWallet = adminData.wallet

      const response = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          status: newStatus,
          userWallet: adminWallet
        })
      })

      if (response.ok) {
        toast.success('Статус тикета обновлен')
        fetchTickets()
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket(prev => prev ? { ...prev, status: newStatus as any } : null)
        }
      } else {
        toast.error('Ошибка при обновлении статуса')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Ошибка при обновлении статуса')
    }
  }

  const handleSubmitResponse = async () => {
    if (!selectedTicket || !newResponse.trim()) return

    setIsSubmitting(true)

    try {
      // Получаем данные админа из localStorage
      const adminAuth = localStorage.getItem('adminAuth')
      if (!adminAuth) {
        toast.error('Ошибка авторизации')
        return
      }

      const adminData = JSON.parse(adminAuth)
      const adminWallet = adminData.wallet

      const response = await fetch(`/api/support/tickets/${selectedTicket.id}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: newResponse.trim(),
          isAdminResponse: true,
          userWallet: adminWallet
        })
      })

      if (response.ok) {
        toast.success('Ответ отправлен')
        setNewResponse('')
        fetchTickets()
        // Обновляем выбранный тикет
        const updatedTicket = await fetch(`/api/support/tickets/${selectedTicket.id}?userWallet=${adminWallet}`).then(r => r.json())
        setSelectedTicket(updatedTicket)
      } else {
        toast.error('Ошибка при отправке ответа')
      }
    } catch (error) {
      console.error('Error submitting response:', error)
      toast.error('Ошибка при отправке ответа')
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Загрузка...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="w-8 h-8 text-purple-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Админ панель
              </h1>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('adminAuth')
                router.push('/admin-access')
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Выйти
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Список тикетов */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <TicketIcon className="w-6 h-6 text-purple-600" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Тикеты поддержки
                </h2>
              </div>

              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                      selectedTicket?.id === ticket.id
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-slate-600 hover:border-purple-300 dark:hover:border-purple-500'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2">
                        {ticket.subject}
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {getStatusIcon(ticket.status)}
                        {ticket.status === 'OPEN' && 'Открыт'}
                        {ticket.status === 'IN_PROGRESS' && 'В работе'}
                        {ticket.status === 'RESOLVED' && 'Решен'}
                        {ticket.status === 'CLOSED' && 'Закрыт'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">
                      {ticket.username} • {formatDate(ticket.createdAt)}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-slate-300 line-clamp-2">
                      {ticket.description}
                    </p>
                    {ticket.responses.length > 0 && (
                      <div className="mt-2 text-xs text-purple-600 dark:text-purple-400">
                        {ticket.responses.length} ответов
                      </div>
                    )}
                  </div>
                ))}

                {tickets.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                    <TicketIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Нет активных тикетов</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Детали тикета */}
          <div className="lg:col-span-2">
            {selectedTicket ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Тикет #{selectedTicket.id.slice(-8)}
                  </h2>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleStatusUpdate(selectedTicket.id, e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                    >
                      <option value="OPEN">Открыт</option>
                      <option value="IN_PROGRESS">В работе</option>
                      <option value="RESOLVED">Решен</option>
                      <option value="CLOSED">Закрыт</option>
                    </select>
                  </div>
                </div>

                {/* Информация о тикете */}
                <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700 dark:text-slate-300">Пользователь:</span>
                      <p className="text-gray-900 dark:text-white">{selectedTicket.username}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-slate-300">Кошелек:</span>
                      <p className="text-gray-900 dark:text-white font-mono text-xs">
                        {selectedTicket.userWallet.slice(0, 8)}...{selectedTicket.userWallet.slice(-8)}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-slate-300">Создан:</span>
                      <p className="text-gray-900 dark:text-white">{formatDate(selectedTicket.createdAt)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-slate-300">Статус:</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTicket.status)}`}>
                        {getStatusIcon(selectedTicket.status)}
                        {selectedTicket.status === 'OPEN' && 'Открыт'}
                        {selectedTicket.status === 'IN_PROGRESS' && 'В работе'}
                        {selectedTicket.status === 'RESOLVED' && 'Решен'}
                        {selectedTicket.status === 'CLOSED' && 'Закрыт'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Тема и описание */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {selectedTicket.subject}
                  </h3>
                  <p className="text-gray-600 dark:text-slate-300 whitespace-pre-wrap">
                    {selectedTicket.description}
                  </p>
                </div>

                {/* Изображения */}
                {selectedTicket.images.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Прикрепленные изображения:</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {selectedTicket.images.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={image}
                            alt={`Image ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => window.open(image, '_blank')}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                            <EyeIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ответы */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">История ответов:</h4>
                  <div className="space-y-3">
                    {selectedTicket.responses.map((response) => (
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
                            {response.isAdminResponse ? 'Администратор' : response.adminUsername}
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

                    {selectedTicket.responses.length === 0 && (
                      <p className="text-gray-500 dark:text-slate-400 text-sm">
                        Пока нет ответов на этот тикет
                      </p>
                    )}
                  </div>
                </div>

                {/* Форма ответа */}
                <div className="border-t border-gray-200 dark:border-slate-600 pt-6">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Добавить ответ:</h4>
                  <div className="flex gap-3">
                    <textarea
                      value={newResponse}
                      onChange={(e) => setNewResponse(e.target.value)}
                      placeholder="Введите ваш ответ..."
                      rows={3}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-slate-700 dark:text-white resize-none"
                    />
                    <button
                      onClick={handleSubmitResponse}
                      disabled={!newResponse.trim() || isSubmitting}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <PaperAirplaneIcon className="w-4 h-4" />
                      )}
                      Отправить
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 flex items-center justify-center min-h-[400px]">
                <div className="text-center text-gray-500 dark:text-slate-400">
                  <TicketIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Выберите тикет для просмотра</p>
                  <p className="text-sm">Нажмите на тикет в списке слева</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 