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
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
        {/* Modal */}
        <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-8 animate-scaleIn">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-3xl shadow-lg">
              🍪
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Cookie Preferences
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We use cookies to enhance your experience. Choose your preference to continue exploring Fonana.
            </p>
          </div>

          {/* Link to Cookie Policy */}
          <div className="text-center mb-6">
            <Link 
              href="/cookies" 
              className="text-purple-600 dark:text-purple-400 hover:underline font-medium text-sm inline-flex items-center gap-1"
            >
              Learn more about our cookies
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleAcceptAll}
              className="w-full px-6 py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
            >
              Accept All & Continue
            </button>
            <button
              onClick={handleAcceptEssential}
              className="w-full px-6 py-3.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-900 dark:text-white rounded-xl font-semibold transition-all"
            >
              Only Necessary Cookies
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes scaleIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </>
  )
}
