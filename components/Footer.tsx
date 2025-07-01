import React from 'react'

// Статический импорт версии для правильной работы в production
let APP_VERSION = 'dev'
try {
  const { APP_VERSION: VERSION } = require('@/lib/version')
  APP_VERSION = VERSION
} catch {
  // В режиме разработки файл может не существовать
}

export default function Footer() {
  return (
    <footer className="fixed bottom-0 right-0 p-2 text-xs text-gray-400 z-50">
      <span className="opacity-50 hover:opacity-100 transition-opacity">
        v{APP_VERSION}
      </span>
    </footer>
  )
} 