'use client'

import { notFound } from 'next/navigation'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { 
  CheckIcon,
  SparklesIcon,
  CurrencyDollarIcon,
  LockClosedIcon,
  PlayIcon,
  PhotoIcon,
  HeartIcon
} from '@heroicons/react/24/outline'
import { CheckBadgeIcon } from '@heroicons/react/24/solid'
import { getCreatorById } from '@/lib/mockData'
import { useRouter } from 'next/navigation'

interface SubscribePageProps {
  params: {
    id: string
  }
}

interface SubscriptionTier {
  id: string
  name: string
  price: number
  currency: string
  duration: string
  description: string
  features: string[]
  popular?: boolean
  color: string
}

const getSubscriptionTiers = (creatorCategory: string): SubscriptionTier[] => {
  const baseTiers = [
    {
      id: 'basic',
      name: 'Basic',
      price: 0.05,
      currency: 'SOL',
      duration: 'month',
      description: 'Access to basic content and community',
      features: [
        'Access to public posts',
        'Community chat access',
        'Monthly live streams',
        'Basic creator interaction'
      ],
      color: 'from-gray-400 to-gray-600'
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 0.15,
      currency: 'SOL',
      duration: 'month',
      description: 'Enhanced access with exclusive content',
      features: [
        'All Basic features',
        'Exclusive premium content',
        'Weekly private streams',
        'Priority in comments',
        'Direct messaging',
        'Early access to new content'
      ],
      popular: true,
      color: 'from-indigo-500 to-purple-600'
    },
    {
      id: 'vip',
      name: 'VIP',
      price: 0.35,
      currency: 'SOL',
      duration: 'month',
      description: 'Ultimate access with personal interactions',
      features: [
        'All Premium features',
        'Personal video messages',
        'One-on-one video calls (monthly)',
        'Custom content requests',
        'Behind-the-scenes access',
        'NFT exclusive drops',
        'Personal portfolio review'
      ],
      color: 'from-yellow-400 to-orange-500'
    }
  ]

  // Customize based on creator category
  if (creatorCategory.toLowerCase().includes('intimate') || creatorCategory.toLowerCase().includes('lifestyle')) {
    baseTiers[0].features = [
      'Artistic photography access',
      'Community discussions',
      'Monthly artistic showcases',
      'Creator interaction'
    ]
    baseTiers[1].features = [
      'All Basic features',
      'Exclusive intimate photography',
      'Weekly private sessions',
      'Priority interactions',
      'Personal messages',
      'Behind-the-scenes content'
    ]
    baseTiers[2].features = [
      'All Premium features',
      'Personal artistic sessions',
      'One-on-one consultations',
      'Custom photo requests',
      'Exclusive artistic NFTs',
      'Personal style advice'
    ]
  }

  return baseTiers
}

export default function SubscribePage({ params }: SubscribePageProps) {
  const router = useRouter()
  const creatorId = parseInt(params.id)
  const creator = getCreatorById(creatorId)

  if (!creator) {
    notFound()
  }

  const subscriptionTiers = getSubscriptionTiers(creator.category)
  const [selectedTier, setSelectedTier] = useState(subscriptionTiers[1].id)
  const [showInCarousel, setShowInCarousel] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  const selectedSubscription = subscriptionTiers.find(tier => tier.id === selectedTier)

  const handleSubscribe = async () => {
    setIsProcessing(true)
    
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false)
      alert(`Successfully subscribed to ${creator.name}'s ${selectedSubscription?.name} tier!`)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-slate-900 pt-24">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link 
              href={`/creator/${creator.id}`}
              className="text-slate-400 hover:text-white transition-colors flex items-center gap-2"
            >
              ← Back to Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Creator Info */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8 shadow-xl mb-8">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-purple-500/30">
              <Image
                src={creator.avatar}
                alt={creator.name}
                width={80}
                height={80}
                className="object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Subscribe to {creator.name}
                </h1>
                {creator.isVerified && (
                  <CheckBadgeIcon className="w-8 h-8 text-blue-400" />
                )}
              </div>
              <p className="text-slate-300 text-lg leading-relaxed">
                {creator.description}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="p-6 bg-slate-700/30 rounded-2xl border border-slate-600/50">
              <div className="text-3xl font-bold text-purple-400 mb-2">
                {creator.subscribers.toLocaleString()}
              </div>
              <div className="text-slate-400 font-medium">
                Subscribers
              </div>
            </div>
            <div className="p-6 bg-slate-700/30 rounded-2xl border border-slate-600/50">
              <div className="text-3xl font-bold text-blue-400 mb-2">
                {creator.posts}
              </div>
              <div className="text-slate-400 font-medium">
                Posts
              </div>
            </div>
            <div className="p-6 bg-slate-700/30 rounded-2xl border border-slate-600/50">
              <div className="text-3xl font-bold text-green-400 mb-2">
                {creator.monthlyEarnings}
              </div>
              <div className="text-slate-400 font-medium">
                Monthly Earnings
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Tiers */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-center mb-4">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Choose Your Subscription Tier
            </span>
          </h2>
          <p className="text-slate-400 text-center text-lg mb-8">
            Select the plan that best fits your needs and unlock exclusive content
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {subscriptionTiers.map((tier) => {
              const isSelected = selectedTier === tier.id
              const borderClass = isSelected 
                ? tier.id === 'basic' 
                  ? 'border-gray-500 shadow-xl shadow-gray-500/25 scale-105'
                  : tier.id === 'vip'
                    ? 'border-yellow-500 shadow-xl shadow-yellow-500/25 scale-105'
                    : 'border-purple-500 shadow-xl shadow-purple-500/25 scale-105'
                : 'border-slate-600/50 hover:border-slate-500/50'
              
              const overlayClass = isSelected
                ? tier.id === 'basic'
                  ? 'border-gray-500 shadow-gray-500/25'
                  : tier.id === 'vip'
                    ? 'border-yellow-500 shadow-yellow-500/25'
                    : 'border-purple-500 shadow-purple-500/25'
                : ''

              return (
                <div
                  key={tier.id}
                  className={`relative border-2 rounded-3xl cursor-pointer transition-all duration-300 hover:scale-105 bg-slate-800/50 backdrop-blur-sm ${borderClass} ${tier.popular ? 'ring-2 ring-purple-500/50 pt-12 pb-8 px-8' : 'p-8'}`}
                  onClick={() => setSelectedTier(tier.id)}
                >
                  {tier.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                      <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-xl">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r ${tier.color} flex items-center justify-center shadow-lg`}>
                      {tier.id === 'basic' && <CurrencyDollarIcon className="w-8 h-8 text-white" />}
                      {tier.id === 'premium' && <SparklesIcon className="w-8 h-8 text-white" />}
                      {tier.id === 'vip' && <HeartIcon className="w-8 h-8 text-white" />}
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {tier.name}
                    </h3>
                    <p className="text-slate-400 mb-4 leading-relaxed">
                      {tier.description}
                    </p>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-white">
                        {tier.price}
                      </span>
                      <span className="text-xl text-purple-400 font-semibold">
                        {tier.currency}
                      </span>
                      <span className="text-slate-400">
                        /{tier.duration}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckIcon className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-300 leading-relaxed">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {isSelected && (
                    <div className={`absolute inset-0 border-2 rounded-3xl pointer-events-none shadow-xl ${overlayClass}`}></div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Payment Section */}
        {selectedSubscription && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8 shadow-xl">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              {selectedTier === 'basic' ? (
                <SparklesIcon className="w-8 h-8 text-gray-400" />
              ) : selectedTier === 'vip' ? (
                <SparklesIcon className="w-8 h-8 text-yellow-400" />
              ) : (
                <SparklesIcon className="w-8 h-8 text-purple-400" />
              )}
              Subscription Summary
            </h3>
            
            {/* Dynamic subscription card based on tier */}
            {selectedTier === 'basic' ? (
              <div className="flex items-center justify-between p-6 bg-gradient-to-r from-gray-500/20 to-gray-600/20 rounded-2xl border border-gray-500/30 mb-8 shadow-lg shadow-gray-500/10">
                <div>
                  <div className="font-bold text-xl text-white mb-1">
                    {selectedSubscription.name} Subscription
                  </div>
                  <div className="text-slate-300">
                    Monthly subscription to {creator.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-2xl text-gray-300">
                    {selectedSubscription.price} {selectedSubscription.currency}
                  </div>
                  <div className="text-slate-300">
                    Auto-renews monthly
                  </div>
                </div>
              </div>
            ) : selectedTier === 'vip' ? (
              <div className="flex items-center justify-between p-6 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl border border-yellow-500/30 mb-8 shadow-lg shadow-yellow-500/25">
                <div>
                  <div className="font-bold text-xl text-white mb-1">
                    {selectedSubscription.name} Subscription
                  </div>
                  <div className="text-slate-300">
                    Monthly subscription to {creator.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-2xl text-yellow-300">
                    {selectedSubscription.price} {selectedSubscription.currency}
                  </div>
                  <div className="text-slate-300">
                    Auto-renews monthly
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-6 bg-gradient-to-r from-purple-500/20 to-indigo-600/20 rounded-2xl border border-purple-500/30 mb-8 shadow-lg shadow-purple-500/25">
                <div>
                  <div className="font-bold text-xl text-white mb-1">
                    {selectedSubscription.name} Subscription
                  </div>
                  <div className="text-slate-300">
                    Monthly subscription to {creator.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-2xl text-purple-300">
                    {selectedSubscription.price} {selectedSubscription.currency}
                  </div>
                  <div className="text-slate-300">
                    Auto-renews monthly
                  </div>
                </div>
              </div>
            )}

            {/* Carousel Visibility Option */}
            <div className="mb-8 p-6 bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-2xl border border-purple-500/30">
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  id="showInCarousel"
                  checked={showInCarousel}
                  onChange={(e) => setShowInCarousel(e.target.checked)}
                  className="mt-1 w-5 h-5 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500 focus:ring-2"
                />
                <div className="flex-1">
                  <label 
                    htmlFor="showInCarousel" 
                    className="font-bold text-white cursor-pointer text-lg"
                  >
                    Show in subscription carousel
                  </label>
                  <p className="text-slate-300 mt-2 leading-relaxed">
                    If enabled, {creator.name} will appear in your subscription carousel on the creators page. 
                    You can always change this in your settings later.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              {/* Dynamic Subscribe Button based on tier */}
              {selectedTier === 'basic' ? (
                <button
                  onClick={handleSubscribe}
                  disabled={isProcessing}
                  className="flex-1 py-4 px-8 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 text-white bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 shadow-xl hover:shadow-gray-500/25 disabled:bg-slate-600 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </div>
                  ) : (
                    `Subscribe for ${selectedSubscription?.price} ${selectedSubscription?.currency}/month`
                  )}
                </button>
              ) : selectedTier === 'vip' ? (
                <button
                  onClick={handleSubscribe}
                  disabled={isProcessing}
                  className="flex-1 py-4 px-8 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 text-white bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 shadow-xl hover:shadow-yellow-500/25 disabled:bg-slate-600 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </div>
                  ) : (
                    `Subscribe for ${selectedSubscription?.price} ${selectedSubscription?.currency}/month`
                  )}
                </button>
              ) : (
                <button
                  onClick={handleSubscribe}
                  disabled={isProcessing}
                  className="flex-1 py-4 px-8 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-xl hover:shadow-purple-500/25 disabled:bg-slate-600 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </div>
                  ) : (
                    `Subscribe for ${selectedSubscription?.price} ${selectedSubscription?.currency}/month`
                  )}
                </button>
              )}
              
              <Link
                href={`/creator/${creator.id}`}
                className="px-8 py-4 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 rounded-2xl hover:bg-slate-700/50 transition-all duration-300 text-center font-semibold text-lg"
              >
                Cancel
              </Link>
            </div>

            <div className="mt-6 text-slate-400 text-center leading-relaxed">
              Your subscription will auto-renew monthly. You can cancel anytime from your dashboard.<br />
              Payments are processed securely through Solana blockchain.
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 