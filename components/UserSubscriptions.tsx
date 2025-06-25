'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Avatar from './Avatar'
import { useUser } from '@/lib/hooks/useUser'
import { useWallet } from '@solana/wallet-adapter-react'
import { getProfileLink } from '@/lib/utils/links'
import {
  CheckBadgeIcon,
  CreditCardIcon,
  CalendarIcon,
  TrashIcon,
  SparklesIcon,
  UserIcon,
  ArrowUpIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface Subscription {
  id: string
  creatorId: string
  creator: {
    id: string
    nickname: string
    fullName: string
    avatar: string
    isVerified: boolean
  }
  plan: string
  price: number
  currency: string
  subscribedAt: string
  validUntil: string
  isActive: boolean
}

export default function UserSubscriptions() {
  const { user } = useUser()
  const { publicKey } = useWallet()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSub, setSelectedSub] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchSubscriptions()
    }
  }, [user])

  const fetchSubscriptions = async () => {
    if (!user) return

    try {
      setLoading(true)
      const response = await fetch(`/api/subscriptions?userId=${user.id}`)
      const data = await response.json()
      
      if (response.ok) {
        setSubscriptions(data.subscriptions || [])
      } else {
        toast.error('Error loading subscriptions')
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
      toast.error('Error loading subscriptions')
    } finally {
      setLoading(false)
    }
  }

  const handleUnsubscribe = async (subscriptionId: string) => {
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        toast.success('Subscription cancelled')
        setSubscriptions(prevSubscriptions => 
          prevSubscriptions.filter(sub => sub.id !== subscriptionId)
        )
      } else {
        toast.error('Error cancelling subscription')
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      toast.error('Error cancelling subscription')
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'basic':
        return 'from-gray-400 to-gray-600'
      case 'premium':
        return 'from-purple-500 to-pink-500'
      case 'vip':
        return 'from-yellow-400 to-orange-500'
      default:
        return 'from-blue-400 to-cyan-400'
    }
  }

  const getTierIcon = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'basic':
        return '⭐'
      case 'premium':
        return '💎'
      case 'vip':
        return '👑'
      default:
        return '✨'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getDaysLeft = (validUntil: string) => {
    const now = new Date()
    const until = new Date(validUntil)
    const diff = Math.ceil((until.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-gray-200 dark:border-slate-700/50 rounded-3xl p-8 shadow-lg">
        <div className="text-center text-gray-600 dark:text-slate-400">
          Loading subscriptions...
        </div>
      </div>
    )
  }

  if (subscriptions.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-gray-200 dark:border-slate-700/50 rounded-3xl p-8 shadow-lg">
        <div className="text-center">
          <SparklesIcon className="w-16 h-16 text-gray-400 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">You don't have any active subscriptions</h3>
          <p className="text-gray-600 dark:text-slate-400">Explore creators and subscribe to interesting content</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border-y sm:border border-gray-200 dark:border-slate-700/50 rounded-none sm:rounded-3xl p-4 sm:p-8 shadow-lg">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-8 flex items-center gap-3">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
            <CreditCardIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          My Subscriptions
        </h2>

        <div className="space-y-2 sm:space-y-4">
          {subscriptions.map((subscription) => {
            const daysLeft = getDaysLeft(subscription.validUntil)
            const isExpiringSoon = daysLeft <= 7
            
            return (
              <div
                key={subscription.id}
                className="bg-gray-50 dark:bg-slate-700/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-all duration-300"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Avatar */}
                  <Link 
                    href={getProfileLink({ id: subscription.creator.id, nickname: subscription.creator.nickname })}
                    className="flex-shrink-0 transition-transform hover:scale-105"
                  >
                    <Avatar
                      src={subscription.creator.avatar}
                      alt={subscription.creator.fullName}
                      seed={subscription.creator.nickname}
                      size={48}
                      rounded="xl"
                    />
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link 
                        href={getProfileLink({ id: subscription.creator.id, nickname: subscription.creator.nickname })}
                        className="font-bold text-gray-900 dark:text-white text-base sm:text-lg hover:text-purple-600 dark:hover:text-purple-400 transition-colors truncate"
                      >
                        {subscription.creator.fullName || subscription.creator.nickname}
                      </Link>
                      {subscription.creator.isVerified && (
                        <CheckBadgeIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                      )}
                    </div>
                    <Link 
                      href={getProfileLink({ id: subscription.creator.id, nickname: subscription.creator.nickname })}
                      className="text-gray-600 dark:text-slate-400 text-xs sm:text-sm mb-2 sm:mb-3 hover:text-gray-700 dark:hover:text-slate-300 transition-colors inline-block"
                    >
                      @{subscription.creator.nickname}
                    </Link>

                    {/* Subscription Details */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
                      {/* Tier Badge */}
                      <div className={`inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium text-white bg-gradient-to-r ${getTierColor(subscription.plan)}`}>
                        <span>{getTierIcon(subscription.plan)}</span>
                        <span>{subscription.plan}</span>
                      </div>

                      {/* Price */}
                      <div className="flex items-center gap-1 text-gray-700 dark:text-slate-300 text-sm">
                        <span className="font-semibold">{subscription.price}</span>
                        <span className="text-xs">{subscription.currency}/mo</span>
                      </div>

                      {/* Days Left */}
                      <div className={`flex items-center gap-1 sm:gap-2 ${isExpiringSoon ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-slate-400'}`}>
                        <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="text-xs sm:text-sm">
                          {daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {/* View Profile */}
                      <Link
                        href={getProfileLink({ id: subscription.creator.id, nickname: subscription.creator.nickname })}
                        className="inline-flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-700 dark:text-blue-300 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all"
                      >
                        <UserIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">View Profile</span>
                        <span className="sm:hidden">Profile</span>
                      </Link>

                      {/* Change Tier - безопасная версия, перенаправляет на страницу создателя */}
                      {subscription.plan.toLowerCase() !== 'vip' && (
                        <Link
                          href={`${getProfileLink({ id: subscription.creator.id, nickname: subscription.creator.nickname })}#subscription-tiers`}
                          className="inline-flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-700 dark:text-purple-300 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all"
                        >
                          <ArrowUpIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Upgrade Tier</span>
                          <span className="sm:hidden">Upgrade</span>
                        </Link>
                      )}

                      {/* Cancel */}
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to cancel this subscription?')) {
                            handleUnsubscribe(subscription.id)
                          }
                        }}
                        className="inline-flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-300 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all"
                      >
                        <TrashIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
} 