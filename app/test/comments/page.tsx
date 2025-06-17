'use client'

import { useState } from 'react'

export default function CommentsTestPage() {
  const [postId, setPostId] = useState('test-post-123')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">Comments Test Page</h1>
        
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Comments functionality has been integrated directly into PostCard component.
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            Visit the feed page to test comments on real posts.
          </p>
        </div>
      </div>
    </div>
  )
} 