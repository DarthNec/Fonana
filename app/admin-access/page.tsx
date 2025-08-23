'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { 
  ShieldCheckIcon, 
  EyeIcon, 
  EyeSlashIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

export default function AdminAccessPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!username.trim() || !password.trim()) {
      toast.error('Пожалуйста, заполните все поля')
      return
    }

    setIsLoading(true)

    try {
      // Простая проверка логина (в продакшене должна быть на сервере)
      if (username === 'admin' && password === 'admin') {
        // Сохраняем информацию об админе в localStorage
        localStorage.setItem('adminAuth', JSON.stringify({
          username: 'admin',
          wallet: 'HHJoYULyhpe7ZwbTLKfobEXnVybmxXrzQwjKW2xR7Baw',
          timestamp: Date.now()
        }))
        
        toast.success('Успешный вход в админ панель!')
        router.push('/admin-access/dashboard')
      } else {
        toast.error('Неверные учетные данные')
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error('Произошла ошибка при входе')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full mb-4">
            <ShieldCheckIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Админ панель
          </h1>
          <p className="text-gray-600 dark:text-slate-300">
            Войдите для доступа к административным функциям
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Имя пользователя */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Имя пользователя
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-slate-700 dark:text-white transition-all duration-300"
              placeholder="Введите имя пользователя"
              required
            />
          </div>

          {/* Пароль */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Пароль
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-slate-700 dark:text-white transition-all duration-300"
                placeholder="Введите пароль"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <EyeIcon className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* Кнопка входа */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Вход...
              </>
            ) : (
              <>
                Войти
                <ArrowRightIcon className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 p-4 bg-gray-50 dark:bg-slate-700 rounded-xl">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">Тестовые данные:</h3>
          <div className="text-sm text-gray-600 dark:text-slate-300 space-y-1">
            <p><span className="font-medium">Пользователь:</span> admin</p>
            <p><span className="font-medium">Пароль:</span> admin</p>
          </div>
        </div>
      </div>
    </div>
  )
} 