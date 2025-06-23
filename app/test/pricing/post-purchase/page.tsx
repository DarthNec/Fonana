'use client'

import { useState } from 'react'
import { PricingProvider } from '@/lib/pricing/PricingProvider'
import { useDynamicPrice, formatSolAmount, formatUsdAmount } from '@/lib/pricing/hooks/useDynamicPrice'
import Link from 'next/link'
import { LockClosedIcon, PlayIcon, PhotoIcon } from '@heroicons/react/24/solid'

// Тестовые посты с разными ценами
const TEST_POSTS = [
  {
    id: '1',
    title: 'Эксклюзивная фотосессия',
    type: 'image',
    thumbnail: '/placeholder-image.jpg',
    price: 0.02,
    creator: 'Anna Model',
    creatorAvatar: '/avatars/default.png',
    likesCount: 234,
    viewsCount: 1567,
    isPremium: true
  },
  {
    id: '2',
    title: 'Behind the Scenes видео',
    type: 'video',
    thumbnail: '/placeholder-video.jpg',
    price: 0.05,
    creator: 'Alex Creator',
    creatorAvatar: '/avatars/default.png',
    likesCount: 567,
    viewsCount: 3456,
    isPremium: true,
    duration: '10:45'
  },
  {
    id: '3',
    title: 'VIP контент пакет',
    type: 'bundle',
    thumbnail: '/placeholder-bundle.jpg',
    price: 0.15,
    creator: 'Premium Studio',
    creatorAvatar: '/avatars/default.png',
    likesCount: 890,
    viewsCount: 5678,
    isPremium: true,
    itemsCount: 25
  },
  {
    id: '4',
    title: 'Личное видео-сообщение',
    type: 'video',
    thumbnail: '/placeholder-personal.jpg',
    price: 0.5,
    creator: 'Celebrity User',
    creatorAvatar: '/avatars/default.png',
    likesCount: 1234,
    viewsCount: 8901,
    isPremium: true,
    duration: '5:30'
  }
]

function PostCard({ post, onPurchase }: any) {
  const price = useDynamicPrice(post.price)
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-200 dark:bg-gray-700">
        <div className="absolute inset-0 flex items-center justify-center">
          {post.type === 'image' && <PhotoIcon className="w-16 h-16 text-gray-400" />}
          {post.type === 'video' && <PlayIcon className="w-16 h-16 text-gray-400" />}
          {post.type === 'bundle' && (
            <div className="text-center">
              <LockClosedIcon className="w-16 h-16 text-gray-400 mx-auto" />
              <p className="text-gray-400 mt-2">{post.itemsCount} items</p>
            </div>
          )}
        </div>
        
        {/* Premium Badge */}
        {post.isPremium && (
          <div className="absolute top-2 left-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs px-3 py-1 rounded-full">
            Premium
          </div>
        )}
        
        {/* Duration for videos */}
        {post.duration && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {post.duration}
          </div>
        )}
        
        {/* Lock Overlay */}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <LockClosedIcon className="w-12 h-12 text-white" />
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        {/* Creator Info */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full" />
          <div>
            <p className="font-semibold text-sm">{post.creator}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {post.viewsCount.toLocaleString()} просмотров
            </p>
          </div>
        </div>
        
        {/* Title */}
        <h3 className="font-semibold mb-3">{post.title}</h3>
        
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <span>❤️ {post.likesCount}</span>
          <span>👁 {post.viewsCount}</span>
        </div>
        
        {/* Price & Purchase */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xl font-bold">{formatSolAmount(post.price)}</p>
              {price.usd && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  ≈ {formatUsdAmount(price.usd)}
                </p>
              )}
            </div>
            <div className="text-right text-xs text-gray-500">
              <p>Источник: {price.source}</p>
            </div>
          </div>
          
          <button
            onClick={() => onPurchase(post)}
            className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Разблокировать
          </button>
        </div>
      </div>
    </div>
  )
}

function PurchaseModal({ post, onClose }: any) {
  const price = useDynamicPrice(post.price)
  const [hasReferrer, setHasReferrer] = useState(true)
  
  const platformFee = post.price * 0.05
  const referrerFee = hasReferrer ? post.price * 0.05 : 0
  const creatorAmount = post.price - platformFee - referrerFee
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Подтверждение покупки</h2>
        
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-2">{post.title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">от {post.creator}</p>
        </div>
        
        {/* Price Breakdown */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center text-2xl font-bold">
            <span>Цена:</span>
            <span>{price.displayPrice}</span>
          </div>
          
          {price.usd && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p>Курс: 1 SOL = ${(price.usd / post.price).toFixed(2)}</p>
              <p>Источник: {price.source}</p>
            </div>
          )}
          
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="font-semibold mb-2">Распределение:</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Создателю ({hasReferrer ? '90%' : '95%'}):</span>
                <span>{formatSolAmount(creatorAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Платформе (5%):</span>
                <span>{formatSolAmount(platformFee)}</span>
              </div>
              {hasReferrer && (
                <div className="flex justify-between">
                  <span>Рефереру (5%):</span>
                  <span>{formatSolAmount(referrerFee)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Toggle Referrer */}
        <label className="flex items-center gap-2 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={hasReferrer}
            onChange={(e) => setHasReferrer(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm">Симулировать наличие реферера</span>
        </label>
        
        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Отмена
          </button>
          <button className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity">
            Оплатить {formatSolAmount(post.price)}
          </button>
        </div>
      </div>
    </div>
  )
}

function PostPurchaseTestContent() {
  const [selectedPost, setSelectedPost] = useState(null)
  const [priceMultiplier, setPriceMultiplier] = useState(1)
  
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
            Тест динамических цен: Покупка постов
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Проверка отображения цен при покупке премиум контента
          </p>
        </div>

        {/* Price Multiplier */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Тест разных цен</h3>
          <div>
            <label className="block text-sm font-medium mb-2">
              Множитель цены: x{priceMultiplier.toFixed(1)}
            </label>
            <input
              type="range"
              min="0.1"
              max="10"
              step="0.1"
              value={priceMultiplier}
              onChange={(e) => setPriceMultiplier(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-sm mt-1">
              <span>x0.1</span>
              <span>x10</span>
            </div>
          </div>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TEST_POSTS.map(post => (
            <PostCard
              key={post.id}
              post={{
                ...post,
                price: post.price * priceMultiplier
              }}
              onPurchase={setSelectedPost}
            />
          ))}
        </div>

        {/* Custom Price Test */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Тест кастомной цены</h3>
          <CustomPriceTest />
        </div>
      </div>

      {/* Purchase Modal */}
      {selectedPost && (
        <PurchaseModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </div>
  )
}

function CustomPriceTest() {
  const [customPrice, setCustomPrice] = useState(1)
  const price = useDynamicPrice(customPrice)
  
  return (
    <div>
      <div className="flex gap-4 mb-4">
        <input
          type="number"
          value={customPrice}
          onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)}
          step="0.01"
          min="0"
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
          placeholder="Введите цену в SOL"
        />
        <button className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
          Тест
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">SOL</p>
          <p className="text-xl font-bold">{formatSolAmount(customPrice)}</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">USD</p>
          <p className="text-xl font-bold">
            {price.usd ? formatUsdAmount(price.usd) : 'N/A'}
          </p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">Отображение</p>
          <p className="text-lg font-semibold">{price.displayPrice}</p>
        </div>
      </div>
    </div>
  )
}

export default function PostPurchasePricingTest() {
  return (
    <PricingProvider>
      <PostPurchaseTestContent />
    </PricingProvider>
  )
} 