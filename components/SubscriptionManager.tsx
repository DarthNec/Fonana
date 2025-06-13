'use client'

import { useState } from 'react'
import { EyeIcon, EyeSlashIcon, UserIcon } from '@heroicons/react/24/outline'
import { getCreatorById } from '@/lib/mockData'
import Image from 'next/image'

interface Subscription {
  id: number
  creatorId: number
  subscriptionTier: string
  subscriptionPrice: string
  subscribedAt: string
  isPublicVisible: boolean
  expiresAt: string
}

// Mock data for all user subscriptions
const mockSubscriptions: Subscription[] = [
  {
    id: 1,
    creatorId: 1,
    subscriptionTier: 'Premium',
    subscriptionPrice: '1.5 SOL',
    subscribedAt: '2024-01-15',
    isPublicVisible: true,
    expiresAt: '2024-07-15'
  },
  {
    id: 2,
    creatorId: 2,
    subscriptionTier: 'Basic',
    subscriptionPrice: '0.5 SOL',
    subscribedAt: '2024-02-01',
    isPublicVisible: true,
    expiresAt: '2024-08-01'
  },
  {
    id: 3,
    creatorId: 3,
    subscriptionTier: 'VIP',
    subscriptionPrice: '3.0 SOL',
    subscribedAt: '2024-01-20',
    isPublicVisible: false,
    expiresAt: '2024-07-20'
  },
  {
    id: 4,
    creatorId: 4,
    subscriptionTier: 'Premium',
    subscriptionPrice: '2.0 SOL',
    subscribedAt: '2024-03-01',
    isPublicVisible: true,
    expiresAt: '2024-09-01'
  }
]

export default function SubscriptionManager() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(mockSubscriptions)

  const toggleVisibility = (subscriptionId: number) => {
    setSubscriptions(subs => 
      subs.map(sub => 
        sub.id === subscriptionId 
          ? { ...sub, isPublicVisible: !sub.isPublicVisible }
          : sub
      )
    )
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Basic': return 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
      case 'Premium': return 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
      case 'VIP': return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
      default: return 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
    }
  }

  const visibleSubscriptions = subscriptions.filter(sub => sub.isPublicVisible)
  const hiddenSubscriptions = subscriptions.filter(sub => !sub.isPublicVisible)

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
            const creator = getCreatorById(subscription.creatorId)
            if (!creator) return null

            return (
              <div key={subscription.id} className="bg-slate-700/50 border border-slate-600/50 rounded-2xl p-6 hover:border-slate-500/50 transition-all duration-300">
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden">
                    <Image
                      src={creator.avatar}
                      alt={creator.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white">{creator.name}</h4>
                    <p className="text-slate-400 text-sm">@{creator.username}</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${getTierColor(subscription.subscriptionTier)}`}>
                      {subscription.subscriptionTier} - {subscription.subscriptionPrice}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    <div>Subscribed: {new Date(subscription.subscribedAt).toLocaleDateString()}</div>
                    <div>Valid until: {new Date(subscription.expiresAt).toLocaleDateString()}</div>
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
              const creator = getCreatorById(subscription.creatorId)
              if (!creator) return null

              return (
                <div key={subscription.id} className="bg-slate-700/30 border border-slate-600/30 rounded-2xl p-6 opacity-60 hover:opacity-80 transition-all duration-300">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden">
                      <Image
                        src={creator.avatar}
                        alt={creator.name}
                        fill
                        className="object-cover grayscale"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white">{creator.name}</h4>
                      <p className="text-slate-400 text-sm">@{creator.username}</p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${getTierColor(subscription.subscriptionTier)}`}>
                        {subscription.subscriptionTier} - {subscription.subscriptionPrice}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-400">
                      <div>Subscribed: {new Date(subscription.subscribedAt).toLocaleDateString()}</div>
                      <div>Valid until: {new Date(subscription.expiresAt).toLocaleDateString()}</div>
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