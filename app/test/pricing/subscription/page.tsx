'use client'

import { useState } from 'react'
import { PricingProvider } from '@/lib/pricing/PricingProvider'
import { useDynamicPrice, formatSolAmount, formatUsdAmount } from '@/lib/pricing/hooks/useDynamicPrice'
import { usePriceDisplay } from '@/lib/pricing/hooks/usePriceDisplay'
import Link from 'next/link'

// Тестовые данные для создателя
const TEST_CREATOR = {
  id: 'test-creator-1',
  name: 'Тестовый Создатель',
  username: 'testcreator',
  avatar: '/avatars/default.png',
  subscribersCount: 1234,
  postsCount: 567
}

// Тестовые тарифы
const TEST_TIERS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 0.05,
    duration: 'месяц',
    features: [
      'Доступ к базовому контенту',
      'Комментарии к постам',
      'Личные сообщения'
    ],
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 0.15,
    duration: 'месяц',
    features: [
      'Все из Basic',
      'Эксклюзивный контент',
      'Приоритетная поддержка',
      'HD медиа'
    ],
    color: 'from-purple-500 to-pink-500'
  },
  {
    id: 'vip',
    name: 'VIP',
    price: 0.35,
    duration: 'месяц',
    features: [
      'Все из Premium',
      'Личное общение',
      'Кастомный контент',
      'Ранний доступ',
      'VIP значок'
    ],
    color: 'from-yellow-500 to-red-500'
  }
]

function SubscriptionTier({ tier, isSelected, onSelect }: any) {
  const price = useDynamicPrice(tier.price)
  const priceDisplay = usePriceDisplay(tier.price, { format: 'full' })
  
  return (
    <div 
      onClick={() => onSelect(tier.id)}
      className={`relative p-6 rounded-2xl cursor-pointer transition-all duration-300 ${
        isSelected 
          ? 'ring-4 ring-purple-500 transform scale-105' 
          : 'hover:transform hover:scale-105 hover:shadow-xl'
      }`}
    >
      {/* Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${tier.color} opacity-10 rounded-2xl`} />
      
      {/* Content */}
      <div className="relative">
        <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
        
        {/* Price */}
        <div className="mb-4">
          <p className="text-3xl font-bold">
            {formatSolAmount(tier.price)}
          </p>
          {price.usd && (
            <p className="text-lg text-gray-600 dark:text-gray-400">
              ≈ {formatUsdAmount(price.usd)}
              <span className="text-sm"> /{tier.duration}</span>
            </p>
          )}
        </div>
        
        {/* Features */}
        <ul className="space-y-2 mb-4">
          {tier.features.map((feature: string, index: number) => (
            <li key={index} className="flex items-start gap-2">
              <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
        
        {/* Fee Breakdown */}
        {isSelected && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm font-semibold mb-2">Распределение платежа:</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Создателю (90%):</span>
                <span>{formatSolAmount(tier.price * 0.9)}</span>
              </div>
              <div className="flex justify-between">
                <span>Платформе (5%):</span>
                <span>{formatSolAmount(tier.price * 0.05)}</span>
              </div>
              <div className="flex justify-between">
                <span>Рефереру (5%):</span>
                <span>{formatSolAmount(tier.price * 0.05)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Selected Badge */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs px-3 py-1 rounded-full">
          Выбрано
        </div>
      )}
    </div>
  )
}

function SubscriptionTestContent() {
  const [selectedTier, setSelectedTier] = useState('premium')
  const [showFlashSale, setShowFlashSale] = useState(false)
  const [flashSaleDiscount, setFlashSaleDiscount] = useState(20)
  
  const selected = TEST_TIERS.find(t => t.id === selectedTier)
  const finalPrice = selected ? selected.price * (showFlashSale ? (1 - flashSaleDiscount / 100) : 1) : 0
  const dynamicPrice = useDynamicPrice(finalPrice)
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/test/pricing"
            className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Назад к дашборду
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Тест динамических цен: Подписки
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Проверка отображения цен в разных валютах для подписок
          </p>
        </div>

        {/* Creator Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full" />
            <div>
              <h2 className="text-2xl font-bold">{TEST_CREATOR.name}</h2>
              <p className="text-gray-600 dark:text-gray-400">@{TEST_CREATOR.username}</p>
              <div className="flex gap-4 mt-2 text-sm">
                <span>{TEST_CREATOR.subscribersCount} подписчиков</span>
                <span>{TEST_CREATOR.postsCount} постов</span>
              </div>
            </div>
          </div>
        </div>

        {/* Flash Sale Toggle */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Flash Sale Симуляция</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showFlashSale}
                onChange={(e) => setShowFlashSale(e.target.checked)}
                className="w-5 h-5 text-purple-600 rounded"
              />
              <span>Включить скидку</span>
            </label>
          </div>
          
          {showFlashSale && (
            <div>
              <label className="block text-sm font-medium mb-2">Размер скидки (%)</label>
              <input
                type="range"
                min="10"
                max="90"
                value={flashSaleDiscount}
                onChange={(e) => setFlashSaleDiscount(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-sm mt-1">
                <span>10%</span>
                <span className="font-bold text-purple-600">{flashSaleDiscount}%</span>
                <span>90%</span>
              </div>
            </div>
          )}
        </div>

        {/* Subscription Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {TEST_TIERS.map(tier => (
            <SubscriptionTier
              key={tier.id}
              tier={{
                ...tier,
                price: showFlashSale ? tier.price * (1 - flashSaleDiscount / 100) : tier.price
              }}
              isSelected={selectedTier === tier.id}
              onSelect={setSelectedTier}
            />
          ))}
        </div>

        {/* Payment Summary */}
        {selected && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4">Итоговая информация</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-700">
                <span>Выбранный тариф:</span>
                <span className="font-semibold">{selected.name}</span>
              </div>
              
              {showFlashSale && (
                <>
                  <div className="flex justify-between items-center">
                    <span>Оригинальная цена:</span>
                    <span className="line-through text-gray-500">{formatSolAmount(selected.price)}</span>
                  </div>
                  <div className="flex justify-between items-center text-green-600">
                    <span>Скидка {flashSaleDiscount}%:</span>
                    <span>-{formatSolAmount(selected.price * flashSaleDiscount / 100)}</span>
                  </div>
                </>
              )}
              
              <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                <span className="text-lg font-semibold">К оплате:</span>
                <div className="text-right">
                  <p className="text-2xl font-bold">{dynamicPrice.displayPrice}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Источник курса: {dynamicPrice.source}
                  </p>
                </div>
              </div>
            </div>
            
            <button className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity">
              Тестовая оплата {formatSolAmount(finalPrice)}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SubscriptionPricingTest() {
  return (
    <PricingProvider>
      <SubscriptionTestContent />
    </PricingProvider>
  )
} 