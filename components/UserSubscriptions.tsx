'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Avatar from './Avatar'
import { useUser } from '@/lib/hooks/useUser'
import { useWallet } from '@solana/wallet-adapter-react'
import {
  CheckBadgeIcon,
  CreditCardIcon,
  CalendarIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  SparklesIcon,
  UserIcon
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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [selectedUpgrade, setSelectedUpgrade] = useState<Subscription | null>(null)

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
        fetchSubscriptions() // Refresh the list
      } else {
        toast.error('Error cancelling subscription')
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      toast.error('Error cancelling subscription')
    }
  }

  const handleUpgradeTier = async (subscriptionId: string, newTier: string, newPrice: number) => {
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan: newTier,
          price: newPrice
        })
      })

      if (response.ok) {
        toast.success(`Subscription upgraded to ${newTier}`)
        fetchSubscriptions()
        setShowUpgradeModal(false)
        setSelectedUpgrade(null)
      } else {
        toast.error('Error upgrading subscription')
      }
    } catch (error) {
      console.error('Error upgrading subscription:', error)
      toast.error('Error upgrading subscription')
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
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8">
        <div className="text-center text-slate-400">
          Loading subscriptions...
        </div>
      </div>
    )
  }

  if (subscriptions.length === 0) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8">
        <div className="text-center">
          <SparklesIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">You don't have any active subscriptions</h3>
          <p className="text-slate-400">Explore creators and subscribe to interesting content</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8">
        <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
            <CreditCardIcon className="w-5 h-5 text-white" />
          </div>
          My Subscriptions
        </h2>

        <div className="space-y-4">
          {subscriptions.map((subscription) => {
            const daysLeft = getDaysLeft(subscription.validUntil)
            const isExpiringSoon = daysLeft <= 7
            
            return (
              <div
                key={subscription.id}
                className="bg-slate-700/30 rounded-2xl p-6 hover:bg-slate-700/50 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <Link 
                    href={`/creator/${subscription.creator.id}`}
                    className="flex-shrink-0 transition-transform hover:scale-105"
                  >
                    <Avatar
                      src={subscription.creator.avatar}
                      alt={subscription.creator.fullName}
                      seed={subscription.creator.nickname}
                      size={64}
                      rounded="xl"
                    />
                  </Link>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Link 
                        href={`/creator/${subscription.creator.id}`}
                        className="font-bold text-white text-lg hover:text-purple-400 transition-colors"
                      >
                        {subscription.creator.fullName || subscription.creator.nickname}
                      </Link>
                      {subscription.creator.isVerified && (
                        <CheckBadgeIcon className="w-5 h-5 text-blue-400" />
                      )}
                    </div>
                    <Link 
                      href={`/creator/${subscription.creator.id}`}
                      className="text-slate-400 text-sm mb-3 hover:text-slate-300 transition-colors inline-block"
                    >
                      @{subscription.creator.nickname}
                    </Link>

                    {/* Subscription Details */}
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                      {/* Tier Badge */}
                      <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium text-white bg-gradient-to-r ${getTierColor(subscription.plan)}`}>
                        <span>{getTierIcon(subscription.plan)}</span>
                        <span>{subscription.plan}</span>
                      </div>

                      {/* Price */}
                      <div className="flex items-center gap-1 text-slate-300">
                        <span className="font-semibold">{subscription.price}</span>
                        <span className="text-sm">{subscription.currency}/mo</span>
                      </div>

                      {/* Days Left */}
                      <div className={`flex items-center gap-2 ${isExpiringSoon ? 'text-orange-400' : 'text-slate-400'}`}>
                        <CalendarIcon className="w-4 h-4" />
                        <span className="text-sm">
                          {daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {/* View Profile */}
                      <Link
                        href={`/creator/${subscription.creator.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-xl text-sm font-medium transition-all"
                      >
                        <UserIcon className="w-4 h-4" />
                        View Profile
                      </Link>

                      {/* Upgrade/Downgrade */}
                      <button
                        onClick={() => {
                          setSelectedUpgrade(subscription)
                          setShowUpgradeModal(true)
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-xl text-sm font-medium transition-all"
                      >
                        <ArrowUpIcon className="w-4 h-4" />
                        Change Tier
                      </button>

                      {/* Cancel */}
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to cancel this subscription?')) {
                            handleUnsubscribe(subscription.id)
                          }
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl text-sm font-medium transition-all"
                      >
                        <TrashIcon className="w-4 h-4" />
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

      {/* Upgrade Modal */}
      {showUpgradeModal && selectedUpgrade && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-3xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-white mb-6">Change Subscription Tier</h3>
            
            <div className="mb-6">
              <p className="text-slate-400 mb-2">Current tier:</p>
              <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium text-white bg-gradient-to-r ${getTierColor(selectedUpgrade.plan)}`}>
                <span>{getTierIcon(selectedUpgrade.plan)}</span>
                <span>{selectedUpgrade.plan}</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {['Basic', 'Premium', 'VIP'].map((tier) => {
                if (tier.toLowerCase() === selectedUpgrade.plan.toLowerCase()) return null
                
                const price = tier === 'Basic' ? 0.05 : tier === 'Premium' ? 0.15 : 0.35
                
                return (
                  <button
                    key={tier}
                    onClick={() => handleUpgradeTier(selectedUpgrade.id, tier, price)}
                    className="w-full p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium text-white bg-gradient-to-r ${getTierColor(tier)}`}>
                        <span>{getTierIcon(tier)}</span>
                        <span>{tier}</span>
                      </div>
                      <span className="text-slate-300">
                        {price} SOL/mo
                      </span>
                    </div>
                    <ArrowUpIcon className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => {
                setShowUpgradeModal(false)
                setSelectedUpgrade(null)
              }}
              className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
} 