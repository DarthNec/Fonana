'use client'

import { notFound, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Avatar from '@/components/Avatar'
import dynamic from 'next/dynamic'
import { 
  CheckIcon,
  SparklesIcon,
  CurrencyDollarIcon,
  HeartIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { CheckBadgeIcon } from '@heroicons/react/24/solid'
import { toast } from 'react-hot-toast'
import { useUserContext } from '@/lib/contexts/UserContext'
import { getProfileLink } from '@/lib/utils/links'

// Динамический импорт SubscriptionPayment для избежания проблем с SSR
const SubscriptionPayment = dynamic(
  () => import('@/components/SubscriptionPayment').then(mod => mod.SubscriptionPayment),
  { 
    ssr: false,
    loading: () => (
      <div className="text-center py-8">
        <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-400">Loading payment system...</p>
      </div>
    )
  }
)

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

const getSubscriptionTiers = (creatorCategory?: string): SubscriptionTier[] => {
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

  return baseTiers
}

export default function SubscribePage({ params }: SubscribePageProps) {
  const router = useRouter()
  const { user } = useUserContext()
  const [creator, setCreator] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [selectedTier, setSelectedTier] = useState('premium')
  const [showInCarousel, setShowInCarousel] = useState(true)

  useEffect(() => {
    loadCreatorData()
  }, [params.id, user])

  const loadCreatorData = async () => {
    try {
      setIsLoading(true)
      
      // Load creator data
      const creatorResponse = await fetch(`/api/user?id=${params.id}`)
      if (!creatorResponse.ok) {
        throw new Error('Creator not found')
      }
      
      const creatorData = await creatorResponse.json()
      const creatorInfo = {
        ...creatorData.user,
        followersCount: creatorData.user._count?.followers || 0,
        followingCount: creatorData.user._count?.follows || 0,
        postsCount: creatorData.user._count?.posts || 0
      }
      setCreator(creatorInfo)

      // Check subscription status
      if (user) {
        const subResponse = await fetch(`/api/subscriptions/check?userId=${user.id}&creatorId=${params.id}`)
        if (subResponse.ok) {
          const subData = await subResponse.json()
          setIsSubscribed(subData.isSubscribed)
          
          if (subData.isSubscribed) {
            // Redirect to creator page if already subscribed
            router.push(getProfileLink({ id: creatorInfo.id, nickname: creatorInfo.nickname }))
          }
        }
      }
    } catch (error) {
      console.error('Error loading creator:', error)
      toast.error('Creator not found')
      router.push('/creators')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 pt-32 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!creator) {
    notFound()
  }

  const subscriptionTiers = getSubscriptionTiers()
  const selectedSubscription = subscriptionTiers.find(tier => tier.id === selectedTier)

  // Prepare data for SubscriptionPayment component
  const hasReferrer = !!creator.referrerId && !!creator.referrer
  const referrerWallet = creator.referrer?.solanaWallet || creator.referrer?.wallet

  return (
    <div className="min-h-screen bg-slate-900 pt-24">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link 
              href={getProfileLink({ id: creator.id, nickname: creator.nickname })}
              className="text-slate-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              Back to Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Creator Info */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8 shadow-xl mb-8">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-purple-500/30">
              <Avatar
                src={creator.avatar}
                alt={creator.fullName || creator.nickname}
                seed={creator.wallet}
                size={80}
                rounded="2xl"
              />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Subscribe to {creator.fullName || creator.nickname}
                </h1>
                {creator.isVerified && (
                  <CheckBadgeIcon className="w-8 h-8 text-blue-400" />
                )}
              </div>
              <p className="text-slate-300 text-lg leading-relaxed">
                {creator.bio || 'Content creator on Fonana'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="p-6 bg-slate-700/30 rounded-2xl border border-slate-600/50">
              <div className="text-3xl font-bold text-purple-400 mb-2">
                {creator.followersCount.toLocaleString()}
              </div>
              <div className="text-slate-400 font-medium">
                Subscribers
              </div>
            </div>
            <div className="p-6 bg-slate-700/30 rounded-2xl border border-slate-600/50">
              <div className="text-3xl font-bold text-blue-400 mb-2">
                {creator.postsCount}
              </div>
              <div className="text-slate-400 font-medium">
                Posts
              </div>
            </div>
            <div className="p-6 bg-slate-700/30 rounded-2xl border border-slate-600/50">
              <div className="text-3xl font-bold text-green-400 mb-2">
                @{creator.nickname}
              </div>
              <div className="text-slate-400 font-medium">
                Username
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
                    <div className={`absolute inset-0 border-2 rounded-3xl pointer-events-none shadow-xl ${borderClass}`}></div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Payment Section */}
        {selectedSubscription && creator.wallet && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8 shadow-xl">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <SparklesIcon className="w-8 h-8 text-purple-400" />
              Payment
            </h3>
            
            <SubscriptionPayment
              creatorId={creator.id}
              creatorName={creator.fullName || creator.nickname}
              creatorWallet={creator.solanaWallet || creator.wallet}
              hasReferrer={hasReferrer}
              referrerWallet={referrerWallet}
              plans={subscriptionTiers.map(tier => ({
                id: tier.id,
                name: tier.name,
                price: tier.price,
                duration: tier.duration
              }))}
            />
          </div>
        )}
      </div>
    </div>
  )
} 