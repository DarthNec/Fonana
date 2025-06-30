'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useUserContext } from '@/lib/contexts/UserContext'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import CreatePostModal from '@/components/CreatePostModal'
import { 
  PhotoIcon, 
  FilmIcon, 
  DocumentTextIcon, 
  SparklesIcon,
  LightBulbIcon,
  CurrencyDollarIcon,
  RocketLaunchIcon,
  PlusIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline'

const contentTypes = [
  {
    type: 'text',
    name: 'Text',
    description: 'Articles, posts, stories',
    icon: DocumentTextIcon,
    gradient: 'from-blue-500 to-cyan-500',
    shadowColor: 'shadow-blue-500/25'
  },
  {
    type: 'image',
    name: 'Image',
    description: 'Photos, art, screenshots',
    icon: PhotoIcon,
    gradient: 'from-green-500 to-emerald-500',
    shadowColor: 'shadow-green-500/25'
  },
  {
    type: 'video',
    name: 'Video',
    description: 'Videos, streams, tutorials',
    icon: FilmIcon,
    gradient: 'from-purple-500 to-pink-500',
    shadowColor: 'shadow-purple-500/25'
  },
  {
    type: 'nft',
    name: 'NFT',
    description: 'Unique digital assets',
    icon: SparklesIcon,
    gradient: 'from-yellow-500 to-orange-500',
    shadowColor: 'shadow-yellow-500/25'
  }
]

const tips = [
  {
    title: 'Quality Content',
    description: 'Create unique and interesting content for your audience',
    icon: LightBulbIcon,
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    title: 'Fair Pricing',
    description: 'Set reasonable prices based on content value',
    icon: CurrencyDollarIcon,
    gradient: 'from-green-500 to-emerald-500'
  },
  {
    title: 'Regular Updates',
    description: 'Publish content regularly to maintain interest',
    icon: RocketLaunchIcon,
    gradient: 'from-blue-500 to-cyan-500'
  }
]

export default function CreatePage() {
  const { connected } = useWallet()
  const { user } = useUserContext()
  const router = useRouter()
  const [showCreateModal, setShowCreateModal] = useState(false)

  const handlePostCreated = () => {
    setShowCreateModal(false)
    toast.success('Post created successfully!')
    
    // Отправляем событие о новом посте
    window.dispatchEvent(new Event('postsUpdated'))
    
    // Небольшая задержка перед редиректом чтобы событие успело обработаться
    setTimeout(() => {
      // Redirect to profile or feed page
      router.push('/feed')
    }, 100)
  }

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-16"> {/* Added pt-16 for navbar offset */}
        <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200 dark:border-slate-700/50 rounded-3xl p-8 text-center max-w-md w-full shadow-lg">
          <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <LockClosedIcon className="h-10 w-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Wallet connection required</h3>
          <p className="text-gray-600 dark:text-slate-400 text-lg">Connect your wallet to create content</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 pt-24"> {/* Added pt-24 for navbar offset */}


      {/* Quick Create Button */}
      <div className="flex justify-center mb-12">
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-2xl hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/25 flex items-center gap-3"
        >
          <PlusIcon className="w-6 h-6" />
          Create New Post
        </button>
      </div>

      {/* Content Types Grid */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Content Types
          </span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {contentTypes.map((type) => (
            <div
              key={type.type}
              className={`bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200 dark:border-slate-700/50 rounded-3xl p-6 hover:shadow-2xl hover:${type.shadowColor} transition-all duration-500 group cursor-pointer`}
              onClick={() => setShowCreateModal(true)}
            >
              <div className={`w-16 h-16 bg-gradient-to-r ${type.gradient} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <type.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{type.name}</h3>
              <p className="text-gray-600 dark:text-slate-400">{type.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tips Section */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Creator Tips
          </span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tips.map((tip, index) => (
            <div
              key={index}
              className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200 dark:border-slate-700/50 rounded-3xl p-6 hover:shadow-xl transition-all duration-500"
            >
              <div className={`w-12 h-12 bg-gradient-to-r ${tip.gradient} rounded-xl flex items-center justify-center mb-4`}>
                <tip.icon className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{tip.title}</h4>
              <p className="text-gray-600 dark:text-slate-400">{tip.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Info Block */}
      <div className="bg-purple-50/50 dark:bg-slate-800/50 backdrop-blur-sm border border-purple-200 dark:border-slate-700/50 rounded-2xl p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">💡</span>
          </div>
          <div>
            <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Useful Information
            </h4>
            <p className="text-gray-700 dark:text-slate-300">Important details for successful publishing</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-gray-700 dark:text-slate-300">
              <div className="w-2 h-2 bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 rounded-full"></div>
              <span>File size limited to 10MB for images</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700 dark:text-slate-300">
              <div className="w-2 h-2 bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 rounded-full"></div>
              <span>100MB for video content</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700 dark:text-slate-300">
              <div className="w-2 h-2 bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 rounded-full"></div>
              <span>50MB for audio files</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-gray-700 dark:text-slate-300">
              <div className="w-2 h-2 bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 rounded-full"></div>
              <span>Content stored in decentralized network</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700 dark:text-slate-300">
              <div className="w-2 h-2 bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 rounded-full"></div>
              <span>Monetization via SOL and USDC cryptocurrencies</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700 dark:text-slate-300">
              <div className="w-2 h-2 bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 rounded-full"></div>
              <span>Flexible content access models</span>
            </div>
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onPostCreated={handlePostCreated}
        />
      )}
    </div>
  )
} 