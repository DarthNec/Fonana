'use client'

import { useState, useEffect } from 'react'
import { EyeIcon, EyeSlashIcon, UserIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import Avatar from './Avatar'
import { useUser } from '@/lib/hooks/useUser'
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
  isPublicVisible?: boolean
}

export default function SubscriptionManager() {
  const { user } = useUser()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)

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
        // Add isPublicVisible property to each subscription (default true)
        const subsWithVisibility = (data.subscriptions || []).map((sub: Subscription) => ({
          ...sub,
          isPublicVisible: sub.isPublicVisible !== false
        }))
        setSubscriptions(subsWithVisibility)
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

  const toggleVisibility = async (subscriptionId: string) => {
    setSubscriptions(subs => 
      subs.map(sub => 
        sub.id === subscriptionId 
          ? { ...sub, isPublicVisible: !sub.isPublicVisible }
          : sub
      )
    )
    
    // TODO: Save visibility preference to backend
    // This would be an API call to update the subscription visibility preference
  }

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'basic': return 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
      case 'premium': return 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
      case 'vip': return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
      default: return 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
    }
  }

  const visibleSubscriptions = subscriptions.filter(sub => sub.isPublicVisible)
  const hiddenSubscriptions = subscriptions.filter(sub => !sub.isPublicVisible)

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
          <h2 className="text-2xl font-bold text-white mb-4">
            Subscription Management
          </h2>
          <p className="text-slate-400">
            You don't have any active subscriptions yet
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">
          Subscription Management
        </h2>
        <p className="text-slate-300">
          Configure which creators are displayed in your subscription carousel
        </p>
      </div>

      {/* Visible subscriptions */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
          <EyeIcon className="w-6 h-6 text-green-400" />
          Visible ({visibleSubscriptions.length})
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleSubscriptions.map(subscription => {
            const creator = subscription.creator
            if (!creator) return null

            return (
              <div key={subscription.id} className="bg-slate-700/50 border border-slate-600/50 rounded-2xl p-6 hover:border-slate-500/50 transition-all duration-300">
                <div className="flex items-start gap-4 mb-4">
                  <Avatar
                    src={creator.avatar}
                    alt={creator.fullName || creator.nickname}
                    seed={creator.nickname}
                    size={48}
                    rounded="xl"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-white">{creator.fullName || creator.nickname}</h4>
                    <p className="text-slate-400 text-sm">@{creator.nickname}</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${getTierColor(subscription.plan)}`}>
                      {subscription.plan} - {subscription.price} {subscription.currency}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    <div>Subscribed: {new Date(subscription.subscribedAt).toLocaleDateString()}</div>
                    <div>Valid until: {new Date(subscription.validUntil).toLocaleDateString()}</div>
                  </div>
                  <button
                    onClick={() => toggleVisibility(subscription.id)}
                    className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                    title="Hide from carousel"
                  >
                    <EyeSlashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Hidden subscriptions */}
      {hiddenSubscriptions.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <EyeSlashIcon className="w-6 h-6 text-red-400" />
            Hidden ({hiddenSubscriptions.length})
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {hiddenSubscriptions.map(subscription => {
              const creator = subscription.creator
              if (!creator) return null

              return (
                <div key={subscription.id} className="bg-slate-700/30 border border-slate-600/30 rounded-2xl p-6 opacity-60 hover:opacity-80 transition-all duration-300">
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar
                      src={creator.avatar}
                      alt={creator.fullName || creator.nickname}
                      seed={creator.nickname}
                      size={48}
                      rounded="xl"
                      className="grayscale"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-white">{creator.fullName || creator.nickname}</h4>
                      <p className="text-slate-400 text-sm">@{creator.nickname}</p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${getTierColor(subscription.plan)}`}>
                        {subscription.plan} - {subscription.price} {subscription.currency}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-400">
                      <div>Subscribed: {new Date(subscription.subscribedAt).toLocaleDateString()}</div>
                      <div>Valid until: {new Date(subscription.validUntil).toLocaleDateString()}</div>
                    </div>
                    <button
                      onClick={() => toggleVisibility(subscription.id)}
                      className="p-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-colors"
                      title="Show in carousel"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
} 