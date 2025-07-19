'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/store/appStore'
import toast from 'react-hot-toast'

export default function AdminReferralsClient() {
  const user = useUser()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const isAdmin = user?.wallet === 'EEqsmopVfTuaiJrh8xL7ZsZbUctckY6S5WyHYR66wjpw' || 
                  user?.wallet === 'DUxkXhMWuo76ofUMtFRZtL8zmVqQnb8twLeB5NcaM4cG'

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen pt-20">
        <p className="text-gray-500 dark:text-slate-400">Please sign in</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen pt-20">
        <p className="text-red-500">Access denied. Admin only.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-20 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Referral Management
        </h1>
      </div>
    </div>
  )
}
