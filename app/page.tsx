'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRightIcon, SparklesIcon, UsersIcon, ShieldCheckIcon, CurrencyDollarIcon, PlayIcon, StarIcon } from '@heroicons/react/24/outline'
import CreatorsExplorer from '@/components/CreatorsExplorer'
import UserSubscriptions from '@/components/UserSubscriptions'

const features = [
  {
    name: 'Crypto Payments',
    description: 'Accept SOL, USDC and other tokens directly to your wallet',
    icon: CurrencyDollarIcon,
    gradient: 'from-emerald-400 to-teal-600',
  },
  {
    name: 'NFT Subscriptions', 
    description: 'Create unique NFTs for subscribers with exclusive privileges',
    icon: SparklesIcon,
    gradient: 'from-violet-400 to-purple-600',
  },
  {
    name: 'Security',
    description: 'Full control over funds through decentralized technologies',
    icon: ShieldCheckIcon,
    gradient: 'from-blue-400 to-indigo-600',
  },
  {
    name: 'Community',
    description: 'Build loyal audience with token-gating features',
    icon: UsersIcon,
    gradient: 'from-rose-400 to-pink-600',
  },
]

const stats = [
  { name: 'Active creators', value: '12K+', icon: '👥' },
  { name: 'Monthly volume', value: '$2.4M', icon: '💰' },
  { name: 'NFTs created', value: '50K+', icon: '🎨' },
  { name: 'Platform fee', value: '2.5%', icon: '⚡' },
]

export default function HomePage() {
  const [hasSubscriptions] = useState(false) // For demo show hero

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      {!hasSubscriptions && (
        <section className="relative min-h-screen flex items-center overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center max-w-5xl mx-auto">
              <div className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 backdrop-blur-sm mb-8">
                <StarIcon className="w-5 h-5 text-yellow-400 mr-3" />
                <span className="text-sm font-medium bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Platform of the new generation
                </span>
              </div>
              
              <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight">
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Web3 Creator
                </span>
                <br />
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent animate-pulse">
                  Revolution
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-slate-300 max-w-4xl mx-auto mb-12 leading-relaxed font-light">
                Discover talented content creators earning cryptocurrency through exclusive materials and NFT subscriptions
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center mb-20">
                <Link href="/creators" className="group">
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-2xl font-semibold flex items-center justify-center transform group-hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/25">
                    <PlayIcon className="w-6 h-6 mr-3" />
                    Explore creators
                    <ArrowRightIcon className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
                
                <Link href="/create" className="group">
                  <div className="bg-gradient-to-r from-pink-500 to-violet-600 text-white px-8 py-4 rounded-2xl font-semibold transform group-hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/25">
                    Start creating
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Stats Section */}
      {!hasSubscriptions && (
        <section className="py-20 relative">
          <div className="container mx-auto px-4">
            <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-3xl p-8 md:p-16 border border-slate-700/50">
              <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
                {stats.map((stat, index) => (
                  <div key={stat.name} className="text-center group">
                    <div className="text-5xl mb-6 transform group-hover:scale-110 transition-transform duration-300">
                      {stat.icon}
                    </div>
                    <div className="text-4xl lg:text-5xl font-black mb-3 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                      {stat.value}
                    </div>
                    <div className="text-slate-400 font-medium">
                      {stat.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* User Subscriptions Section */}
      {hasSubscriptions && <UserSubscriptions />}

      {/* Creators Explorer Section */}
      <div id="creators">
        <CreatorsExplorer />
      </div>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-black mb-8">
              <span className="text-white">All for </span>
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Web3 monetization
              </span>
            </h2>
            <p className="text-xl text-slate-300 max-w-4xl mx-auto leading-relaxed">
              Full toolkit for creating, promoting, and monetizing content in a decentralized ecosystem
            </p>
          </div>
          
          <div className="grid gap-8 lg:grid-cols-2">
            {features.map((feature, index) => (
              <div 
                key={feature.name} 
                className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/30 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 p-8 hover:border-purple-500/30 transition-all duration-500"
              >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-3xl`}></div>
                
                <div className="relative z-10">
                  <div className="flex items-start gap-6 mb-6">
                    <div className="flex-shrink-0">
                      <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${feature.gradient} p-0.5 group-hover:scale-110 transition-transform duration-300`}>
                        <div className="w-full h-full bg-slate-900 rounded-2xl flex items-center justify-center">
                          <feature.icon className="w-10 h-10 text-white" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white group-hover:text-purple-300 transition-colors mb-4">
                        {feature.name}
                      </h3>
                      <p className="text-slate-300 leading-relaxed text-lg">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Hover glow effect */}
                  <div className={`absolute -inset-1 bg-gradient-to-br ${feature.gradient} rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500`}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="relative bg-gradient-to-br from-purple-900/30 to-blue-900/30 backdrop-blur-xl rounded-3xl p-12 md:p-20 text-center border border-purple-500/20 overflow-hidden">
            {/* Background effects */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
              <h2 className="text-5xl md:text-6xl font-black mb-8">
                <span className="text-white">Ready to start </span>
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Web3 journey?
                </span>
              </h2>
              <p className="text-xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
                Join thousands of creators already earning cryptocurrency through decentralized content creation
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link href="/create" className="group">
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center transform group-hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/25">
                    <SparklesIcon className="w-6 h-6 mr-3" />
                    Start creating today
                    <ArrowRightIcon className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
                <Link href="/creators" className="group">
                  <div className="relative bg-slate-800/50 backdrop-blur-sm text-white px-8 py-4 rounded-2xl font-semibold border border-slate-600 hover:border-purple-500/50 transform group-hover:scale-[1.02] transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20">
                    Explore creators
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
} 