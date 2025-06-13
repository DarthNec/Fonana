'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useUser } from '@/lib/hooks/useUser'
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
    name: 'Текст',
    description: 'Статьи, посты, истории',
    icon: DocumentTextIcon,
    gradient: 'from-blue-500 to-cyan-500',
    shadowColor: 'shadow-blue-500/25'
  },
  {
    type: 'image',
    name: 'Изображение',
    description: 'Фотографии, арт, скриншоты',
    icon: PhotoIcon,
    gradient: 'from-green-500 to-emerald-500',
    shadowColor: 'shadow-green-500/25'
  },
  {
    type: 'video',
    name: 'Видео',
    description: 'Видеоролики, стримы, туториалы',
    icon: FilmIcon,
    gradient: 'from-purple-500 to-pink-500',
    shadowColor: 'shadow-purple-500/25'
  },
  {
    type: 'nft',
    name: 'NFT',
    description: 'Уникальные цифровые активы',
    icon: SparklesIcon,
    gradient: 'from-yellow-500 to-orange-500',
    shadowColor: 'shadow-yellow-500/25'
  }
]

const tips = [
  {
    title: 'Качественный контент',
    description: 'Создавайте уникальный и интересный контент для вашей аудитории',
    icon: LightBulbIcon,
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    title: 'Справедливая цена',
    description: 'Устанавливайте адекватные цены с учетом ценности контента',
    icon: CurrencyDollarIcon,
    gradient: 'from-green-500 to-emerald-500'
  },
  {
    title: 'Регулярность',
    description: 'Публикуйте контент регулярно для поддержания интереса',
    icon: RocketLaunchIcon,
    gradient: 'from-blue-500 to-cyan-500'
  }
]

export default function CreatePage() {
  const { connected } = useWallet()
  const { user } = useUser()
  const router = useRouter()
  const [showCreateModal, setShowCreateModal] = useState(false)

  const handlePostCreated = () => {
    setShowCreateModal(false)
    toast.success('Пост успешно создан!')
    // Перенаправляем на страницу профиля или feed
    router.push('/feed')
  }

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-16"> {/* Добавили pt-16 для отступа от навбара */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <LockClosedIcon className="h-10 w-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">Требуется подключение кошелька</h3>
          <p className="text-slate-400 text-lg">Подключите кошелек для создания контента</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 pt-24"> {/* Добавили pt-24 для отступа от навбара */}
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-6">
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
            Создание контента
          </span>
        </h1>
        <p className="text-xl text-slate-400 max-w-3xl mx-auto">
          Делитесь своим творчеством и монетизируйте контент с помощью блокчейна
        </p>
      </div>

      {/* Quick Create Button */}
      <div className="flex justify-center mb-12">
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-2xl hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/25 flex items-center gap-3"
        >
          <PlusIcon className="w-6 h-6" />
          Создать новый пост
        </button>
      </div>

      {/* Content Types Grid */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Типы контента
          </span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {contentTypes.map((type) => (
            <div
              key={type.type}
              className={`bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-6 hover:shadow-2xl hover:${type.shadowColor} transition-all duration-500 group cursor-pointer`}
              onClick={() => setShowCreateModal(true)}
            >
              <div className={`w-16 h-16 bg-gradient-to-r ${type.gradient} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <type.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{type.name}</h3>
              <p className="text-slate-400">{type.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tips Section */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Советы создателям
          </span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tips.map((tip, index) => (
            <div
              key={index}
              className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-6 hover:shadow-xl transition-all duration-500"
            >
              <div className={`w-12 h-12 bg-gradient-to-r ${tip.gradient} rounded-xl flex items-center justify-center mb-4`}>
                <tip.icon className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">{tip.title}</h4>
              <p className="text-slate-400">{tip.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Info Block */}
      <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">💡</span>
          </div>
          <div>
            <h4 className="text-2xl font-bold text-white mb-2">
              Полезная информация
            </h4>
            <p className="text-slate-300">Важные детали для успешной публикации</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-slate-300">
              <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"></div>
              <span>Размер файла ограничен 10MB для изображений</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"></div>
              <span>100MB для видео контента</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"></div>
              <span>50MB для аудио файлов</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-slate-300">
              <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"></div>
              <span>Контент хранится в децентрализованной сети</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"></div>
              <span>Монетизация через криптовалюты SOL и USDC</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"></div>
              <span>Гибкие модели доступа к контенту</span>
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