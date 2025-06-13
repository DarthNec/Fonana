import { SparklesIcon, CubeIcon, FireIcon } from '@heroicons/react/24/solid'
import Image from 'next/image'

interface NFT {
  id: string
  name: string
  image: string
  tier: 'Basic' | 'Premium' | 'VIP'
  price: string
  benefits: string[]
}

const mockNFTs: NFT[] = [
  {
    id: '1',
    name: 'Exclusive Access Pass',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=300&fit=crop',
    tier: 'Basic',
    price: '0.05 SOL',
    benefits: ['Basic content access', 'Monthly updates', 'Community chat']
  },
  {
    id: '2',
    name: 'Premium Creator NFT',
    image: 'https://images.unsplash.com/photo-1634973357973-f2ed2657db3c?w=300&h=300&fit=crop',
    tier: 'Premium',
    price: '0.15 SOL',
    benefits: ['Premium content', 'Live sessions', 'Direct messages', 'Behind the scenes']
  },
  {
    id: '3',
    name: 'VIP Diamond Pass',
    image: 'https://images.unsplash.com/photo-1639762681057-408e52192e55?w=300&h=300&fit=crop',
    tier: 'VIP',
    price: '0.35 SOL',
    benefits: ['All content access', '1-on-1 calls', 'Custom content', 'NFT airdrops']
  }
]

const tierColors = {
  Basic: 'from-blue-500 to-blue-600',
  Premium: 'from-purple-500 to-purple-600',
  VIP: 'from-amber-500 to-amber-600'
}

const tierIcons = {
  Basic: CubeIcon,
  Premium: SparklesIcon,
  VIP: FireIcon
}

export default function SubscriptionNFTs() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {mockNFTs.map((nft) => {
        const Icon = tierIcons[nft.tier]
        return (
          <div key={nft.id} className="relative modern-card overflow-hidden hover:shadow-xl transition-all duration-300">
            {/* Most Popular Badge */}
            {nft.tier === 'Premium' && (
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-20">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                  Most Popular
                </div>
              </div>
            )}
            
            {/* NFT Image */}
            <div className="relative h-48 overflow-hidden">
              <Image
                src={nft.image}
                alt={nft.name}
                fill
                className="object-cover transition-transform duration-300 hover:scale-110"
              />
              <div className={`absolute inset-0 bg-gradient-to-br ${tierColors[nft.tier]} opacity-20`} />
              
              {/* Tier Badge */}
              <div className="absolute top-3 right-3">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r ${tierColors[nft.tier]} text-white text-xs font-medium`}>
                  <Icon className="w-3 h-3" />
                  {nft.tier}
                </div>
              </div>
            </div>

            {/* NFT Details */}
            <div className={`p-6 ${nft.tier === 'Premium' ? 'pt-8' : ''}`}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {nft.name}
              </h3>
              
              <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mb-4">
                {nft.price}
              </div>

              {/* Benefits */}
              <div className="space-y-2 mb-6">
                {nft.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                    {benefit}
                  </div>
                ))}
              </div>

              {/* Buy Button */}
              <button className="w-full btn btn-primary">
                Subscribe Now
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
} 