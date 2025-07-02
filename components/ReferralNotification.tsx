'use client'

import { useEffect, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { cacheManager } from '@/lib/services/CacheManager'

export default function ReferralNotification() {
  const [referrer, setReferrer] = useState<string | null>(null)
  const [showNotification, setShowNotification] = useState(false)

  useEffect(() => {
    // Проверяем meta tag ТОЛЬКО если это новая установка реферера
    const referrerFromHeader = document.querySelector('meta[name="x-fonana-referrer"]')?.getAttribute('content')
    const isNewReferral = document.querySelector('meta[name="x-is-new-referral"]')?.getAttribute('content') === 'true'
    
    // Показываем уведомление ТОЛЬКО если:
    // 1. Есть новый реферер из header (впервые установлен)
    // 2. Пользователь не залогинен
    // 3. Мы еще не показывали уведомление для этого реферера
    if (referrerFromHeader && isNewReferral) {
      const userWallet = cacheManager.get('userWallet')
      const shownReferrals = JSON.parse(cacheManager.get('fonana_shown_referral_notifications') || '[]')
      
      if (!userWallet && !shownReferrals.includes(referrerFromHeader)) {
        setReferrer(referrerFromHeader)
        setShowNotification(true)
        
        // Запоминаем что показали уведомление для этого реферера
        shownReferrals.push(referrerFromHeader)
        cacheManager.set('fonana_shown_referral_notifications', JSON.stringify(shownReferrals), 7 * 24 * 60 * 60 * 1000) // 7 дней
        
        // Также сохраняем в кеше для других компонентов
        cacheManager.set('fonana_referrer', referrerFromHeader, 7 * 24 * 60 * 60 * 1000) // 7 дней
        cacheManager.set('fonana_referrer_timestamp', Date.now().toString(), 7 * 24 * 60 * 60 * 1000) // 7 дней
      }
    }
    
    // Очищаем старые записи о показанных уведомлениях (TTL обрабатывается автоматически)
    const storedTimestamp = cacheManager.get('fonana_referrer_timestamp')
    if (typeof storedTimestamp === 'string') {
      const sevenDays = 7 * 24 * 60 * 60 * 1000
      const isExpired = Date.now() - parseInt(storedTimestamp) > sevenDays
      
      if (isExpired) {
        cacheManager.delete('fonana_referrer')
        cacheManager.delete('fonana_referrer_timestamp')
        cacheManager.delete('fonana_shown_referral_notifications')
      }
    }
  }, [])

  const handleClose = () => {
    setShowNotification(false)
    // Опционально: можно добавить в кеш флаг, что пользователь закрыл уведомление
    cacheManager.set('fonana_referral_notification_closed', 'true', 24 * 60 * 60 * 1000) // 24 часа
  }

  if (!showNotification || !referrer) return null

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 p-4 z-50 animate-slide-up">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            Welcome to Fonana!
          </h3>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            You were invited by{' '}
            <Link 
              href={`/${referrer}`}
              className="font-semibold text-purple-600 dark:text-purple-400 hover:underline"
            >
              @{referrer}
            </Link>
            . When you sign up, they'll receive rewards for referring you.
          </p>
        </div>
        <button
          onClick={handleClose}
          className="ml-3 text-gray-400 hover:text-gray-500 dark:text-slate-500 dark:hover:text-slate-400"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
} 