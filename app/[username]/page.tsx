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
      const identifier = username.startsWith('@') ? username.substring(1) : username
      
      // Check if it looks like an ID (cuid pattern) or a nickname
      // CUIDs typically start with 'c' and contain only alphanumeric characters
      const isId = identifier.match(/^[a-zA-Z0-9]{8,}$/) && !identifier.match(/^[a-z_]+[a-z0-9_]*$/i)
      
      if (isId) {
        // If it looks like an ID, redirect directly to creator page
        router.replace(`/creator/${identifier}`)
      } else {
        // Otherwise, fetch user by nickname
        fetchUserByNickname(identifier)
      }
    } else {
      notFound()
    }
  }, [username, router])

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