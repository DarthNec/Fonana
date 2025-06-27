'use client'

import { useState, useEffect } from 'react'
import { RealtimePostsContainer } from '@/components/posts/layouts/RealtimePostsContainer'
import { NotificationProvider, useNotifications } from '@/lib/contexts/NotificationContext'
import { useUserContext } from '@/lib/contexts/UserContext'
import { wsService } from '@/lib/services/websocket'
import toast from 'react-hot-toast'
import { 
  BellIcon, 
  WifiIcon,
  ChatBubbleLeftIcon,
  HeartIcon,
  ArrowPathIcon,
  BoltIcon
} from '@heroicons/react/24/outline'

// Компонент для отображения статуса WebSocket
function WebSocketStatus() {
  const [isConnected, setIsConnected] = useState(false)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    const updateStatus = () => {
      setIsConnected(wsService.isConnected())
      setStats(wsService.getStats())
    }

    // Начальное состояние
    updateStatus()

    // Слушаем события
    wsService.on('connected', updateStatus)
    wsService.on('disconnected', updateStatus)

    // Обновляем каждые 2 секунды
    const interval = setInterval(updateStatus, 2000)

    return () => {
      wsService.off('connected', updateStatus)
      wsService.off('disconnected', updateStatus)
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <WifiIcon className="w-5 h-5 text-blue-500" />
        WebSocket статус
      </h3>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
          <span className="text-gray-700 dark:text-slate-300">
            {isConnected ? 'Подключен' : 'Отключен'}
          </span>
        </div>

        {stats && (
          <div className="text-sm text-gray-600 dark:text-slate-400 space-y-1">
            <p>Активные каналы: {stats.subscribedChannels}</p>
            <p>Сообщений в очереди: {stats.queuedMessages}</p>
            <p>Попыток подключения: {stats.reconnectAttempts}</p>
            {Object.keys(stats.listeners).length > 0 && (
              <div className="mt-2">
                <p className="font-medium">Слушатели событий:</p>
                <ul className="ml-4 text-xs">
                  {Object.entries(stats.listeners).map(([event, count]) => (
                    <li key={event}>{event}: {count as number}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Компонент для отображения уведомлений
function NotificationsPanel() {
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications()

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BellIcon className="w-5 h-5 text-purple-500" />
          Уведомления ({unreadCount})
        </h3>
        {notifications.length > 0 && (
          <button
            onClick={clearAll}
            className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
          >
            Очистить все
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="text-gray-500 dark:text-slate-400 text-center py-8">
            Нет уведомлений
          </p>
        ) : (
          notifications.map(notification => (
            <div
              key={notification.id}
              onClick={() => !notification.isRead && markAsRead(notification.id)}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                notification.isRead 
                  ? 'bg-gray-50 dark:bg-slate-700/50' 
                  : 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">{getNotificationIcon(notification.type)}</div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {notification.title}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                    {new Date(notification.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// Получить иконку для типа уведомления
function getNotificationIcon(type: string): string {
  switch (type) {
    case 'LIKE_POST':
    case 'LIKE_COMMENT':
      return '❤️'
    case 'COMMENT_POST':
    case 'REPLY_COMMENT':
      return '💬'
    case 'NEW_SUBSCRIBER':
      return '👤'
    case 'POST_PURCHASE':
      return '💰'
    case 'NEW_MESSAGE':
      return '✉️'
    case 'TIP_RECEIVED':
      return '💎'
    default:
      return '🔔'
  }
}

// Компонент для симуляции событий
function EventSimulator() {
  const { user } = useUserContext()
  const [selectedPost, setSelectedPost] = useState('')

  const simulateEvent = (type: string) => {
    // Эти события должны быть отправлены с сервера
    // Здесь только для демонстрации
    toast.success(`Симуляция события: ${type}`)
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <BoltIcon className="w-5 h-5 text-yellow-500" />
        Симулятор событий
      </h3>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            ID поста для тестирования
          </label>
          <input
            type="text"
            value={selectedPost}
            onChange={(e) => setSelectedPost(e.target.value)}
            placeholder="Введите ID поста"
            className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => simulateEvent('like')}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
          >
            <HeartIcon className="w-4 h-4" />
            Лайк
          </button>
          <button
            onClick={() => simulateEvent('comment')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
          >
            <ChatBubbleLeftIcon className="w-4 h-4" />
            Комментарий
          </button>
          <button
            onClick={() => simulateEvent('notification')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
          >
            <BellIcon className="w-4 h-4" />
            Уведомление
          </button>
          <button
            onClick={() => simulateEvent('new_post')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Новый пост
          </button>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            💡 Для полного тестирования откройте эту страницу в двух вкладках и взаимодействуйте с постами
          </p>
        </div>
      </div>
    </div>
  )
}

// Основная страница демонстрации
function RealtimeDemoContent() {
  const [posts, setPosts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [autoUpdate, setAutoUpdate] = useState(false)
  const { user } = useUserContext()

  // Загрузка постов
  useEffect(() => {
    const loadPosts = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/posts?limit=10')
        if (response.ok) {
          const data = await response.json()
          setPosts(data.posts || [])
        }
      } catch (error) {
        console.error('Error loading posts:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPosts()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-24 pb-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Real-time демонстрация
          </h1>
          <p className="text-gray-600 dark:text-slate-400">
            Тестирование WebSocket обновлений для уведомлений и ленты постов
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <WebSocketStatus />
          <NotificationsPanel />
          <EventSimulator />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Настройки ленты
            </h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoUpdate}
                onChange={(e) => setAutoUpdate(e.target.checked)}
                className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-gray-700 dark:text-slate-300">
                Автообновление новых постов
              </span>
            </label>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            {autoUpdate 
              ? 'Новые посты будут появляться автоматически'
              : 'Новые посты будут накапливаться с уведомлением'
            }
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Real-time лента
          </h2>
          {isLoading ? (
            <div className="text-center py-12">
              <ArrowPathIcon className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
              <p className="mt-2 text-gray-600 dark:text-slate-400">Загрузка постов...</p>
            </div>
          ) : (
            <RealtimePostsContainer
              posts={posts}
              layout="list"
              variant="feed"
              enableRealtime={true}
              autoUpdateFeed={autoUpdate}
              showNewPostsNotification={true}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// Страница с провайдерами
export default function RealtimeDemoPage() {
  return (
    <NotificationProvider>
      <RealtimeDemoContent />
    </NotificationProvider>
  )
} 