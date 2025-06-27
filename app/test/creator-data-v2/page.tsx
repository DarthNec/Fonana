'use client'

import { useState, useEffect } from 'react'
import { CreatorDataProvider, useCreatorData } from '@/lib/contexts/CreatorContext'
import { useUserContext } from '@/lib/contexts/UserContext'
import { wsService } from '@/lib/services/websocket'
import toast from 'react-hot-toast'
import { 
  ArrowPathIcon, 
  UserIcon, 
  CameraIcon,
  CheckIcon,
  XMarkIcon,
  WifiIcon,
  ExclamationTriangleIcon,
  BoltIcon
} from '@heroicons/react/24/outline'

// Компонент для демонстрации оптимистичных обновлений
function OptimisticUpdateDemo() {
  const { creator, updateCreatorLocally, revertCreator, refreshCreator, error } = useCreatorData()
  const [nickname, setNickname] = useState('')
  const [bio, setBio] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (creator) {
      setNickname(creator.nickname || '')
      setBio(creator.bio || '')
    }
  }, [creator])

  const handleOptimisticUpdate = async () => {
    if (!creator) return

    // Сохраняем текущие значения для отката
    const originalNickname = creator.nickname
    const originalBio = creator.bio

    // Применяем оптимистичное обновление
    updateCreatorLocally({
      nickname,
      bio
    })

    setIsUpdating(true)
    toast.success('Обновляем профиль...')

    try {
      // Имитация API запроса
      const response = await fetch(`/api/user/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-wallet': creator.wallet || ''
        },
        body: JSON.stringify({
          nickname,
          bio
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      // После успешного обновления обновляем данные с сервера
      await refreshCreator()
      toast.success('Профиль успешно обновлён!')
    } catch (error) {
      // При ошибке откатываем изменения
      revertCreator()
      setNickname(originalNickname || '')
      setBio(originalBio || '')
      toast.error('Ошибка обновления профиля')
      console.error('Update error:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  if (!creator) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <BoltIcon className="w-5 h-5 text-yellow-500" />
        Оптимистичные обновления
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Никнейм
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={isUpdating}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Биография
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            disabled={isUpdating}
          />
        </div>

        <button
          onClick={handleOptimisticUpdate}
          disabled={isUpdating || (!nickname && !bio)}
          className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isUpdating ? (
            <>
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
              Обновляем...
            </>
          ) : (
            <>
              <CheckIcon className="w-5 h-5" />
              Применить изменения
            </>
          )}
        </button>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
          </div>
        )}

        <div className="text-xs text-gray-500 dark:text-slate-400 space-y-1">
          <p>✨ Изменения применяются мгновенно без ожидания сервера</p>
          <p>❌ При ошибке данные автоматически откатываются</p>
          <p>✅ После успеха данные синхронизируются с сервером</p>
        </div>
      </div>
    </div>
  )
}

// Компонент для отображения статуса WebSocket
function WebSocketStatus() {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionAttempts, setConnectionAttempts] = useState(0)

  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(wsService.isConnected())
    }

    // Проверяем начальное состояние
    checkConnection()

    // Слушаем события подключения/отключения
    const handleConnected = () => {
      setIsConnected(true)
      setConnectionAttempts(0)
      toast.success('WebSocket подключен')
    }

    const handleDisconnected = () => {
      setIsConnected(false)
      toast.error('WebSocket отключен')
    }

    const handleMaxReconnect = () => {
      toast.error('Не удалось восстановить соединение')
    }

    wsService.on('connected', handleConnected)
    wsService.on('disconnected', handleDisconnected)
    wsService.on('max_reconnect_reached', handleMaxReconnect)

    // Проверяем состояние каждые 2 секунды
    const interval = setInterval(checkConnection, 2000)

    return () => {
      wsService.off('connected', handleConnected)
      wsService.off('disconnected', handleDisconnected)
      wsService.off('max_reconnect_reached', handleMaxReconnect)
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <WifiIcon className="w-5 h-5 text-blue-500" />
        WebSocket статус
      </h3>

      <div className="flex items-center gap-3 mb-4">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
        <span className="text-gray-700 dark:text-slate-300 font-medium">
          {isConnected ? 'Подключен' : 'Отключен'}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600 dark:text-slate-400">
        <p>📡 Real-time обновления {isConnected ? 'активны' : 'недоступны'}</p>
        {!isConnected && connectionAttempts > 0 && (
          <p>🔄 Попыток переподключения: {connectionAttempts}</p>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <button
          onClick={() => wsService.connect()}
          disabled={isConnected}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Подключиться
        </button>
        <button
          onClick={() => wsService.disconnect()}
          disabled={!isConnected}
          className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Отключиться
        </button>
      </div>
    </div>
  )
}

// Компонент для тестирования синхронизации между вкладками
function TabSyncDemo() {
  const { creator, refreshCreator } = useCreatorData()
  const [tabId] = useState(() => Math.random().toString(36).substr(2, 9))
  const [lastSync, setLastSync] = useState<Date | null>(null)

  useEffect(() => {
    // Слушаем изменения через BroadcastChannel
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setLastSync(new Date())
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <ExclamationTriangleIcon className="w-5 h-5 text-orange-500" />
        Синхронизация между вкладками
      </h3>

      <div className="space-y-3">
        <div className="text-sm text-gray-600 dark:text-slate-400">
          <p>Tab ID: <span className="font-mono text-purple-600 dark:text-purple-400">{tabId}</span></p>
          {lastSync && (
            <p>Последняя синхронизация: {lastSync.toLocaleTimeString()}</p>
          )}
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Откройте эту страницу в нескольких вкладках и измените данные создателя. Все вкладки автоматически синхронизируются!
          </p>
        </div>

        <button
          onClick={() => {
            refreshCreator()
            setLastSync(new Date())
            toast.success('Данные обновлены во всех вкладках')
          }}
          className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
        >
          <ArrowPathIcon className="w-5 h-5" />
          Принудительная синхронизация
        </button>
      </div>
    </div>
  )
}

// Основной компонент демонстрации
function CreatorDataV2Demo() {
  const { creator, isLoading, error, refreshCreator } = useCreatorData()

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-gray-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Ошибка загрузки</h3>
        <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
        <button
          onClick={() => refreshCreator()}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all"
        >
          Повторить попытку
        </button>
      </div>
    )
  }

  if (!creator) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-6 mb-6">
        <p className="text-yellow-600 dark:text-yellow-300">Данные создателя не найдены</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Основная информация о создателе */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            Данные создателя
          </h2>
          <button
            onClick={() => refreshCreator()}
            className="p-2 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
          >
            <ArrowPathIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-slate-400">ID</p>
            <p className="font-medium text-gray-900 dark:text-white">{creator.id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-slate-400">Никнейм</p>
            <p className="font-medium text-gray-900 dark:text-white">@{creator.nickname || 'N/A'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-sm text-gray-600 dark:text-slate-400">Биография</p>
            <p className="font-medium text-gray-900 dark:text-white">{creator.bio || 'Не указана'}</p>
          </div>
        </div>
      </div>

      {/* Демонстрации функционала */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <OptimisticUpdateDemo />
        <WebSocketStatus />
      </div>

      <TabSyncDemo />
    </div>
  )
}

// Страница тестирования
export default function CreatorDataV2TestPage() {
  const [creatorId, setCreatorId] = useState('')
  const [activeCreatorId, setActiveCreatorId] = useState<string | null>(null)
  const { user } = useUserContext()

  const handleTest = () => {
    if (creatorId.trim()) {
      setActiveCreatorId(creatorId.trim())
    }
  }

  const handleTestCurrentUser = () => {
    if (user?.id) {
      setCreatorId(user.id)
      setActiveCreatorId(user.id)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-24 pb-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          CreatorData v2 - Улучшения
        </h1>
        <p className="text-gray-600 dark:text-slate-400 mb-8">
          Тестирование оптимистичных обновлений, WebSocket и синхронизации между вкладками
        </p>

        {/* Контролы тестирования */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 mb-8 border border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Выберите создателя</h2>
          
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                ID создателя
              </label>
              <input
                type="text"
                value={creatorId}
                onChange={(e) => setCreatorId(e.target.value)}
                placeholder="Введите ID создателя"
                className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <button
              onClick={handleTest}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              Тестировать
            </button>
            
            {user && user.isCreator && (
              <button
                onClick={handleTestCurrentUser}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Мой профиль
              </button>
            )}
          </div>
          
          {activeCreatorId && (
            <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-sm text-purple-700 dark:text-purple-300">
                Тестируем создателя: <span className="font-mono font-medium">{activeCreatorId}</span>
              </p>
            </div>
          )}
        </div>

        {/* Демонстрация функционала */}
        {activeCreatorId && (
          <CreatorDataProvider creatorId={activeCreatorId}>
            <CreatorDataV2Demo />
          </CreatorDataProvider>
        )}
      </div>
    </div>
  )
} 