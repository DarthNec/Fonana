import React from 'react'
import { APP_VERSION } from '@/lib/version'

export default function Footer() {
  return (
    <footer className="fixed bottom-0 right-0 p-2 text-xs text-gray-400 z-50">
      <span className="opacity-50 hover:opacity-100 transition-opacity">
        v{APP_VERSION}
      </span>
    </footer>
  )
} 