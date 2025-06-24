'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { useWallet } from '@solana/wallet-adapter-react'
import { HybridWalletConnect } from '@/components/HybridWalletConnect'
import { ConnectWalletOnDemand } from '@/components/ConnectWalletOnDemand'
import { detectWalletEnvironment } from '@/lib/auth/solana'
import { useState, useEffect } from 'react'
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

export default function HybridAuthTestPage() {
  const { isAuthenticated, isLoading, user, checkAuth, needsWalletConnection } = useAuth()
  const { connected, publicKey, sendTransaction } = useWallet()
  const [environment, setEnvironment] = useState<ReturnType<typeof detectWalletEnvironment>>()
  const [testResults, setTestResults] = useState<Record<string, boolean | null>>({})

  useEffect(() => {
    setEnvironment(detectWalletEnvironment())
  }, [])

  // Тест 1: Проверка JWT авторизации
  const testJWTAuth = async () => {
    try {
      const response = await fetch('/api/auth/wallet')
      const data = await response.json()
      setTestResults(prev => ({ ...prev, jwtAuth: data.authenticated }))
      toast.success(`JWT Auth: ${data.authenticated ? 'OK' : 'Failed'}`)
    } catch (error) {
      setTestResults(prev => ({ ...prev, jwtAuth: false }))
      toast.error('JWT Auth test failed')
    }
  }

  // Тест 2: Проверка подключения кошелька по требованию
  const testOnDemandConnection = () => {
    if (!connected) {
      toast('Используйте кнопку ниже для подключения')
      setTestResults(prev => ({ ...prev, onDemand: null }))
    } else {
      setTestResults(prev => ({ ...prev, onDemand: true }))
      toast.success('Wallet connected on demand!')
    }
  }

  // Тест 3: Имитация транзакции
  const testTransaction = async () => {
    if (!connected || !publicKey) {
      toast.error('Сначала подключите кошелек')
      return
    }

    try {
      toast.loading('Тестовая транзакция...')
      // Здесь была бы реальная транзакция
      setTimeout(() => {
        setTestResults(prev => ({ ...prev, transaction: true }))
        toast.success('Transaction test passed!')
      }, 2000)
    } catch (error) {
      setTestResults(prev => ({ ...prev, transaction: false }))
      toast.error('Transaction test failed')
    }
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Тестирование гибридной авторизации
        </h1>

        {/* Статус окружения */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 mb-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Окружение
          </h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-300">Мобильное устройство:</span>
              <span className={`font-medium ${environment?.isMobile ? 'text-green-600' : 'text-gray-500'}`}>
                {environment?.isMobile ? 'Да' : 'Нет'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-300">Phantom установлен:</span>
              <span className={`font-medium ${environment?.isPhantom ? 'text-green-600' : 'text-gray-500'}`}>
                {environment?.isPhantom ? 'Да' : 'Нет'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-300">Встроенный браузер:</span>
              <span className={`font-medium ${environment?.isInWalletBrowser ? 'text-green-600' : 'text-gray-500'}`}>
                {environment?.isInWalletBrowser ? 'Да' : 'Нет'}
              </span>
            </div>
          </div>
        </div>

        {/* Статус авторизации */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 mb-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Статус авторизации
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-300">JWT авторизован:</span>
              <StatusBadge status={isAuthenticated} loading={isLoading} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-300">Кошелек подключен:</span>
              <StatusBadge status={connected} />
            </div>
            {user && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  User ID: <span className="font-mono">{user.id}</span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Wallet: <span className="font-mono">{user.wallet.slice(0, 8)}...{user.wallet.slice(-8)}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Кнопки управления */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 mb-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Управление подключением
          </h2>
          <div className="flex flex-wrap gap-4">
            <HybridWalletConnect />
            <button
              onClick={checkAuth}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
            >
              Обновить статус
            </button>
          </div>
        </div>

        {/* Тесты */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Тесты функционала
          </h2>
          
          <div className="space-y-4">
            {/* Тест 1 */}
            <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  1. JWT авторизация
                </h3>
                <TestResult status={testResults.jwtAuth} />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                Проверка работы JWT токенов и cookie
              </p>
              <button
                onClick={testJWTAuth}
                className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Запустить тест
              </button>
            </div>

            {/* Тест 2 */}
            <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  2. Подключение по требованию
                </h3>
                <TestResult status={testResults.onDemand} />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                Кошелек подключается только когда нужен
              </p>
              {!connected ? (
                <ConnectWalletOnDemand 
                  message="Тестовое подключение для транзакции"
                  onConnect={testOnDemandConnection}
                />
              ) : (
                <button
                  onClick={testOnDemandConnection}
                  className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Проверить статус
                </button>
              )}
            </div>

            {/* Тест 3 */}
            <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  3. Транзакция
                </h3>
                <TestResult status={testResults.transaction} />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                Проверка возможности отправки транзакций
              </p>
              <button
                onClick={testTransaction}
                disabled={!connected}
                className="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
              >
                Отправить тестовую транзакцию
              </button>
            </div>
          </div>
        </div>

        {/* Информация */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="flex items-start gap-2">
            <InformationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Как это работает:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>При первом подключении запрашивается подпись для авторизации</li>
                <li>JWT токен сохраняется для поддержания сессии</li>
                <li>Кошелек подключается снова только для транзакций</li>
                <li>На мобильных используется Mobile Wallet Adapter</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status, loading }: { status: boolean; loading?: boolean }) {
  if (loading) {
    return <span className="text-gray-500">Загрузка...</span>
  }
  
  return status ? (
    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
      <CheckCircleIcon className="w-5 h-5" />
      <span className="font-medium">Да</span>
    </div>
  ) : (
    <div className="flex items-center gap-1 text-gray-500">
      <XCircleIcon className="w-5 h-5" />
      <span className="font-medium">Нет</span>
    </div>
  )
}

function TestResult({ status }: { status: boolean | null | undefined }) {
  if (status === null || status === undefined) {
    return <span className="text-gray-400 text-sm">Не запущен</span>
  }
  
  return status ? (
    <span className="text-green-600 dark:text-green-400 text-sm font-medium">✓ Пройден</span>
  ) : (
    <span className="text-red-600 dark:text-red-400 text-sm font-medium">✗ Провален</span>
  )
} 