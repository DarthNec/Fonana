'use client'

import { useState, useEffect, useRef } from 'react'
import { ChatBubbleLeftRightIcon, PaperAirplaneIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { useUser } from '@/lib/store/appStore'

interface AiChatMessage {
  id: string
  userId: string
  nickname: string
  avatar: string | null
  message: string
  createdAt: string
}

const CHAT_DISMISSED_KEY = 'fonana-chat-dismissed'

export function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false) // Начинаем с false, потом проверяем localStorage
  const [isInitialized, setIsInitialized] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [messages, setMessages] = useState<AiChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [inputMessage, setInputMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  const user = useUser()

  // Определяем мобильное устройство
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Свайп для открытия чата на мобильном
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (window.innerWidth >= 768) return // Только для мобильных
      
      const touchEndX = e.changedTouches[0].clientX
      const touchEndY = e.changedTouches[0].clientY
      const deltaX = touchEndX - touchStartX.current
      const deltaY = Math.abs(touchEndY - touchStartY.current)
      
      // Свайп вправо от левого края (начало в пределах 40px от края)
      if (touchStartX.current < 40 && deltaX > 80 && deltaY < 100 && !isOpen) {
        setIsOpen(true)
      }
      
      // Свайп влево для закрытия чата
      if (deltaX < -80 && deltaY < 100 && isOpen) {
        handleClose()
      }
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isOpen])

  // Инициализация: проверяем localStorage при первом рендере
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const wasDismissed = localStorage.getItem(CHAT_DISMISSED_KEY)
      const mobile = window.innerWidth < 768
      // Если пользователь ещё не закрывал чат И это НЕ мобильное - открываем автоматически
      if (!wasDismissed) {
        setIsOpen(true)
      }
      setIsInitialized(true)
    }
  }, [])

  // Сохраняем состояние в localStorage при закрытии
  const handleClose = () => {
    setIsOpen(false)
    localStorage.setItem(CHAT_DISMISSED_KEY, 'true')
  }

  // Открытие чата (не сбрасываем dismissed флаг)
  const handleOpen = () => {
    setIsOpen(true)
  }

  // Загружаем сообщения при открытии чата и авто-обновление
  useEffect(() => {
    if (isOpen) {
      fetchMessages()
      
      // Авто-обновление каждые 5 секунд когда чат открыт
      const interval = setInterval(() => {
        fetchMessagesQuiet()
      }, 5000)
      
      return () => clearInterval(interval)
    }
  }, [isOpen])

  // Авто-скролл к последнему сообщению
  useEffect(() => {
    if (messages.length > 0 && isOpen && chatContainerRef.current) {
      // Используем requestAnimationFrame для ожидания полного рендера DOM
      requestAnimationFrame(() => {
        const container = chatContainerRef.current
        if (container) {
          container.scrollTop = container.scrollHeight
        }
      })
    }
  }, [messages, isOpen])

  const fetchMessages = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/aichat?limit=100')
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('[AiChatWidget] Error fetching messages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Тихое обновление без лоадера (для авто-обновления)
  const fetchMessagesQuiet = async () => {
    try {
      const response = await fetch('/api/aichat?limit=100')
      if (response.ok) {
        const data = await response.json()
        const newMessages = data.messages || []
        
        // Обновляем только если есть новые сообщения
        if (newMessages.length !== messages.length || 
            (newMessages.length > 0 && messages.length > 0 && 
             newMessages[newMessages.length - 1]?.id !== messages[messages.length - 1]?.id)) {
          setMessages(newMessages)
        }
      }
    } catch (error) {
      // Тихо игнорируем ошибки при авто-обновлении
    }
  }

  // Отправка сообщения
  const sendMessage = async () => {
    if (!inputMessage.trim() || isSending || !user) return

    const messageText = inputMessage.trim()
    setInputMessage('')
    setIsSending(true)

    try {
      const response = await fetch('/api/aichat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          nickname: user.nickname || user.fullName || 'Anonymous',
          avatar: user.avatar,
          message: messageText
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.message) {
          setMessages(prev => [...prev, data.message])
        }
      }
    } catch (error) {
      console.error('[AiChatWidget] Error sending message:', error)
    } finally {
      setIsSending(false)
      inputRef.current?.focus()
    }
  }

  // Обработка Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Генерируем цвет для пользователя на основе его ID
  const getUserColor = (userId: string) => {
    const colors = [
      'from-purple-500 to-pink-500',
      'from-blue-500 to-cyan-500',
      'from-green-500 to-emerald-500',
      'from-orange-500 to-yellow-500',
      'from-red-500 to-pink-500',
      'from-indigo-500 to-purple-500',
      'from-teal-500 to-green-500',
      'from-rose-500 to-orange-500',
    ]
    const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
    return colors[index]
  }

  // Форматируем время
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <>
      {/* Кнопка открытия чата */}
      {isInitialized && !isOpen && (
        <>
          {/* Desktop: кнопка справа */}
          <button
            onClick={handleOpen}
            className="hidden md:flex fixed top-1/2 -translate-y-1/2 right-0 z-[9999] w-10 h-16 rounded-l-xl shadow-lg transition-all duration-300 items-center justify-center bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hover:w-12"
          >
            <ChevronLeftIcon className="w-5 h-5 text-white" />
          </button>
          
          {/* Mobile: кнопка слева */}
          <button
            onClick={handleOpen}
            style={{ marginLeft: '-20px' }}
            className="md:hidden flex fixed top-1/2 -translate-y-1/2 left-0 z-[9999] w-5 h-16 rounded-r-xl shadow-lg transition-all duration-300 items-center justify-center bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hover:w-6"
          >
            <ChevronRightIcon className="w-4 h-4 text-white" style={{ marginLeft: '20px' }} />
          </button>
        </>
      )}

      {/* Overlay - закрывает чат при клике */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[9997] bg-black/50 backdrop-blur-sm transition-opacity duration-300"
          onClick={handleClose}
        />
      )}

      {/* Desktop: Панель чата справа */}
      <div
        className={`hidden md:flex fixed top-0 right-0 z-[9998] w-[400px] h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-gray-200 dark:border-slate-700 flex-col transition-transform duration-300 ease-out ${
          isOpen 
            ? 'translate-x-0' 
            : 'translate-x-full'
        }`}
      >
        {/* Заголовок */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-purple-600/10 to-pink-600/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Live Чат</h3>
            </div>
          </div>
        </div>

        {/* Сообщения */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent scroll-smooth"
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-slate-400">
              <ChatBubbleLeftRightIcon className="w-16 h-16 mb-3 opacity-50" />
              <p className="text-base">Пока нет сообщений</p>
              <p className="text-sm">Напиши первым!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="flex gap-3 group">
                {/* Аватар */}
                <div className="flex-shrink-0">
                  {msg.avatar ? (
                    <img 
                      src={msg.avatar} 
                      alt={msg.nickname}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${getUserColor(msg.userId)} flex items-center justify-center`}>
                      <span className="text-white text-sm font-bold">
                        {msg.nickname.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Контент сообщения */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-sm font-semibold bg-gradient-to-r ${getUserColor(msg.userId)} bg-clip-text text-transparent`}>
                      {msg.nickname}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-slate-300 break-words leading-relaxed mt-0.5">
                    {msg.message}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Поле ввода */}
        <div className="h-[72px] px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex-shrink-0">
          {user ? (
            <div className="flex items-center gap-3 h-full">
              <div className="flex-shrink-0">
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.nickname || 'You'}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${getUserColor(user.id)} flex items-center justify-center`}>
                    <span className="text-white text-sm font-bold">
                      {(user.nickname || user.fullName || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Написать сообщение..."
                disabled={isSending}
                className="flex-1 h-11 px-4 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-full text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isSending}
                className="w-11 h-11 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
              >
                {isSending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <PaperAirplaneIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Подключите кошелёк для чата
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Панель чата слева */}
      <div
        className={`md:hidden flex fixed top-0 left-0 z-[9998] w-[85vw] max-w-[350px] h-full bg-white dark:bg-slate-900 shadow-2xl border-r border-gray-200 dark:border-slate-700 flex-col transition-transform duration-300 ease-out ${
          isOpen 
            ? 'translate-x-0' 
            : '-translate-x-full'
        }`}
      >
        {/* Заголовок */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-purple-600/10 to-pink-600/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Live Чат</h3>
            </div>
          </div>
        </div>

        {/* Сообщения */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent scroll-smooth"
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-slate-400">
              <ChatBubbleLeftRightIcon className="w-16 h-16 mb-3 opacity-50" />
              <p className="text-base">Пока нет сообщений</p>
              <p className="text-sm">Напиши первым!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="flex gap-3 group">
                {/* Аватар */}
                <div className="flex-shrink-0">
                  {msg.avatar ? (
                    <img 
                      src={msg.avatar} 
                      alt={msg.nickname}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-r ${getUserColor(msg.userId)} flex items-center justify-center`}>
                      <span className="text-white text-sm font-bold">
                        {msg.nickname.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Контент сообщения */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-sm font-semibold bg-gradient-to-r ${getUserColor(msg.userId)} bg-clip-text text-transparent`}>
                      {msg.nickname}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-slate-500">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-slate-300 break-words leading-relaxed mt-0.5">
                    {msg.message}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Поле ввода */}
        <div className="px-3 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex-shrink-0 pb-safe">
          {user ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Сообщение..."
                disabled={isSending}
                className="flex-1 h-10 px-4 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-full text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isSending}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isSending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <PaperAirplaneIcon className="w-4 h-4" />
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-10">
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Подключите кошелёк
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
