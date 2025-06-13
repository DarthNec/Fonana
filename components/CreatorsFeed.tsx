'use client'

import { StarIcon, HeartIcon, EyeIcon } from '@heroicons/react/24/solid'
import { UsersIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import Image from 'next/image'
import { getFeaturedCreators, getCreatorsByCategory } from '@/lib/mockData'

// Используем данные из mockData
const featuredCreators = getFeaturedCreators()

// Старые данные для совместимости
const oldFeaturedCreators = [
  {
    id: 1,
    name: 'Anna Crypto',
    username: '@annacrypto',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616c18fe645?w=150&h=150&fit=crop&crop=face',
    category: 'DeFi & Investing',
    description: 'Sharing cryptocurrency investment strategies and DeFi protocol insights',
    subscribers: 12500,
    monthlyEarnings: '$3,400',
    posts: 156,
    rating: 4.9,
    isVerified: true,
    coverImage: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=200&fit=crop',
    tags: ['DeFi', 'Investing', 'Analytics']
  },
  {
    id: 2,
    name: 'Alex NFT',
    username: '@alexnft',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    category: 'NFT & Art',
    description: 'Creating unique NFT collections and teaching digital art design',
    subscribers: 8900,
    monthlyEarnings: '$2,100',
    posts: 89,
    rating: 4.7,
    isVerified: true,
    coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=200&fit=crop',
    tags: ['NFT', 'Design', 'Art']
  },
  {
    id: 3,
    name: 'Maria Blockchain',
    username: '@mariachain',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    category: 'Web3 Education',
    description: 'Explaining complex blockchain concepts in simple terms',
    subscribers: 15700,
    monthlyEarnings: '$4,200',
    posts: 234,
    rating: 4.8,
    isVerified: true,
    coverImage: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=200&fit=crop',
    tags: ['Education', 'Web3', 'Blockchain']
  },
  {
    id: 4,
    name: 'David Trader',
    username: '@davidtrade',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    category: 'Trading',
    description: 'Daily trading signals and technical analysis education',
    subscribers: 9800,
    monthlyEarnings: '$2,800',
    posts: 445,
    rating: 4.6,
    isVerified: false,
    coverImage: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=200&fit=crop',
    tags: ['Trading', 'Analysis', 'Signals']
  },
  {
    id: 5,
    name: 'Sophia Meta',
    username: '@sophiameta',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    category: 'Metaverse',
    description: 'Exploring virtual worlds and creating content about the future of internet',
    subscribers: 6400,
    monthlyEarnings: '$1,900',
    posts: 78,
    rating: 4.5,
    isVerified: true,
    coverImage: 'https://images.unsplash.com/photo-1617802690992-15d93263d3a9?w=400&h=200&fit=crop',
    tags: ['Metaverse', 'VR', 'Technology']
  },
  {
    id: 6,
    name: 'Ivan GameFi',
    username: '@ivangamefi',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    category: 'GameFi',
    description: 'Blockchain game reviews and GameFi earning strategies',
    subscribers: 11200,
    monthlyEarnings: '$3,100',
    posts: 167,
    rating: 4.7,
    isVerified: true,
    coverImage: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=400&h=200&fit=crop',
    tags: ['GameFi', 'P2E', 'Gaming']
  },
  {
    id: 7,
    name: 'Elena Intimate',
    username: '@elena_intimate',
    avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=150&h=150&fit=crop&crop=face',
    category: 'Intimate',
    description: 'Artistic photography and intimate portraits with minimalist aesthetics',
    subscribers: 7800,
    monthlyEarnings: '$2,400',
    posts: 134,
    rating: 4.8,
    isVerified: true,
    coverImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop',
    tags: ['Intimate', 'Portraits', 'Aesthetic']
  },
  {
    id: 8,
    name: 'Victoria Lifestyle',
    username: '@victoria_lifestyle',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
    category: 'Lifestyle',
    description: 'Exclusive lifestyle content and creative imagery for art enthusiasts',
    subscribers: 5600,
    monthlyEarnings: '$1,800',
    posts: 98,
    rating: 4.6,
    isVerified: true,
    coverImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=200&fit=crop',
    tags: ['Lifestyle', 'Model', 'Photography']
  }
]

export default function CreatorsFeed({ selectedTopic }: { selectedTopic?: string }) {
  const filteredCreators = featuredCreators.filter(creator => {
    if (!selectedTopic) return true
    return creator.tags.some(tag => 
      tag.toLowerCase() === selectedTopic.toLowerCase()
    ) || creator.category.toLowerCase() === selectedTopic.toLowerCase()
  })

  return (
    <section className="section-padding bg-gray-50 dark:bg-slate-800/50">
      <div className="container-modern">
        <div className="text-center mb-12">
          <h2 className="heading-lg mb-4">
            {selectedTopic ? `${selectedTopic} Creators` : 'Featured Creators'}
          </h2>
          <p className="text-xl text-muted max-w-3xl mx-auto">
            {selectedTopic 
              ? `Discover talented ${selectedTopic.toLowerCase()} creators earning crypto through exclusive content`
              : 'Discover talented content creators who are already earning on the Fonana platform'
            }
          </p>
          {selectedTopic && (
            <div className="mt-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-300">
                {filteredCreators.length} creator{filteredCreators.length !== 1 ? 's' : ''} found
              </span>
            </div>
          )}
        </div>

        {filteredCreators.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400 mb-2">
              No creators found for "{selectedTopic}"
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Try selecting a different topic or explore all creators
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCreators.map((creator) => (
            <Link key={creator.id} href={`/creator/${creator.id}`} className="modern-card group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden block">
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
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
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
                  <div className="flex-1 pt-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                      {creator.name}
                    </h3>
                    <p className="text-sm text-muted">
                      {creator.username}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 pt-2">
                    <StarIcon className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {creator.rating}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-muted text-sm mb-4 line-clamp-2">
                  {creator.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {creator.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <UsersIcon className="w-4 h-4 text-indigo-500" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {creator.subscribers.toLocaleString()}
                      </span>
                    </div>
                    <span className="text-xs text-muted">Subscribers</span>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <EyeIcon className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {creator.posts}
                      </span>
                    </div>
                    <span className="text-xs text-muted">Posts</span>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <CurrencyDollarIcon className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {creator.monthlyEarnings}
                      </span>
                    </div>
                    <span className="text-xs text-muted">Monthly</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Link
                    href={`/creator/${creator.id}/subscribe`}
                    className="flex-1 btn-primary text-center text-sm py-2"
                  >
                    Subscribe
                  </Link>
                  <button className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <HeartIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>
            </Link>
          ))}
          </div>
        )}

        {/* View All Button */}
        <div className="text-center mt-12">
          <Link
            href="/creators"
            className="btn-secondary inline-flex items-center gap-2"
          >
            View All Creators
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
} 