'use client'

import CreatePostModal from '@/components/CreatePostModal'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/store/appStore'
import { useEffect } from 'react'

export default function CreatePostPage() {
  const router = useRouter()
  const user = useUser()

  useEffect(() => {
    // Проверяем авторизацию
    if (!user) {
      router.push('/')
      return
    }
  }, [user, router])

  const handlePostCreated = (newPost?: any) => {
    // Перенаправляем на страницу поста или дашборд
    if (newPost?.id) {
      router.push(`/post/${newPost.id}`)
    } else {
      router.push('/dashboard')
    }
  }

  const handleClose = () => {
    // Возвращаемся на предыдущую страницу или дашборд
    router.back()
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center pt-20">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Authentication Required
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Please sign in to create posts
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Create New Post
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Share your content with your audience
          </p>
        </div>

        {/* Modal-like container */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <CreatePostModal
            onClose={handleClose}
            onPostCreated={handlePostCreated}
            mode="create"
          />
        </div>
      </div>
    </div>
  )
} 