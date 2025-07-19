'use client'

import React from 'react'
import { useUser } from '@/lib/store/appStore'

export default function ProfilePageClient() {
  const user = useUser()

  // [navbar_debug_2025_017] Временная заглушка для предотвращения infinite loop
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-20 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-20">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Profile Page (Under Maintenance)
          </h1>
          <p className="text-gray-600 dark:text-slate-400 mb-8">
            Fixing infinite loop issue. User ID: {user?.id || 'Not logged in'}
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-500">
            Will be restored after debugging navbar issues
          </p>
        </div>
      </div>
    </div>
  )
} 