'use client'

import { useState, useEffect } from 'react'
import PostCard from '@/components/PostCard'
import { useUser } from '@/lib/hooks/useUser'
import { PlusIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function PostManagementTestPage() {
  const { user } = useUser()
  const [posts, setPosts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user?.wallet) {
      fetchUserPosts()
    }
  }, [user?.wallet])

  const fetchUserPosts = async () => {
    try {
      // Fetch posts for current user
      const response = await fetch(`/api/posts?creatorId=${user?.id}&userWallet=${user?.wallet}`)
      const data = await response.json()
      setPosts(data.posts || [])
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
            <p className="text-yellow-800 dark:text-yellow-200">
              Please connect your wallet to test post management features.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Post Management Test
            </h1>
            <p className="text-gray-600 dark:text-slate-400">
              Test editing and deleting your posts
            </p>
          </div>
          
          <Link
            href="/create"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105"
          >
            <PlusIcon className="w-5 h-5" />
            Create Post
          </Link>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-600 dark:text-slate-400 mt-4">Loading your posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center">
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              You haven't created any posts yet.
            </p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105"
            >
              <PlusIcon className="w-5 h-5" />
              Create Your First Post
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
              You have {posts.length} post{posts.length !== 1 ? 's' : ''}. 
              Click the three dots menu on any post to edit or delete it.
            </p>
            
            {posts.map((post) => (
              <PostCard
                key={post.id}
                {...post}
                mediaUrl={post.mediaUrl}  // Явно передаём
                thumbnail={post.thumbnail}  // Явно передаём
                showCreator={true}
                onSubscribeClick={() => {}}
                onPurchaseClick={() => {}}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 