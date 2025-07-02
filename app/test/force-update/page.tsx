'use client'

import { useState, useEffect } from 'react'

export default function ForceUpdatePage() {
  const [status, setStatus] = useState('Инициализация...')
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)])
  }

  useEffect(() => {
    forceUpdate()
  }, [])

  const forceUpdate = async () => {
    try {
      setStatus('Начинаем принудительное обновление...')
      addLog('Начинаем принудительное обновление...')

      // 1. Очищаем все кеши
      addLog('Очищаем все кеши...')
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => {
          addLog(`Удаляем кеш: ${name}`)
          return caches.delete(name)
        }))
        addLog(`Очищено ${cacheNames.length} кешей`)
      }

      // 2. Удаляем Service Worker
      addLog('Удаляем Service Worker...')
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
          await registration.unregister()
          addLog('Service Worker удален')
        } else {
          addLog('Service Worker не найден')
        }
      }

      // 3. Очищаем localStorage и sessionStorage
      addLog('Очищаем локальное хранилище...')
      localStorage.clear()
      sessionStorage.clear()
      addLog('Локальное хранилище очищено')

      // 4. Регистрируем новый Service Worker
      addLog('Регистрируем новый Service Worker...')
      if ('serviceWorker' in navigator) {
        const newRegistration = await navigator.serviceWorker.register('/sw.js')
        addLog('Новый Service Worker зарегистрирован')
        
        // Ждем активации
        if (newRegistration.installing) {
          newRegistration.installing.addEventListener('statechange', (event) => {
            if ((event.target as ServiceWorker).state === 'activated') {
              addLog('Service Worker активирован')
              setStatus('Обновление завершено! Перезагружаем страницу...')
              
              // Перезагружаем страницу через 2 секунды
              setTimeout(() => {
                window.location.href = '/'
              }, 2000)
            }
          })
        }
      }

      setStatus('Обновление завершено!')
      addLog('Принудительное обновление завершено')

    } catch (error) {
      setStatus('Ошибка при обновлении')
      addLog(`Ошибка: ${error}`)
    }
  }

  const manualReload = () => {
    addLog('Принудительная перезагрузка...')
    window.location.reload()
  }

  const goHome = () => {
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Принудительное обновление</h1>
        
        {/* Status */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Статус</h2>
          <div className="text-lg font-semibold text-blue-400">{status}</div>
        </div>

        {/* Actions */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Действия</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={forceUpdate}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Обновить снова
            </button>
            
            <button
              onClick={manualReload}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Перезагрузить
            </button>
            
            <button
              onClick={goHome}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              На главную
            </button>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Логи обновления</h2>
          <div className="bg-slate-900 p-4 rounded font-mono text-sm max-h-60 overflow-y-auto">
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div key={index} className="text-gray-400 mb-1">
                  {log}
                </div>
              ))
            ) : (
              <div className="text-gray-500">Ожидание логов...</div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Инструкции</h2>
          <div className="space-y-2 text-sm text-gray-300">
            <p>• Эта страница принудительно очищает все кеши браузера</p>
            <p>• Удаляет старый Service Worker и регистрирует новый</p>
            <p>• Очищает localStorage и sessionStorage</p>
            <p>• После обновления вы будете перенаправлены на главную страницу</p>
            <p>• Если проблема сохраняется, попробуйте открыть сайт в режиме инкогнито</p>
          </div>
        </div>
      </div>
    </div>
  )
} 