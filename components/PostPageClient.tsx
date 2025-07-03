'use client'

import { useUser } from '@/lib/store/appStore'
import { DocumentTextIcon } from '@heroicons/react/24/outline'

interface PostPageClientProps {
  postId: string
}

export default function PostPageClient({ postId }: PostPageClientProps) {
  const user = useUser()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-20 pb-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-8">
          <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
            Post #{postId}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-center">
            Loading post content...
          </p>
        </div>
      </div>
    </div>
  )
}
