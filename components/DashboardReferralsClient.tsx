'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/store/appStore'
import { 
  UserGroupIcon, 
  LinkIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  UserPlusIcon,
  ShoppingCartIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import Avatar from '@/components/Avatar'
import { formatSolAmount } from '@/lib/solana/payments'

export default function DashboardReferralsClient() {
  const user = useUser()
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading] = useState(true)

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen pt-20">
        <p className="text-gray-500 dark:text-slate-400">Please sign in</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-20 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Referral Program
        </h1>
      </div>
    </div>
  )
}
