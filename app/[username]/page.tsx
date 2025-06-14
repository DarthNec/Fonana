'use client'

import { useEffect } from 'react'
import { useParams, useRouter, notFound } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'

export default function UserProfileShortcut() {
  const params = useParams()
  const router = useRouter()
  const username = params.username as string

  useEffect(() => {
    if (username) {
      // Remove @ symbol if present, otherwise use as is
      const nickname = username.startsWith('@') ? username.substring(1) : username
      
      // Fetch user by nickname
      fetchUserByNickname(nickname)
    } else {
      notFound()
    }
  }, [username])

  const fetchUserByNickname = async (nickname: string) => {
    try {
      const response = await fetch(`/api/user?nickname=${nickname}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.user) {
          // Redirect to the actual creator page
          router.replace(`/creator/${data.user.id}`)
        } else {
          notFound()
        }
      } else {
        notFound()
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      notFound()
    }
  }

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-slate-400">Loading profile...</p>
      </div>
    </div>
  )
} 