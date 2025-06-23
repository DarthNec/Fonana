'use client'

import { PricingProvider, usePricing } from '@/lib/pricing/PricingProvider'
import { useDynamicPrice, formatSolAmount, formatUsdAmount } from '@/lib/pricing/hooks/useDynamicPrice'
import { useSolanaRate } from '@/lib/pricing/hooks/usePriceDisplay'
import { useState } from 'react'
import Link from 'next/link'

function PricingDashboard() {
  const { prices, isLoading, error, lastUpdate, refresh } = usePricing()
  const solanaRate = useSolanaRate()
  const [testAmount, setTestAmount] = useState(0.1)
  
  // Тестовые цены
  const testPrices = [0.01, 0.05, 0.1, 0.5, 1, 5, 10]
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Тестирование динамического курса
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Изолированная система для тестирования динамических цен
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Статус системы</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Курс SOL/USD</p>
              <p className="text-2xl font-bold">
                {isLoading && !prices ? (
                  <span className="animate-pulse">Загрузка...</span>
                ) : (
                  solanaRate.display || 'Недоступно'
                )}
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Источник</p>
              <p className="text-lg font-semibold">
                {prices?.source || 'N/A'}
                {prices?.isStale && ' (устарел)'}
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Последнее обновление</p>
              <p className="text-lg font-semibold">
                {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'Никогда'}
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
              Ошибка: {error}
            </div>
          )}

          <button
            onClick={refresh}
            disabled={isLoading}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Обновление...' : 'Обновить курс'}
          </button>
        </div>

        {/* Price Converter */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Конвертер цен</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Сумма в SOL</label>
            <input
              type="number"
              value={testAmount}
              onChange={(e) => setTestAmount(parseFloat(e.target.value) || 0)}
              step="0.01"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <PriceDisplay amount={testAmount} />
        </div>

        {/* Test Prices Grid */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Тестовые цены</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {testPrices.map(price => (
              <PriceCard key={price} amount={price} />
            ))}
          </div>
        </div>

        {/* Test Links */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Тестовые страницы</h2>
          
          <div className="space-y-2">
            <Link
              href="/test/pricing/subscription"
              className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <h3 className="font-semibold">Тест подписок</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Проверка отображения цен в модальном окне подписок
              </p>
            </Link>
            
            <Link
              href="/test/pricing/post-purchase"
              className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <h3 className="font-semibold">Тест покупки постов</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Проверка отображения цен при покупке контента
              </p>
            </Link>
          </div>
        </div>

        {/* Raw Data Debug */}
        {prices && (
          <div className="mt-8 bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm">
            <p className="text-green-400 mb-2">// Debug Info</p>
            <pre>{JSON.stringify(prices, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  )
}

function PriceDisplay({ amount }: { amount: number }) {
  const price = useDynamicPrice(amount)
  
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">SOL</p>
          <p className="text-xl font-semibold">{formatSolAmount(amount)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">USD</p>
          <p className="text-xl font-semibold">
            {price.usd ? formatUsdAmount(price.usd) : 'N/A'}
          </p>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Отображение: <span className="font-medium">{price.displayPrice}</span>
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          Источник: {price.source}
        </p>
      </div>
    </div>
  )
}

function PriceCard({ amount }: { amount: number }) {
  const price = useDynamicPrice(amount)
  
  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow">
      <p className="text-2xl font-bold text-gray-900 dark:text-white">
        {formatSolAmount(amount)}
      </p>
      {price.usd && (
        <>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            ≈ {formatUsdAmount(price.usd)}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Курс: ${(price.usd / amount).toFixed(2)} за SOL
          </p>
        </>
      )}
    </div>
  )
}

export default function PricingTestPage() {
  // Проверяем, есть ли у пользователя доступ (можно добавить проверку)
  const [enabled, setEnabled] = useState(true)
  
  return (
    <PricingProvider enabled={enabled}>
      <PricingDashboard />
    </PricingProvider>
  )
} 