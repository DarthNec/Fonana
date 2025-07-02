'use client'

import React, { useState, useEffect } from 'react'
import { 
  SparklesIcon,
  CurrencyDollarIcon,
  HeartIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import { useUser } from '@/lib/store/appStore'

interface TierFeature {
  id: string
  text: string
  enabled: boolean
}

interface SubscriptionTier {
  id: string
  name: string
  price: number
  currency: string
  description: string
  features: TierFeature[]
  color: string
  icon: React.ComponentType<any>
  enabled: boolean
}

const defaultFeatures = {
  basic: [
    { id: 'basic-1', text: 'Access to public posts', enabled: true },
    { id: 'basic-2', text: 'Community chat participation', enabled: true },
    { id: 'basic-3', text: 'Monthly streams', enabled: true },
    { id: 'basic-4', text: 'Basic creator interaction', enabled: true },
    { id: 'basic-5', text: 'Content archive access', enabled: false },
    { id: 'basic-6', text: 'Subscriber badge', enabled: false }
  ],
  premium: [
    { id: 'premium-1', text: 'All Basic features', enabled: true },
    { id: 'premium-2', text: 'Exclusive premium content', enabled: true },
    { id: 'premium-3', text: 'Weekly private streams', enabled: true },
    { id: 'premium-4', text: 'Priority in comments', enabled: true },
    { id: 'premium-5', text: 'Private messages', enabled: true },
    { id: 'premium-6', text: 'Early access to new content', enabled: true },
    { id: 'premium-7', text: 'Merch discounts', enabled: false },
    { id: 'premium-8', text: 'Content voting', enabled: false }
  ],
  vip: [
    { id: 'vip-1', text: 'All Premium features', enabled: true },
    { id: 'vip-2', text: 'Personal video messages', enabled: true },
    { id: 'vip-3', text: 'One-on-one video calls (monthly)', enabled: true },
    { id: 'vip-4', text: 'Custom content requests', enabled: true },
    { id: 'vip-5', text: 'Behind the scenes access', enabled: true },
    { id: 'vip-6', text: 'Exclusive NFT drops', enabled: true },
    { id: 'vip-7', text: 'Personal portfolio review', enabled: false },
    { id: 'vip-8', text: 'Private event invitations', enabled: false },
    { id: 'vip-9', text: 'Shoutouts in content', enabled: false }
  ]
}

export default function SubscriptionTiersSettings() {
  const user = useUser()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tiers, setTiers] = useState<SubscriptionTier[]>([
    {
      id: 'basic',
      name: 'Basic',
      price: 0.05,
      currency: 'SOL',
      description: 'Access to basic content',
      features: [...defaultFeatures.basic],
      color: 'from-blue-400 to-cyan-600',
      icon: CurrencyDollarIcon,
      enabled: true
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 0.15,
      currency: 'SOL',
      description: 'Extended access with exclusive content',
      features: [...defaultFeatures.premium],
      color: 'from-purple-500 to-pink-600',
      icon: SparklesIcon,
      enabled: true
    },
    {
      id: 'vip',
      name: 'VIP',
      price: 0.35,
      currency: 'SOL',
      description: 'Maximum access with personal interaction',
      features: [...defaultFeatures.vip],
      color: 'from-yellow-400 to-orange-500',
      icon: HeartIcon,
      enabled: true
    }
  ])

  const [showRecommendations, setShowRecommendations] = useState(false)

  // Загружаем настройки при монтировании
  useEffect(() => {
    if (user?.wallet) {
      loadTierSettings()
    }
  }, [user?.wallet])

  const loadTierSettings = async () => {
    try {
      const response = await fetch(`/api/user/tier-settings?wallet=${user?.wallet}`)
      if (response.ok) {
        const data = await response.json()
        const settings = data.settings
        
        // Обновляем тиры из загруженных настроек
        setTiers(prev => prev.map(tier => {
          const tierKey = `${tier.id}Tier` as 'basicTier' | 'premiumTier' | 'vipTier'
          const savedTier = settings[tierKey]
          
          if (savedTier && Object.keys(savedTier).length > 0) {
            return {
              ...tier,
              enabled: savedTier.enabled ?? tier.enabled,
              price: savedTier.price ?? tier.price,
              description: savedTier.description ?? tier.description,
              features: savedTier.features ?? tier.features
            }
          }
          
          return tier
        }))
      }
    } catch (error) {
      console.error('Error loading tier settings:', error)
      toast.error('Failed to load tier settings')
    } finally {
      setLoading(false)
    }
  }

  const updateTierPrice = (tierId: string, price: number) => {
    setTiers(prev => prev.map(tier => 
      tier.id === tierId ? { ...tier, price } : tier
    ))
  }

  const updateTierDescription = (tierId: string, description: string) => {
    setTiers(prev => prev.map(tier => 
      tier.id === tierId ? { ...tier, description } : tier
    ))
  }

  const toggleTierEnabled = (tierId: string) => {
    const enabledCount = tiers.filter(t => t.enabled).length
    const tierToToggle = tiers.find(t => t.id === tierId)
    
    if (tierToToggle?.enabled && enabledCount <= 1) {
      toast.error('At least one tier must be active')
      return
    }

    setTiers(prev => prev.map(tier => 
      tier.id === tierId ? { ...tier, enabled: !tier.enabled } : tier
    ))
  }

  const toggleFeature = (tierId: string, featureId: string) => {
    setTiers(prev => prev.map(tier => 
      tier.id === tierId 
        ? {
            ...tier,
            features: tier.features.map(feature =>
              feature.id === featureId 
                ? { ...feature, enabled: !feature.enabled }
                : feature
            )
          }
        : tier
    ))
  }

  const addCustomFeature = (tierId: string, featureText: string) => {
    if (!featureText.trim()) return

    setTiers(prev => prev.map(tier => 
      tier.id === tierId 
        ? {
            ...tier,
            features: [
              ...tier.features,
              {
                id: `custom-${Date.now()}`,
                text: featureText,
                enabled: true
              }
            ]
          }
        : tier
    ))
  }

  const removeFeature = (tierId: string, featureId: string) => {
    setTiers(prev => prev.map(tier => 
      tier.id === tierId 
        ? {
            ...tier,
            features: tier.features.filter(f => f.id !== featureId)
          }
        : tier
    ))
  }

  const applyRecommendedSettings = () => {
    // Apply recommended settings for different content types
    const contentType = 'standard' // Here you can determine the author's content type
    
    if (contentType === 'standard') {
      setTiers([
        {
          ...tiers[0],
          price: 0.05,
          features: defaultFeatures.basic.map(f => ({ ...f, enabled: true })).slice(0, 4)
        },
        {
          ...tiers[1],
          price: 0.15,
          features: defaultFeatures.premium.map(f => ({ ...f, enabled: true })).slice(0, 6)
        },
        {
          ...tiers[2],
          price: 0.35,
          features: defaultFeatures.vip.map(f => ({ ...f, enabled: true })).slice(0, 7)
        }
      ])
    }
    
    toast.success('Recommended settings applied')
    setShowRecommendations(false)
  }

  const saveTiers = async () => {
    if (!user?.wallet) {
      toast.error('Please connect your wallet')
      return
    }

    setSaving(true)
    try {
      // Подготавливаем данные для сохранения
      const tierData = {
        basicTier: tiers.find(t => t.id === 'basic') ? {
          enabled: tiers.find(t => t.id === 'basic')!.enabled,
          price: tiers.find(t => t.id === 'basic')!.price,
          description: tiers.find(t => t.id === 'basic')!.description,
          features: tiers.find(t => t.id === 'basic')!.features
        } : null,
        premiumTier: tiers.find(t => t.id === 'premium') ? {
          enabled: tiers.find(t => t.id === 'premium')!.enabled,
          price: tiers.find(t => t.id === 'premium')!.price,
          description: tiers.find(t => t.id === 'premium')!.description,
          features: tiers.find(t => t.id === 'premium')!.features
        } : null,
        vipTier: tiers.find(t => t.id === 'vip') ? {
          enabled: tiers.find(t => t.id === 'vip')!.enabled,
          price: tiers.find(t => t.id === 'vip')!.price,
          description: tiers.find(t => t.id === 'vip')!.description,
          features: tiers.find(t => t.id === 'vip')!.features
        } : null
      }

      const response = await fetch(`/api/user/tier-settings?wallet=${user.wallet}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tierData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save settings')
      }

      toast.success('Tier settings saved successfully!')
    } catch (error) {
      console.error('Error saving tier settings:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save tier settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border-y sm:border border-gray-200 dark:border-slate-700/50 rounded-none sm:rounded-3xl p-4 sm:p-8 shadow-lg">
      <div className="flex items-center justify-between mb-4 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
            <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <span className="hidden sm:inline">Subscription Tier Settings</span>
          <span className="sm:hidden">Tier Settings</span>
        </h2>
        
        <button
          onClick={() => setShowRecommendations(!showRecommendations)}
          className="px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-700 dark:text-purple-300 rounded-lg sm:rounded-xl font-medium transition-all duration-300 flex items-center gap-1 sm:gap-2 text-sm"
        >
          <InformationCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Recommendations</span>
          <span className="sm:hidden">Tips</span>
        </button>
      </div>

      {/* Recommendations */}
      {showRecommendations && (
        <div className="mb-4 sm:mb-8 p-3 sm:p-6 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-xl sm:rounded-2xl">
          <h3 className="text-base sm:text-lg font-semibold text-purple-700 dark:text-purple-300 mb-2 sm:mb-4">
            Recommended settings for your content type
          </h3>
          <p className="text-sm text-purple-600 dark:text-purple-200 mb-3 sm:mb-4">
            Based on your category and content type, we recommend the following settings:
          </p>
          <ul className="space-y-2 text-sm text-purple-700 dark:text-purple-100 mb-4 sm:mb-6">
            <li className="flex items-start gap-2">
              <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
              <span>Basic (0.05 SOL): 4 core features for new subscribers</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
              <span>Premium (0.15 SOL): 6 extended features for active fans</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
              <span>VIP (0.35 SOL): 7 exclusive features for the most dedicated</span>
            </li>
          </ul>
          <button
            onClick={applyRecommendedSettings}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg sm:rounded-xl font-medium transition-all duration-300 hover:scale-105 text-sm"
          >
            Apply recommendations
          </button>
        </div>
      )}

      {/* Tiers */}
      <div className="space-y-3 sm:space-y-8">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={`border rounded-xl sm:rounded-2xl p-3 sm:p-6 transition-all duration-300 ${
              tier.enabled 
                ? 'border-gray-200 dark:border-slate-600/50 bg-gray-50 dark:bg-slate-700/30' 
                : 'border-gray-300 dark:border-slate-700/30 bg-gray-100 dark:bg-slate-800/30 opacity-60'
            }`}
          >
            {/* Tier Header */}
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r ${tier.color} rounded-lg sm:rounded-xl flex items-center justify-center`}>
                  <tier.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{tier.name}</h3>
                  <p className="text-gray-600 dark:text-slate-400 text-xs sm:text-sm">
                    {tier.enabled ? 'Active' : 'Disabled'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => toggleTierEnabled(tier.id)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${
                  tier.enabled 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                    : 'bg-gray-300 dark:bg-slate-600'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                  tier.enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {tier.enabled && (
              <>
                {/* Price and Description */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 sm:mb-2">
                      Price (SOL/month)
                    </label>
                    <input
                      type="number"
                      value={tier.price}
                      onChange={(e) => updateTierPrice(tier.id, parseFloat(e.target.value) || 0)}
                      step="0.01"
                      min="0"
                      className="w-full px-3 sm:px-4 py-2 bg-white dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600/50 rounded-lg sm:rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 sm:mb-2">
                      Description
                    </label>
                    <input
                      type="text"
                      value={tier.description}
                      onChange={(e) => updateTierDescription(tier.id, e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 bg-white dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600/50 rounded-lg sm:rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                      placeholder="Brief tier description"
                    />
                  </div>
                </div>

                {/* Features */}
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 sm:mb-3">
                    Tier features
                  </h4>
                  <div className="space-y-1.5 sm:space-y-2">
                    {tier.features.map((feature) => (
                      <div
                        key={feature.id}
                        className="flex items-center justify-between p-2 sm:p-3 bg-white dark:bg-slate-700/30 rounded-lg sm:rounded-xl group hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-all"
                      >
                        <div className="flex items-center gap-2 sm:gap-3">
                          <button
                            onClick={() => toggleFeature(tier.id, feature.id)}
                            className={`w-4 h-4 sm:w-5 sm:h-5 rounded border-2 flex items-center justify-center transition-all ${
                              feature.enabled
                                ? 'bg-purple-500 border-purple-500'
                                : 'border-gray-400 dark:border-slate-500 hover:border-purple-400'
                            }`}
                          >
                            {feature.enabled && (
                              <CheckIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                            )}
                          </button>
                          <span className={`text-xs sm:text-sm ${
                            feature.enabled ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-slate-400'
                          }`}>
                            {feature.text}
                          </span>
                        </div>
                        
                        {feature.id.startsWith('custom-') && (
                          <button
                            onClick={() => removeFeature(tier.id, feature.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded-lg transition-all"
                          >
                            <TrashIcon className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 dark:text-red-400" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Custom Feature */}
                  <div className="mt-3 sm:mt-4">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        const input = e.currentTarget.elements.namedItem('feature') as HTMLInputElement
                        if (input.value) {
                          addCustomFeature(tier.id, input.value)
                          input.value = ''
                        }
                      }}
                      className="flex gap-2"
                    >
                      <input
                        name="feature"
                        type="text"
                        placeholder="Add custom feature"
                        className="flex-1 px-3 sm:px-4 py-2 bg-white dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600/50 rounded-lg sm:rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                      />
                      <button
                        type="submit"
                        className="px-3 sm:px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-700 dark:text-purple-300 rounded-lg sm:rounded-xl transition-all duration-300"
                      >
                        <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </form>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Save Button */}
      <div className="mt-6 sm:mt-8 flex justify-end">
        <button
          onClick={saveTiers}
          disabled={saving || loading}
          className="px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg sm:rounded-xl font-bold transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/25 disabled:hover:scale-100 disabled:hover:shadow-none flex items-center gap-2 text-sm sm:text-base"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Saving...
            </>
          ) : (
            'Save tier settings'
          )}
        </button>
      </div>
    </div>
  )
} 