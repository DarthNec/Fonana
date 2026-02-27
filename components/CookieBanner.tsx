'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Проверяем, согласился ли пользователь с cookies
    const cookieConsent = localStorage.getItem('fonana_cookie_consent')
    if (!cookieConsent) {
      setShowBanner(true)
    }
  }, [])

  const handleAcceptAll = () => {
    localStorage.setItem('fonana_cookie_consent', 'all')
    setShowBanner(false)
  }

  const handleAcceptEssential = () => {
    localStorage.setItem('fonana_cookie_consent', 'essential')
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 shadow-2xl animate-slideUp">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Text */}
          <div className="flex-1 text-sm text-gray-700 dark:text-slate-300">
            <p>
              We use cookies to run this website. See our{' '}
              <Link 
                href="/cookies" 
                className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
              >
                Cookie Notice
              </Link>
              .
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={handleAcceptEssential}
              className="px-6 py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-900 dark:text-white rounded-xl font-semibold transition-all text-sm whitespace-nowrap"
            >
              ONLY NECESSARY COOKIES
            </button>
            <button
              onClick={handleAcceptAll}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold transition-all text-sm whitespace-nowrap"
            >
              ACCEPT ALL
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
