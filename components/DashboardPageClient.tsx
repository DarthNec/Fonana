'use client'

import { useUser } from '@/lib/store/appStore'

export default function DashboardPageClient() {
  const user = useUser()

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen pt-20">
        <p className="text-gray-500 dark:text-slate-400">Please sign in to view dashboard</p>
      </div>
    )
  }

  if (!user.isCreator) {
    return (
      <div className="flex items-center justify-center min-h-screen pt-20">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Creator Dashboard
          </h1>
          <p className="text-gray-600 dark:text-slate-400">
            You need to be a creator to access this page
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-20 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Creator Dashboard
        </h1>
      </div>
    </div>
  )
}
