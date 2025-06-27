'use client'

import { useUserContext } from '@/lib/contexts/UserContext'
import { UserIcon } from '@heroicons/react/24/outline'
import PostCard from '@/components/PostCard'

export default function AvatarDemoPage() {
  const { user } = useUserContext()

  const mockPost = {
    id: 1,
    creator: {
      id: '1',
      name: 'Demo Creator',
      username: 'democreator',
      avatar: null,
      isVerified: true
    },
    title: 'Demo Post для тестирования аватаров',
    content: 'Этот пост создан для проверки отображения аватаров во всех компонентах',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=600&fit=crop',
    type: 'image' as const,
    isLocked: false,
    likes: 42,
    comments: 5,
    createdAt: new Date().toISOString(),
    tags: ['demo', 'test'],
    isPremium: false,
    isSubscribed: true
  }

  return (
    <div className="min-h-screen bg-slate-900 pt-24 pb-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-white mb-8">
          Демо страница проверки аватаров
        </h1>

        {/* Текущий пользователь */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Текущий пользователь:</h2>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-pink-500/20">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.nickname || 'User'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : null}
              {!user?.avatar && (
                <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                  <UserIcon className="w-8 h-8 text-white" />
                </div>
              )}
            </div>
            <div>
              <p className="text-white font-medium">
                {user?.fullName || user?.nickname || 'Не подключен'}
              </p>
              <p className="text-slate-400 text-sm">
                @{user?.nickname || 'username'}
              </p>
              <p className="text-slate-500 text-xs mt-1">
                {user?.wallet ? `${user.wallet.slice(0, 8)}...${user.wallet.slice(-6)}` : 'Кошелек не подключен'}
              </p>
            </div>
          </div>
        </div>

        {/* Места отображения аватара */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Где отображается аватар:</h2>
          <ul className="space-y-2 text-slate-300">
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Навбар (правый верхний угол)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Выпадающее меню профиля
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Страница профиля
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Комментарии (когда вы пишете новый комментарий)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Модалка настройки профиля
            </li>
          </ul>
        </div>

        {/* Демо пост с комментариями */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Демо пост с комментариями:</h2>
          <p className="text-slate-400 mb-4">
            Комментарии теперь встроены в PostCard. Нажмите на кнопку комментариев под постом, чтобы увидеть их.
          </p>
          <PostCard {...mockPost} showCreator={true} />
        </div>
      </div>
    </div>
  )
} 