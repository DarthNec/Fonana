'use client'

import { useState, useEffect } from 'react'
import Avatar from './Avatar'
import { 
  CheckIcon,
  SparklesIcon,
  CurrencyDollarIcon,
  HeartIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { CheckBadgeIcon } from '@heroicons/react/24/solid'
import { useWallet } from '@solana/wallet-adapter-react'
import { toast } from 'react-hot-toast'
import { 
  createSubscriptionTransaction, 
  calculatePaymentDistribution,
  formatSolAmount 
} from '@/lib/solana/payments'
import { isValidSolanaAddress } from '@/lib/solana/config'
import { connection } from '@/lib/solana/connection'

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

interface SubscribeModalProps {
  creator: {
    id: number | string
    name: string
    username: string
    avatar: string
    description?: string
    isVerified?: boolean
    subscribers?: number
    posts?: number
    category?: string
  }
  preferredTier?: string
  onClose: () => void
  onSuccess?: () => void
}

const getSubscriptionTiers = (creatorCategory?: string): SubscriptionTier[] => {
  const baseTiers = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      currency: 'SOL',
      duration: 'forever',
      description: 'Free subscription',
      features: [
        'Access to free posts',
        'Like and comment ability',
        'New content notifications'
      ],
      color: 'from-gray-400 to-slate-600'
    },
    {
      id: 'basic',
      name: 'Basic',
      price: 0.05,
      currency: 'SOL',
      duration: 'month',
      description: 'Basic subscription',
      features: [
        'All Free features',
        'Access to basic content',
        'Community chat participation'
      ],
      color: 'from-blue-400 to-cyan-600'
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 0.20,
      currency: 'SOL',
      duration: 'month',
      description: 'Premium subscription',
      features: [
        'All Basic features',
        'Access to premium content',
        'Priority support',
        'Early access to new content'
      ],
      popular: true,
      color: 'from-purple-500 to-pink-600'
    },
    {
      id: 'vip',
      name: 'VIP',
      price: 0.40,
      currency: 'SOL',
      duration: 'month',
      description: 'VIP subscription',
      features: [
        'All Premium features',
        'Access to VIP content',
        'Personal communication with author',
        'Exclusive bonuses'
      ],
      color: 'from-yellow-400 to-orange-500'
    }
  ]

  return baseTiers
}

export default function SubscribeModal({ creator, preferredTier, onClose, onSuccess }: SubscribeModalProps) {
  const { connected, publicKey, sendTransaction } = useWallet()
  const [subscriptionTiers, setSubscriptionTiers] = useState<SubscriptionTier[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTier, setSelectedTier] = useState(preferredTier || 'basic')
  const [showInCarousel, setShowInCarousel] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [expandedTiers, setExpandedTiers] = useState<Set<string>>(new Set())

  const selectedSubscription = subscriptionTiers.find(tier => tier.id === selectedTier)

  useEffect(() => {
    // Block scroll when modal is open
    document.body.style.overflow = 'hidden'
    // Load custom tier settings
    loadCreatorTierSettings()
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const loadCreatorTierSettings = async () => {
    try {
      const response = await fetch(`/api/user/tier-settings?creatorId=${creator.id}`)
      if (response.ok) {
        const data = await response.json()
        const settings = data.settings
        
        // Конвертируем настройки в формат тиров
        const customTiers: SubscriptionTier[] = []
        
        // Free tier (всегда есть)
        customTiers.push({
          id: 'free',
          name: 'Free',
          price: 0,
          currency: 'SOL',
          duration: 'forever',
          description: 'Free subscription',
          features: ['Access to free posts', 'Like and comment ability', 'New content notifications'],
          color: 'from-gray-400 to-slate-600'
        })
        
        // Basic tier
        if (settings.basicTier && settings.basicTier.enabled !== false) {
          const basicFeatures = settings.basicTier.features
            ?.filter((f: any) => f.enabled)
            .map((f: any) => f.text) || []
          
          customTiers.push({
            id: 'basic',
            name: 'Basic',
            price: settings.basicTier.price || 0.05,
            currency: 'SOL',
            duration: 'month',
            description: settings.basicTier.description || 'Basic subscription',
            features: basicFeatures.length > 0 ? basicFeatures : ['Access to basic content'],
            color: 'from-blue-400 to-cyan-600'
          })
        }
        
        // Premium tier
        if (settings.premiumTier && settings.premiumTier.enabled !== false) {
          const premiumFeatures = settings.premiumTier.features
            ?.filter((f: any) => f.enabled)
            .map((f: any) => f.text) || []
          
          customTiers.push({
            id: 'premium',
            name: 'Premium',
            price: settings.premiumTier.price || 0.20,
            currency: 'SOL',
            duration: 'month',
            description: settings.premiumTier.description || 'Premium subscription',
            features: premiumFeatures.length > 0 ? premiumFeatures : ['Access to premium content'],
            popular: true,
            color: 'from-purple-500 to-pink-600'
          })
        }
        
        // VIP tier
        if (settings.vipTier && settings.vipTier.enabled !== false) {
          const vipFeatures = settings.vipTier.features
            ?.filter((f: any) => f.enabled)
            .map((f: any) => f.text) || []
          
          customTiers.push({
            id: 'vip',
            name: 'VIP',
            price: settings.vipTier.price || 0.40,
            currency: 'SOL',
            duration: 'month',
            description: settings.vipTier.description || 'VIP subscription',
            features: vipFeatures.length > 0 ? vipFeatures : ['Exclusive VIP content'],
            color: 'from-yellow-400 to-orange-500'
          })
        }
        
        setSubscriptionTiers(customTiers)
        
        // Set default selected tier
        if (!preferredTier && customTiers.length > 1) {
          setSelectedTier(customTiers[1].id) // Select first paid tier
        }
      } else {
        // Fallback to default tiers
        setSubscriptionTiers(getSubscriptionTiers(creator.category))
      }
    } catch (error) {
      console.error('Error loading creator tier settings:', error)
      // Fallback to default tiers
      setSubscriptionTiers(getSubscriptionTiers(creator.category))
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async () => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet')
      return
    }

    const selectedSubscription = subscriptionTiers.find(tier => tier.id === selectedTier)
    if (!selectedSubscription || selectedSubscription.price === 0) {
      // For free subscription use old logic
      if (selectedSubscription?.price === 0) {
        await handleFreeSubscription()
        return
      }
      toast.error('Please select a subscription plan')
      return
    }

    setIsProcessing(true)
    
    try {
      // Check that it's not the platform wallet
      const PLATFORM_WALLET = 'npzAZaN9fDMgLV63b3kv3FF8cLSd8dQSLxyMXASA5T4'
      if (publicKey.toBase58() === PLATFORM_WALLET) {
        toast.error('❌ You cannot subscribe from the platform wallet!')
        return
      }

      // Get full creator data
      const creatorResponse = await fetch(`/api/creators/${creator.id}`)
      const creatorData = await creatorResponse.json()
      
      if (!creatorData.creator) {
        throw new Error('Creator not found')
      }

      const creatorWallet = creatorData.creator.solanaWallet || creatorData.creator.wallet
      if (!creatorWallet || !isValidSolanaAddress(creatorWallet)) {
        toast.error('Creator wallet not configured')
        return
      }

      // Check that creator is not subscribing to themselves
      if (creatorWallet === publicKey.toBase58()) {
        toast.error('You cannot subscribe to yourself')
        return
      }

      // Determine referrer presence
      const referrerWallet = creatorData.creator.referrer?.solanaWallet || creatorData.creator.referrer?.wallet
      const hasReferrer = creatorData.creator.referrerId && referrerWallet && isValidSolanaAddress(referrerWallet)

      // Calculate payment distribution
      const distribution = calculatePaymentDistribution(
        selectedSubscription.price,
        creatorWallet,
        hasReferrer,
        referrerWallet
      )

      // Create transaction
      const transaction = await createSubscriptionTransaction(
        publicKey,
        distribution
      )

      // Send transaction
      let signature: string = ''
      const sendOptions = {
        skipPreflight: false,
        preflightCommitment: 'confirmed' as any,
        maxRetries: 3
      }
      
      // Get fresh blockhash right before sending
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      transaction.recentBlockhash = blockhash
      ;(transaction as any).lastValidBlockHeight = lastValidBlockHeight
      
      signature = await sendTransaction(transaction, connection, sendOptions)
      
      toast.loading('Waiting for blockchain confirmation...')
      
      // Give transaction time to get into the network
      await new Promise(resolve => setTimeout(resolve, 5000))

      // Process payment on backend
      const response = await fetch('/api/subscriptions/process-payment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-wallet': publicKey.toBase58()
        },
        body: JSON.stringify({
          creatorId: creator.id,
          plan: selectedSubscription.name,
          price: selectedSubscription.price,
          signature,
          hasReferrer,
          distribution
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error processing payment')
      }
      
      toast.success(`Successfully subscribed to ${creator.name}!`)
      
      // Вызываем callback успеха
      if (onSuccess) {
        onSuccess()
      }
      
      // Принудительно обновляем страницу через небольшую задержку
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      console.error('Error subscribing:', error)
      
      let errorMessage = 'Error processing subscription'
      
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          errorMessage = 'You cancelled the transaction'
        } else if (error.message.includes('insufficient')) {
          errorMessage = 'Insufficient funds in wallet'
        } else if (error.message.includes('Transaction not confirmed')) {
          errorMessage = 'Transaction was not confirmed. Please try again'
        } else if (error.message.includes('block height exceeded')) {
          errorMessage = 'Transaction expired. Please try again'
        } else {
          errorMessage = error.message
        }
      }
      
      toast.error(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle free subscription (old logic)
  const handleFreeSubscription = async () => {
    setIsProcessing(true)
    
    try {
      // Get current user ID
      const userResponse = await fetch(`/api/user?wallet=${publicKey!.toString()}`)
      let userData = await userResponse.json()
      
      // If user not found, create new user
      if (!userResponse.ok || !userData.user) {
        console.log('User not found, creating new user...')
        
        const createUserResponse = await fetch('/api/user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            wallet: publicKey!.toString()
          })
        })
        
        if (!createUserResponse.ok) {
          throw new Error('Failed to create user')
        }
        
        userData = await createUserResponse.json()
        
        if (!userData.user) {
          throw new Error('User creation failed')
        }
      }

      // Create free subscription
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData.user.id,
          creatorId: String(creator.id),
          plan: 'Free',
          price: 0,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Subscription creation failed:', error)
        throw new Error(error.error || 'Error creating subscription')
      }
      
      toast.success(`You have successfully subscribed to ${creator.name}!`)
      onSuccess?.()
      
      // Принудительно обновляем страницу через небольшую задержку
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      console.error('Error subscribing:', error)
      toast.error(error instanceof Error ? error.message : 'Error processing subscription')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl border border-slate-700/50 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50 p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar
              src={creator.avatar}
              alt={creator.name}
              seed={creator.username}
              size={48}
              rounded="xl"
              className="border-2 border-purple-500/30"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">
                  Subscription to {creator.name}
                </h2>
                {creator.isVerified && (
                  <CheckBadgeIcon className="w-5 h-5 text-blue-400" />
                )}
              </div>
              <p className="text-slate-400 text-sm">@{creator.username}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Description */}
          {creator.description && (
            <p className="text-slate-300 text-lg mb-8 text-center max-w-3xl mx-auto">
              {creator.description}
            </p>
          )}

          {/* Subscription Tiers */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-center mb-6">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Choose subscription type
              </span>
            </h3>
            
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {subscriptionTiers.map((tier) => {
                  const isSelected = selectedTier === tier.id
                  const isExpanded = expandedTiers.has(tier.id)
                  const visibleFeatures = isExpanded ? tier.features : tier.features.slice(0, 3)
                  const hasMoreFeatures = tier.features.length > 3
                  
                  return (
                    <div
                      key={tier.id}
                      className={`relative border-2 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-105 bg-slate-800/50 backdrop-blur-sm p-4 ${
                        isSelected 
                          ? tier.id === 'free'
                            ? 'border-slate-500 shadow-xl shadow-slate-500/25'
                            : tier.id === 'basic'
                              ? 'border-blue-500 shadow-xl shadow-blue-500/25'
                              : tier.id === 'vip'
                                ? 'border-yellow-500 shadow-xl shadow-yellow-500/25'
                                : 'border-purple-500 shadow-xl shadow-purple-500/25'
                          : 'border-slate-600/50 hover:border-slate-500/50'
                      } ${tier.popular ? 'ring-2 ring-purple-500/50' : ''}`}
                      onClick={() => setSelectedTier(tier.id)}
                    >
                    {tier.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-full text-xs font-bold">
                          Popular
                        </span>
                      </div>
                    )}

                    <div className="text-center mb-4">
                      <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-r ${tier.color} flex items-center justify-center`}>
                        {tier.id === 'free' && <HeartIcon className="w-6 h-6 text-white" />}
                        {tier.id === 'basic' && <CurrencyDollarIcon className="w-6 h-6 text-white" />}
                        {tier.id === 'premium' && <SparklesIcon className="w-6 h-6 text-white" />}
                        {tier.id === 'vip' && <HeartIcon className="w-6 h-6 text-white" />}
                      </div>
                      <h4 className="text-lg font-bold text-white mb-1">
                        {tier.name}
                      </h4>
                      <p className="text-slate-400 text-sm mb-3">
                        {tier.description}
                      </p>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-3xl font-bold text-white">
                          {tier.price}
                        </span>
                        <span className="text-lg text-purple-400 font-semibold">
                          {tier.currency}
                        </span>
                        <span className="text-slate-400 text-sm">
                          /{tier.duration}
                        </span>
                      </div>
                      {/* Показываем распределение платежа для платных планов */}
                      {tier.price > 0 && isSelected && (
                        <div className="mt-2 text-xs text-slate-400 space-y-1">
                          <p>Creator: {formatSolAmount(tier.price * 0.9)}</p>
                          <p>Platform: {formatSolAmount(tier.price * 0.1)}</p>
                        </div>
                      )}
                    </div>

                    <ul className="space-y-2">
                      {visibleFeatures.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckIcon className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span className="text-slate-300 text-sm">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                    
                    {hasMoreFeatures && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpandedTiers(prev => {
                            const newSet = new Set(prev)
                            if (newSet.has(tier.id)) {
                              newSet.delete(tier.id)
                            } else {
                              newSet.add(tier.id)
                            }
                            return newSet
                          })
                        }}
                        className="mt-3 text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
                      >
                        {isExpanded ? 'Show less' : `+${tier.features.length - 3} more features`}
                      </button>
                    )}
                  </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Carousel Option */}
          <div className="mb-6 p-4 bg-purple-900/20 rounded-xl border border-purple-500/30">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showInCarousel}
                onChange={(e) => setShowInCarousel(e.target.checked)}
                className="mt-1 w-5 h-5 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500"
              />
              <div>
                <div className="font-semibold text-white">
                  Show in subscription carousel
                </div>
                <p className="text-slate-400 text-sm mt-1">
                  {creator.name} will be displayed in your subscription carousel on the authors page
                </p>
              </div>
            </label>
          </div>

          {/* Subscribe Button */}
          <div className="flex gap-4">
            <button
              onClick={handleSubscribe}
              disabled={isProcessing || !connected}
              className={`flex-1 py-4 px-8 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 text-white ${
                selectedTier === 'free'
                  ? 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700'
                  : selectedTier === 'basic'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700'
                  : selectedTier === 'vip'
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-orange-600 hover:to-orange-700'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
              } shadow-xl disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isProcessing ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </div>
              ) : !connected ? (
                'Connect Wallet'
              ) : (
                selectedSubscription?.price === 0 
                  ? 'Subscribe for free'
                  : `Pay ${formatSolAmount(selectedSubscription?.price || 0)} per ${selectedSubscription?.duration}`
              )}
            </button>
            
            <button
              onClick={onClose}
              className="px-8 py-4 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 rounded-xl hover:bg-slate-700/50 transition-all font-semibold text-lg"
            >
              Cancel
            </button>
          </div>

          <p className="mt-4 text-slate-400 text-center text-sm">
            Subscription automatically renews every month. You can cancel at any time.
          </p>
        </div>
      </div>
    </div>
  )
} 