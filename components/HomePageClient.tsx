'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRightIcon, SparklesIcon, UsersIcon, ShieldCheckIcon, CurrencyDollarIcon, PlayIcon, StarIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import CreatorsExplorer from '@/components/CreatorsExplorer'
import CreatePostModal from '@/components/CreatePostModal'
import { useRouter } from 'next/navigation'
import { useWallet } from '@/lib/hooks/useSafeWallet'
import { useSafeWalletModal } from '@/lib/hooks/useSafeWalletModal'
import { useUser, useUserLoading } from '@/lib/store/appStore'
import { toast } from 'react-hot-toast'

const features = [
  {
    name: 'Crypto Payments',
    description: 'Accept SOL, USDC and other tokens directly to your wallet',
    icon: CurrencyDollarIcon,
    gradient: 'from-emerald-400 to-teal-600',
    learnMoreUrl: '/features/crypto-payments'
  },
  {
    name: 'NFT Subscriptions', 
    description: 'Create unique NFTs for subscribers with exclusive privileges',
    icon: SparklesIcon,
    gradient: 'from-violet-400 to-purple-600',
    learnMoreUrl: '/features/nft-subscriptions'
  },
  {
    name: 'Security',
    description: 'Full control over funds through decentralized technologies',
    icon: ShieldCheckIcon,
    gradient: 'from-blue-400 to-indigo-600',
    learnMoreUrl: '/features/security'
  },
  {
    name: 'Community',
    description: 'Build loyal audience with token-gating features',
    icon: UsersIcon,
    gradient: 'from-rose-400 to-pink-600',
    learnMoreUrl: '/features/community'
  },
]

const stats = [
  { name: 'Active creators', value: '12K+', icon: '👥' },
  { name: 'Monthly volume', value: '$2.4M', icon: '💰' },
  { name: 'NFTs created', value: '50K+', icon: '🎨' },
  { name: 'Platform fee', value: '2.5%', icon: '⚡' },
]

const faqs = [
  {
    question: "Do I need crypto experience to use Fonana?",
    answer: "No! Fonana is designed for everyone. We guide you through wallet setup, and our platform handles all the technical blockchain details. You can start earning crypto even if you've never used it before."
  },
  {
    question: "What wallets are supported?",
    answer: "Fonana supports all major Solana wallets including Phantom, Solflare, Backpack, and more. We use Solana Wallet Adapter for seamless connection across desktop and mobile devices."
  },
  {
    question: "What are the fees?",
    answer: "Fonana charges only 2.5% platform fee on transactions - one of the lowest in the industry. Unlike traditional platforms that take 20-30%, you keep 97.5% of your earnings. Plus, all funds go directly to your wallet."
  },
  {
    question: "How do I withdraw my earnings?",
    answer: "Your earnings go directly to your connected wallet instantly. There's no withdrawal process - you already own your crypto! You can swap to fiat currency using any crypto exchange whenever you want."
  },
  {
    question: "Is my content and data secure?",
    answer: "Yes! Your content is stored securely, and all transactions happen on the blockchain which is immutable and transparent. You maintain full ownership of your content and audience data - we never sell your information."
  },
  {
    question: "Can I generate videos with AI?",
    answer: "Absolutely! Fonana integrates OpenAI's Sora 2 technology, allowing you to generate stunning AI videos directly within the platform. This feature helps you create engaging content quickly and stand out from the crowd."
  },
  {
    question: "What cryptocurrencies can I accept?",
    answer: "Currently, Fonana supports SOL (Solana) and USDC stablecoin for payments. We're continuously adding support for more tokens based on community feedback."
  }
]

export default function HomePageClient() {
  const router = useRouter()
  const { connected } = useWallet()
  const { setVisible } = useSafeWalletModal()
  const user = useUser()
  const [mounted, setMounted] = useState(false)
  const [showInfoBlock, setShowInfoBlock] = useState(true)
  const [showOffers, setShowOffers] = useState(false)
  const [currentOffer, setCurrentOffer] = useState(0)
  const [version, setVersion] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Hide info block after 4 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowInfoBlock(false)
    }, 4000)

    return () => clearTimeout(timer)
  }, [])

  // Обработчик открытия создания поста
  const handleStartCreating = () => {
    if (!connected || !user) {
      // Открываем модальное окно подключения кошелька
      setVisible(true)
      toast.success('Подключите кошелек для создания поста')
      return
    }
    
    setShowCreateModal(true)
  }
  
  // Offers rotation
  const offers = [
    {
      title: "Generate videos with Sora 2",
      description: "Create stunning AI-generated videos with OpenAI's latest technology",
      icon: "🎬"
    },
    {
      title: "Start earning today",
      description: "Share exclusive content and get paid in crypto",
      icon: "💰"
    },
    {
      title: "Join the creator economy",
      description: "Build your community and monetize your passion",
      icon: "🚀"
    },
    {
      title: "Unlock premium content",
      description: "Subscribe to your favorite creators",
      icon: "💎"
    }
  ]

  useEffect(() => {
    // Show offers after 3 seconds
    const timer = setTimeout(() => {
      setShowOffers(true)
    }, 3000)

    // Rotate offers every 8 seconds (was 5s - too fast for reading)
    const interval = setInterval(() => {
      if (showOffers) {
        setCurrentOffer((prev) => (prev + 1) % offers.length)
      }
    }, 8000)

    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [showOffers])
  
  /*
  useEffect(() => {
    fetch('/api/version')
      .then(res => res.text())
      .then(setVersion)
      .catch(() => setVersion('unknown'))
  }, [])
  */
  // Предотвращаем проблемы с SSR на мобильных
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 dark:from-black dark:via-purple-900/5 dark:to-black overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-20">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-5xl mx-auto">
            {/*
            <div className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 backdrop-blur-sm mb-8">
              <StarIcon className="w-5 h-5 text-yellow-500 dark:text-yellow-400 mr-3" />
              <span className="text-sm font-medium bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
                {version}
              </span>
            </div>
            */}
            {/*
            <div className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 backdrop-blur-sm mb-8 animate-pulse">
              <span className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
                📱 Fonana available on Google Play!
              </span>
            </div>
              */}
            <div className={`transition-all duration-500 ${!showInfoBlock ? 'animate-fadeOut' : ''}`}>
              {/* Android Announcement Banner */}
              <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight">
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                  Web3 Creator
                </span>
                <br />
                <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 dark:from-purple-400 dark:via-pink-400 dark:to-purple-400 bg-clip-text text-transparent animate-pulse">
                  Revolution
                </span>
              </h1>
              
              {/* Value Proposition Subtitle */}
              <p className="text-xl md:text-2xl text-gray-700 dark:text-slate-300 mb-8 max-w-3xl mx-auto font-light leading-relaxed">
                Earn crypto from content. No platform fees. You own your audience.
              </p>
            </div>

            {/* Offers section that replaces the main content */}
            {showOffers && (
              <div className="animate-fadeIn">
                <div className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 rounded-3xl p-8 md:p-12 backdrop-blur-md border border-purple-500/20 max-w-3xl mx-auto">
                  <div className="text-5xl mb-4">{offers[currentOffer].icon}</div>
                  <h2 className="text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                    {offers[currentOffer].title}
                  </h2>
                  <p className="text-lg md:text-xl text-gray-700 dark:text-slate-300 mb-8">
                    {offers[currentOffer].description}
                  </p>
                  
                  {/* Offer indicators */}
                  <div className="flex justify-center gap-2 mb-8">
                    {offers.map((_, index) => (
                      <div
                        key={index}
                        className={`h-1.5 w-12 rounded-full transition-all duration-300 ${
                          index === currentOffer 
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600' 
                            : 'bg-gray-300 dark:bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-8 justify-center mb-20 mt-10">
              <Link href="/feed" className="group">
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-12 py-6 rounded-2xl font-semibold text-xl flex items-center justify-center h-[88px] transform group-hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/30">
                  <PlayIcon className="w-9 h-9 mr-4 flex-shrink-0" />
                  Explore creators
                  <ArrowRightIcon className="w-9 h-9 ml-4 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              
              <button 
                onClick={handleStartCreating}
                className="group"
              >
                <div className="bg-gradient-to-r from-pink-500 to-violet-600 text-white px-12 py-6 rounded-2xl font-semibold text-xl flex items-center justify-center h-[88px] transform group-hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/30">
                  Start creating
                </div>
              </button>
              
              <Link href="/download" className="group">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-12 py-6 rounded-2xl font-semibold text-xl flex items-center justify-center h-[88px] transform group-hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/30">
                  <svg className="w-8 h-8 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                  </svg>
                  <div className="flex flex-col items-start">
                    <span className="text-base font-semibold">Get Mobile App</span>
                    <span className="text-xs opacity-90 font-normal">iOS & Android</span>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="relative bg-white dark:bg-slate-900 backdrop-blur-xl rounded-3xl p-8 md:p-16 border border-gray-200 dark:border-slate-700/50 shadow-lg">
            <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
              {stats.map((stat, index) => (
                <div key={stat.name} className="text-center group">
                  <div className="text-5xl mb-6 transform group-hover:scale-110 transition-transform duration-300">
                    {stat.icon}
                  </div>
                  <div className="text-4xl lg:text-5xl font-black mb-3 bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-gray-600 dark:text-slate-400 font-medium">
                    {stat.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sora 2 Showcase Section */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-800 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black mb-8">
              <span className="text-gray-900 dark:text-white">Generate Videos with </span>
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                Sora 2
              </span>
            </h2>
            <p className="text-xl text-gray-700 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Create stunning AI-generated videos directly on Fonana with OpenAI's latest technology
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            {/* Feature Card 1 */}
            <div className="group bg-white dark:bg-slate-900 rounded-3xl p-8 border border-gray-200 dark:border-slate-700/50 hover:border-purple-500/50 dark:hover:border-purple-500/30 transition-all duration-500 shadow-lg">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <SparklesIcon className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">AI-Powered Creation</h3>
                  <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
                    Generate professional videos from text prompts in minutes. No expensive equipment or video editing skills required.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature Card 2 */}
            <div className="group bg-white dark:bg-slate-900 rounded-3xl p-8 border border-gray-200 dark:border-slate-700/50 hover:border-purple-500/50 dark:hover:border-purple-500/30 transition-all duration-500 shadow-lg">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <PlayIcon className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">High Quality Output</h3>
                  <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
                    Create cinematic-quality videos up to 20 seconds long with realistic motion, lighting, and camera movements.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature Card 3 */}
            <div className="group bg-white dark:bg-slate-900 rounded-3xl p-8 border border-gray-200 dark:border-slate-700/50 hover:border-purple-500/50 dark:hover:border-purple-500/30 transition-all duration-500 shadow-lg">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                    <CurrencyDollarIcon className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Monetize Instantly</h3>
                  <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
                    Generate engaging video content and start earning crypto immediately. Perfect for creators looking to scale.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature Card 4 */}
            <div className="group bg-white dark:bg-slate-900 rounded-3xl p-8 border border-gray-200 dark:border-slate-700/50 hover:border-purple-500/50 dark:hover:border-purple-500/30 transition-all duration-500 shadow-lg">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
                    <span className="text-3xl">⚡</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Fast & Easy</h3>
                  <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
                    Integrated directly into your posting workflow. Write a prompt, generate video, publish - all in one place.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Card */}
          <div className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 rounded-3xl p-8 md:p-12 backdrop-blur-md border border-purple-500/20 text-center">
            <div className="text-6xl mb-6">🎬</div>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to Create AI Videos?
            </h3>
            <p className="text-lg text-gray-700 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
              Start creating stunning videos with Sora 2 today. Available to all Fonana creators with no additional setup required.
            </p>
            <button
              onClick={handleStartCreating}
              className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-2xl font-bold transform hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/25"
            >
              <SparklesIcon className="w-6 h-6" />
              <span>Try Sora 2 Now</span>
              <ArrowRightIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </section>

      {/* Creators Explorer Section */}
      <div id="creators">
        <CreatorsExplorer mode="top" />
      </div>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-black mb-8">
              <span className="text-gray-900 dark:text-white">All for </span>
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                Web3 monetization
              </span>
            </h2>
            <p className="text-xl text-gray-700 dark:text-slate-300 max-w-4xl mx-auto leading-relaxed">
              Full toolkit for creating, promoting, and monetizing content in a decentralized ecosystem
            </p>
          </div>
          
          <div className="grid gap-8 lg:grid-cols-2">
            {features.map((feature, index) => (
              <div 
                key={feature.name} 
                className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 backdrop-blur-xl border border-gray-200 dark:border-slate-700/50 p-8 hover:border-purple-500/50 dark:hover:border-purple-500/30 transition-all duration-500 shadow-lg"
              >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-3xl`}></div>
                
                <div className="relative z-10">
                  <div className="flex items-start gap-6 mb-6">
                    <div className="flex-shrink-0">
                      <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${feature.gradient} p-0.5 group-hover:scale-110 transition-transform duration-300`}>
                        <div className="w-full h-full bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center">
                          <feature.icon className="w-10 h-10 text-gray-900 dark:text-white" />
                        </div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors mb-4">
                        {feature.name}
                      </h3>
                      <p className="text-gray-700 dark:text-slate-300 leading-relaxed text-lg mb-4">
                        {feature.description}
                      </p>
                      <Link 
                        href={feature.learnMoreUrl}
                        className="inline-flex items-center gap-2 text-purple-600 dark:text-purple-400 font-semibold hover:gap-3 transition-all duration-300"
                      >
                        <span>Learn more</span>
                        <ArrowRightIcon className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                  
                  {/* Hover glow effect */}
                  <div className={`absolute -inset-1 bg-gradient-to-br ${feature.gradient} rounded-3xl opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 blur-xl transition-opacity duration-500`}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black mb-8">
              <span className="text-gray-900 dark:text-white">Frequently Asked </span>
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                Questions
              </span>
            </h2>
            <p className="text-xl text-gray-700 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Everything you need to know about getting started with Fonana
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-slate-700/50 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className="w-full px-6 md:px-8 py-6 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-200"
                >
                  <span className="text-lg md:text-xl font-bold text-gray-900 dark:text-white pr-4">
                    {faq.question}
                  </span>
                  <ChevronDownIcon 
                    className={`w-6 h-6 text-purple-600 dark:text-purple-400 flex-shrink-0 transition-transform duration-300 ${
                      openFaqIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    openFaqIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-6 md:px-8 pb-6 text-gray-700 dark:text-slate-300 text-lg leading-relaxed">
                    {faq.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="relative bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-900/30 dark:to-blue-900/30 backdrop-blur-xl rounded-3xl p-12 md:p-20 text-center border border-purple-200 dark:border-purple-500/20 overflow-hidden">
            {/* Background effects */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
              <h2 className="text-5xl md:text-6xl font-black mb-8">
                <span className="text-gray-900 dark:text-white">Ready to start </span>
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                  Web3 journey?
                </span>
              </h2>
              <p className="text-xl text-gray-700 dark:text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
                Join thousands of creators already earning cryptocurrency through decentralized content creation
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <button 
                  onClick={handleStartCreating}
                  className="group"
                >
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center transform group-hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/25">
                    <SparklesIcon className="w-6 h-6 mr-3" />
                    Start creating today
                    <ArrowRightIcon className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Create Post Modal */}
      {showCreateModal && (
        <CreatePostModal 
          onClose={() => setShowCreateModal(false)}
          onPostCreated={() => {
            toast.success('Пост успешно создан!')
            setShowCreateModal(false)
            
            // Испускаем событие
            window.dispatchEvent(new CustomEvent('post-created', { 
              detail: { timestamp: Date.now() } 
            }))
            
            // Переходим на страницу feed
            router.push('/feed')
          }}
        />
      )}
    </div>
  )
} 