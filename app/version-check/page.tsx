'use client'

import { useState, useEffect } from 'react'

export default function VersionCheckPage() {
  const [version, setVersion] = useState<string>('Загрузка...')
  const [buildTime, setBuildTime] = useState<string>('')
  const [randomColor, setRandomColor] = useState<string>('#ff0080')

  useEffect(() => {
    // Получаем версию
    fetch('/api/version')
      .then(res => res.json())
      .then(data => {
        setVersion(data.version || 'Unknown')
        setBuildTime(new Date(data.timestamp).toLocaleString('ru-RU'))
      })
      .catch(() => setVersion('Ошибка загрузки'))

    // Меняем цвет каждые 2 секунды
    const interval = setInterval(() => {
      const colors = ['#ff0080', '#00ff80', '#8000ff', '#ff8000', '#00ffff', '#ff00ff']
      setRandomColor(colors[Math.floor(Math.random() * colors.length)])
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-red-700 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Большой баннер */}
        <div 
          className="bg-white rounded-3xl shadow-2xl p-12 mb-8 transform rotate-2 hover:rotate-0 transition-transform duration-300"
          style={{ borderColor: randomColor, borderWidth: '4px', borderStyle: 'solid' }}
        >
          <h1 className="text-6xl font-black text-center mb-8" style={{ color: randomColor }}>
            🚀 ВЕРСИЯ ОБНОВЛЕНА! 🚀
          </h1>
          
          <div className="text-center space-y-4">
            <p className="text-3xl font-bold text-gray-800">
              Текущая версия:
            </p>
            <p className="text-4xl font-mono bg-gray-100 p-4 rounded-xl" style={{ color: randomColor }}>
              {version}
            </p>
            <p className="text-xl text-gray-600">
              Время сборки: {buildTime}
            </p>
          </div>
        </div>

        {/* Дополнительные индикаторы */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-green-400 to-blue-500 p-6 rounded-2xl text-white">
            <h3 className="text-2xl font-bold mb-2">✅ Service Worker</h3>
            <p>Версия: v7-20250701-fix</p>
          </div>
          
          <div className="bg-gradient-to-r from-orange-400 to-red-500 p-6 rounded-2xl text-white">
            <h3 className="text-2xl font-bold mb-2">🔥 Горячий деплой</h3>
            <p>01.07.2025 17:16 UTC</p>
          </div>
          
          <div className="bg-gradient-to-r from-purple-400 to-pink-500 p-6 rounded-2xl text-white">
            <h3 className="text-2xl font-bold mb-2">🎯 Статус</h3>
            <p>Продакшн активен</p>
          </div>
        </div>

        {/* Анимированный текст */}
        <div className="mt-12 text-center">
          <p className="text-white text-2xl animate-pulse">
            Если вы видите эту страницу - версия успешно обновилась! 🎉
          </p>
        </div>

        {/* Дополнительная информация */}
        <div className="mt-8 bg-white/90 rounded-2xl p-8">
          <h2 className="text-3xl font-bold mb-4">Что изменилось:</h2>
          <ul className="space-y-2 text-lg">
            <li>✅ Добавлена страница проверки версии</li>
            <li>✅ Новая кнопка в навигации</li>
            <li>✅ Яркий градиентный фон</li>
            <li>✅ Исправлена передача цены в постах</li>
            <li>✅ Добавлено логирование для отладки</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 