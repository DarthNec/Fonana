'use client'

import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { StarIcon, CheckBadgeIcon } from '@heroicons/react/24/solid'
import { UsersIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'
import { getCreatorsByCategory } from '@/lib/mockData'

interface CategoryPageProps {
  params: {
    slug: string
  }
}

const categoryTitles: { [key: string]: string } = {
  'defi': 'DeFi Creators',
  'nft': 'NFT Creators', 
  'trading': 'Trading Experts',
  'gamefi': 'GameFi Creators',
  'blockchain': 'Blockchain Educators',
  'metaverse': 'Metaverse Pioneers',
  'analytics': 'Analytics Experts',
  'education': 'Web3 Educators',
  'investing': 'Investment Advisors',
  'technology': 'Tech Innovators',
  'startups': 'Startup Founders',
  'intimate': 'Intimate Collection',
  'lifestyle': 'Lifestyle Creators'
}

const categoryDescriptions: { [key: string]: string } = {
  'defi': 'Discover creators sharing DeFi strategies, yield farming tips, and protocol analysis',
  'nft': 'Artists and collectors creating unique NFT collections and digital art',
  'trading': 'Professional traders sharing signals, analysis, and market insights',
  'gamefi': 'Gaming experts covering blockchain games and play-to-earn opportunities',
  'blockchain': 'Educators explaining blockchain technology and Web3 concepts',
  'metaverse': 'Pioneers exploring virtual worlds and metaverse experiences',
  'analytics': 'Data analysts providing market insights and on-chain analytics',
  'education': 'Teachers and educators sharing Web3 knowledge and tutorials',
  'investing': 'Investment professionals sharing crypto and traditional market strategies',
  'technology': 'Tech experts covering the latest in blockchain and Web3 development',
  'startups': 'Entrepreneurs building the future of Web3 and blockchain technology',
  'intimate': 'Artistic and creative content in an intimate, premium setting',
  'lifestyle': 'Lifestyle and personal content creators sharing exclusive moments'
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const categorySlug = params.slug.toLowerCase()
  const creators = getCreatorsByCategory(categorySlug)
  
  const title = categoryTitles[categorySlug] || `${categorySlug} Creators`
  const description = categoryDescriptions[categorySlug] || `Discover talented ${categorySlug} creators`

  if (creators.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            No creators found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We couldn't find any creators in the "{categorySlug}" category yet.
          </p>
          <Link
            href="/"
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Explore All Creators
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {title}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              {description}
            </p>
            <div className="mt-6">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-300">
                {creators.length} creator{creators.length !== 1 ? 's' : ''} found
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Creators Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {creators.map((creator) => (
            <Link
              key={creator.id}
              href={`/creator/${creator.id}`}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden group"
            >
              {/* Cover Image */}
              <div className="relative h-32 bg-gradient-to-r from-indigo-500 to-purple-600 overflow-hidden">
                <Image
                  src={creator.coverImage}
                  alt={`${creator.name} cover`}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/20"></div>
                
                {/* Category Badge */}
                <div className="absolute top-3 left-3">
                  <span className="px-2 py-1 text-xs bg-white/90 dark:bg-black/70 text-gray-900 dark:text-white rounded-full font-medium">
                    {creator.category}
                  </span>
                </div>

                {/* Verified Badge */}
                {creator.isVerified && (
                  <div className="absolute top-3 right-3">
                    <CheckBadgeIcon className="w-6 h-6 text-blue-500" />
                  </div>
                )}
              </div>

              <div className="p-6">
                {/* Avatar and Name */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-gray-700 -mt-8 relative z-10">
                      <Image
                        src={creator.avatar}
                        alt={creator.name}
                        width={48}
                        height={48}
                        className="object-cover"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {creator.name}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {creator.username}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                  {creator.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {creator.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {creator.tags.length > 3 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      +{creator.tags.length - 3} more
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <div className="flex items-center gap-1">
                    <UsersIcon className="w-4 h-4" />
                    <span>{creator.subscribers.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <StarIcon className="w-4 h-4 text-yellow-500" />
                    <span>{creator.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CurrencyDollarIcon className="w-4 h-4" />
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {creator.monthlyEarnings}
                    </span>
                  </div>
                </div>

                {/* Subscribe Button */}
                <button 
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    // Handle subscription
                  }}
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Subscribe
                </button>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
} 