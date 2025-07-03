'use client'

import { UserIcon } from '@heroicons/react/24/outline'

interface CreatorPageClientProps {
  creatorId: string
}

export default function CreatorPageClient({ creatorId }: CreatorPageClientProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-20 pb-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center">
          <UserIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Creator Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Loading creator #{creatorId}...
          </p>
        </div>
      </div>
    </div>
  )
}
