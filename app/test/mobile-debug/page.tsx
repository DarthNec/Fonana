'use client'

import { useEffect, useState } from 'react'

export default function MobileDebugPage() {
  const [info, setInfo] = useState<any>({})
  const [errors, setErrors] = useState<string[]>([])
  
  useEffect(() => {
    // Сбор информации о браузере
    const collectInfo = () => {
      try {
        const ua = navigator.userAgent
        const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua.toLowerCase())
        const isPhantom = !!(window as any).solana?.isPhantom
        const hasLocalStorage = !!window.localStorage
        const hasCookies = navigator.cookieEnabled
        
        setInfo({
          userAgent: ua,
          isMobile,
          isPhantom,
          hasLocalStorage,
          hasCookies,
          screen: {
            width: window.screen.width,
            height: window.screen.height,
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight
          },
          location: {
            href: window.location.href,
            pathname: window.location.pathname,
            search: window.location.search
          }
        })
      } catch (error: any) {
        setErrors(prev => [...prev, `Error collecting info: ${error.message}`])
      }
    }
    
    // Проверка ошибок загрузки
    window.addEventListener('error', (event) => {
      setErrors(prev => [...prev, `Global error: ${event.message}`])
    })
    
    window.addEventListener('unhandledrejection', (event) => {
      setErrors(prev => [...prev, `Unhandled rejection: ${event.reason}`])
    })
    
    collectInfo()
  }, [])
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Mobile Debug Info</h1>
        
        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 rounded-lg p-4 mb-4">
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Errors:</h2>
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, index) => (
                <li key={index} className="text-red-700 dark:text-red-300 text-sm">{error}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Browser Info */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 mb-4">
          <h2 className="text-lg font-semibold mb-4">Browser Information</h2>
          <pre className="text-xs overflow-x-auto bg-gray-100 dark:bg-slate-700 p-3 rounded">
            {JSON.stringify(info, null, 2)}
          </pre>
        </div>
        
        {/* Test Components */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Component Tests</h2>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span>Basic rendering works</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`w-4 h-4 ${info.isMobile ? 'bg-yellow-500' : 'bg-green-500'} rounded-full`}></div>
              <span>Device: {info.isMobile ? 'Mobile' : 'Desktop'}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`w-4 h-4 ${info.isPhantom ? 'bg-green-500' : 'bg-gray-400'} rounded-full`}></div>
              <span>Phantom: {info.isPhantom ? 'Installed' : 'Not detected'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 