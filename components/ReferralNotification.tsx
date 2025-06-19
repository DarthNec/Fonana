'use client'

import { useEffect, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function ReferralNotification() {
  const [referrer, setReferrer] = useState<string | null>(null)
  const [showNotification, setShowNotification] = useState(false)

  useEffect(() => {
    // Check for referrer in response headers (set by middleware)
    const referrerFromHeader = document.querySelector('meta[name="x-fonana-referrer"]')?.getAttribute('content')
    
    if (referrerFromHeader) {
      // Save to localStorage as fallback
      localStorage.setItem('fonana_referrer', referrerFromHeader)
      localStorage.setItem('fonana_referrer_timestamp', Date.now().toString())
      
      // Show notification if user is not logged in
      const userWallet = localStorage.getItem('userWallet')
      if (!userWallet) {
        setReferrer(referrerFromHeader)
        setShowNotification(true)
      }
    } else {
      // Check localStorage for existing referrer (within 7 days)
      const storedReferrer = localStorage.getItem('fonana_referrer')
      const storedTimestamp = localStorage.getItem('fonana_referrer_timestamp')
      
      if (storedReferrer && storedTimestamp) {
        const sevenDays = 7 * 24 * 60 * 60 * 1000
        const isExpired = Date.now() - parseInt(storedTimestamp) > sevenDays
        
        if (!isExpired) {
          const userWallet = localStorage.getItem('userWallet')
          if (!userWallet) {
            setReferrer(storedReferrer)
            // Don't show notification for stored referrers to avoid spam
          }
        } else {
          // Clean up expired referrer
          localStorage.removeItem('fonana_referrer')
          localStorage.removeItem('fonana_referrer_timestamp')
        }
      }
    }
  }, [])

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
          onClick={() => setShowNotification(false)}
          className="ml-3 text-gray-400 hover:text-gray-500 dark:text-slate-500 dark:hover:text-slate-400"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
} 