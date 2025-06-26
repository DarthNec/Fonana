'use client'

import { useEffect, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

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
      const userWallet = localStorage.getItem('userWallet')
      const shownReferrals = JSON.parse(localStorage.getItem('fonana_shown_referral_notifications') || '[]')
      
      if (!userWallet && !shownReferrals.includes(referrerFromHeader)) {
        setReferrer(referrerFromHeader)
        setShowNotification(true)
        
        // Запоминаем что показали уведомление для этого реферера
        shownReferrals.push(referrerFromHeader)
        localStorage.setItem('fonana_shown_referral_notifications', JSON.stringify(shownReferrals))
        
        // Также сохраняем в localStorage для других компонентов
        localStorage.setItem('fonana_referrer', referrerFromHeader)
        localStorage.setItem('fonana_referrer_timestamp', Date.now().toString())
      }
    }
    
    // Очищаем старые записи о показанных уведомлениях (старше 7 дней)
    const storedTimestamp = localStorage.getItem('fonana_referrer_timestamp')
    if (storedTimestamp) {
      const sevenDays = 7 * 24 * 60 * 60 * 1000
      const isExpired = Date.now() - parseInt(storedTimestamp) > sevenDays
      
      if (isExpired) {
        localStorage.removeItem('fonana_referrer')
        localStorage.removeItem('fonana_referrer_timestamp')
        localStorage.removeItem('fonana_shown_referral_notifications')
      }
    }
  }, [])

  const handleClose = () => {
    setShowNotification(false)
    // Опционально: можно добавить в localStorage флаг, что пользователь закрыл уведомление
    localStorage.setItem('fonana_referral_notification_closed', 'true')
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