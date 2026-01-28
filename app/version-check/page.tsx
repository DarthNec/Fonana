'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeftIcon, CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/outline'

export default function VersionCheckPage() {
  const [version, setVersion] = useState<string>('Загрузка...')
  const [buildTime, setBuildTime] = useState<string>('')

  useEffect(() => {
    // Получаем версию
    fetch('/api/version')
      .then(res => res.json())
      .then(data => {
        setVersion(data.version || 'Unknown')
        setBuildTime(new Date(data.timestamp).toLocaleString('ru-RU'))
      })
      .catch(() => setVersion('Ошибка загрузки'))
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-red-700 pt-8 md:pt-4">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Кнопка назад */}
        <div className="mb-8">
          <Link 
            href="/feed"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Назад к ленте
          </Link>
        </div>

        {/* Основной баннер */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-6">
              <SparklesIcon className="w-8 h-8 text-purple-600" />
              <h1 className="text-4xl font-black text-gray-900">
                Версия приложения
              </h1>
              <SparklesIcon className="w-8 h-8 text-purple-600" />
            </div>
            
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-6 rounded-2xl">
              <p className="text-2xl font-bold text-gray-800 mb-2">
                Текущая версия:
              </p>
              <p className="text-3xl font-mono bg-white p-4 rounded-xl border-2 border-purple-200 text-purple-700">
                {version}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Время сборки: {buildTime}
              </p>
            </div>
          </div>
        </div>

        {/* Последние обновления */}
        <div className="bg-white rounded-3xl p-8 mb-8">
          <h2 className="text-3xl font-bold mb-6 text-gray-900">Последние обновления</h2>
          
          <div className="space-y-6">
            <div className="border-l-4 border-green-500 pl-6">
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Исправления UX и производительности</h3>
                  <p className="text-gray-600 mb-2">01.07.2025</p>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Исправлена передача цены в модалках покупки</li>
                    <li>• Улучшена загрузка и кроп изображений</li>
                    <li>• Оптимизирована валидация создания постов</li>
                    <li>• Исправлена обработка статических файлов в nginx</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="border-l-4 border-blue-500 pl-6">
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Улучшения системы версионирования</h3>
                  <p className="text-gray-600 mb-2">01.07.2025</p>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Автоматическое обновление Service Worker</li>
                    <li>• Улучшенная система кеширования</li>
                    <li>• Оптимизированная страница проверки версии</li>
                    <li>• Централизованное управление версиями</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="border-l-4 border-purple-500 pl-6">
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-6 h-6 text-purple-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Архитектурные улучшения</h3>
                  <p className="text-gray-600 mb-2">30.06.2025</p>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Централизованное управление состоянием пользователя</li>
                    <li>• Унифицированная система постов</li>
                    <li>• Улучшенная система контроля доступа</li>
                    <li>• Оптимизированная работа с WebSocket</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Статус системы */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-green-400 to-blue-500 p-6 rounded-2xl text-white">
            <h3 className="text-xl font-bold mb-2">✅ Система</h3>
            <p>Все сервисы работают стабильно</p>
          </div>
          
          <div className="bg-gradient-to-r from-orange-400 to-red-500 p-6 rounded-2xl text-white">
            <h3 className="text-xl font-bold mb-2">🔥 Производительность</h3>
            <p>Оптимизированная загрузка</p>
          </div>
          
          <div className="bg-gradient-to-r from-purple-400 to-pink-500 p-6 rounded-2xl text-white">
            <h3 className="text-xl font-bold mb-2">🎯 Статус</h3>
            <p>Продакшн активен</p>
          </div>
        </div>

        {/* Информация для разработчиков */}
        <div className="mt-8 bg-white/90 rounded-2xl p-6">
          <h3 className="text-xl font-bold mb-4 text-gray-900">Информация для разработчиков</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <p><strong>Service Worker:</strong> v7-20250701-fix</p>
              <p><strong>Next.js:</strong> 14.x</p>
              <p><strong>Database:</strong> PostgreSQL</p>
            </div>
            <div>
              <p><strong>Deploy:</strong> PM2 + Nginx</p>
              <p><strong>Cache:</strong> 5-минутный TTL</p>
              <p><strong>WebSocket:</strong> JWT аутентификация</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 