'use client'

import { useUser } from '@/lib/store/appStore'
import { ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline'

export default function MessagesPageClient() {
  const user = useUser()

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen pt-20">
        <div className="text-center">
          <ChatBubbleLeftEllipsisIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Connect Your Wallet
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please connect your wallet to access messages
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-20 pb-20">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
          Messages
        </h1>
        <div className="text-center py-12">
          <ChatBubbleLeftEllipsisIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            No conversations yet
          </p>
        </div>
      </div>
    </div>
  )
}
