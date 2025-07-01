import React from 'react'
import { APP_VERSION } from '@/lib/version'
import { RocketLaunchIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="fixed bottom-0 right-0 p-2 text-xs z-50">
      <Link href="/version-check" className="block">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-1">
          <RocketLaunchIcon className="w-3 h-3" />
          <span>v{APP_VERSION}</span>
        </div>
      </Link>
    </footer>
  )
} 