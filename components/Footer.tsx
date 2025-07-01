import React from 'react'
import { APP_VERSION } from '@/lib/version'

export default function Footer() {
  return (
    <footer className="fixed bottom-0 right-0 p-2 text-xs z-50">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-lg shadow-lg animate-pulse">
        v{APP_VERSION} 🔥
      </div>
    </footer>
  )
} 