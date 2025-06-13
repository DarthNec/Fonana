'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
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
  onClose: () => void
  onSuccess?: () => void
}

const getSubscriptionTiers = (creatorCategory?: string): SubscriptionTier[] => {
  const baseTiers = [
    {
      id: 'basic',
      name: 'Basic',
      price: 0.05,
      currency: 'SOL',
      duration: 'month',
      description: 'Доступ к базовому контенту',
      features: [
        'Доступ к публичным постам',
        'Участие в чате сообщества',
        'Ежемесячные стримы',
        'Базовое взаимодействие с автором'
      ],
      color: 'from-gray-400 to-gray-600'
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 0.15,
      currency: 'SOL',
      duration: 'month',
      description: 'Расширенный доступ с эксклюзивным контентом',
      features: [
        'Все возможности Basic',
        'Эксклюзивный премиум контент',
        'Еженедельные приватные стримы',
        'Приоритет в комментариях',
        'Личные сообщения',
        'Ранний доступ к новому контенту'
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
      description: 'Максимальный доступ с личным взаимодействием',
      features: [
        'Все возможности Premium',
        'Персональные видео сообщения',
        'Видеозвонки один на один (ежемесячно)',
        'Запросы на кастомный контент',
        'Доступ за кулисы',
        'Эксклюзивные NFT дропы',
        'Персональный обзор портфолио'
      ],
      color: 'from-yellow-400 to-orange-500'
    }
  ]

  return baseTiers
}

export default function SubscribeModal({ creator, onClose, onSuccess }: SubscribeModalProps) {
  const { connected, publicKey } = useWallet()
  const subscriptionTiers = getSubscriptionTiers(creator.category)
  const [selectedTier, setSelectedTier] = useState(subscriptionTiers[1].id)
  const [showInCarousel, setShowInCarousel] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  const selectedSubscription = subscriptionTiers.find(tier => tier.id === selectedTier)

  useEffect(() => {
    // Блокируем скролл при открытии модалки
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const handleSubscribe = async () => {
    if (!connected) {
      toast.error('Пожалуйста, подключите кошелек')
      return
    }

    setIsProcessing(true)
    
    try {
      // Здесь будет логика оплаты через Solana
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast.success(`Вы успешно подписались на ${creator.name}!`)
      onSuccess?.()
      onClose()
    } catch (error) {
      toast.error('Ошибка при оформлении подписки')
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
            <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-purple-500/30">
              <Image
                src={creator.avatar}
                alt={creator.name}
                width={48}
                height={48}
                className="object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">
                  Подписка на {creator.name}
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
                Выберите тип подписки
              </span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {subscriptionTiers.map((tier) => {
                const isSelected = selectedTier === tier.id
                
                return (
                  <div
                    key={tier.id}
                    className={`relative border-2 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-105 bg-slate-800/50 backdrop-blur-sm p-6 ${
                      isSelected 
                        ? tier.id === 'basic' 
                          ? 'border-gray-500 shadow-xl shadow-gray-500/25'
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
                          Популярный
                        </span>
                      </div>
                    )}

                    <div className="text-center mb-4">
                      <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-r ${tier.color} flex items-center justify-center`}>
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
                    </div>

                    <ul className="space-y-2">
                      {tier.features.slice(0, 4).map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckIcon className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span className="text-slate-300 text-sm">
                            {feature}
                          </span>
                        </li>
                      ))}
                      {tier.features.length > 4 && (
                        <li className="text-slate-400 text-sm text-center">
                          +{tier.features.length - 4} больше...
                        </li>
                      )}
                    </ul>
                  </div>
                )
              })}
            </div>
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
                  Показывать в карусели подписок
                </div>
                <p className="text-slate-400 text-sm mt-1">
                  {creator.name} будет отображаться в вашей карусели подписок на странице авторов
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
                selectedTier === 'basic'
                  ? 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700'
                  : selectedTier === 'vip'
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
              } shadow-xl disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isProcessing ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Обработка...
                </div>
              ) : !connected ? (
                'Подключите кошелек'
              ) : (
                `Подписаться за ${selectedSubscription?.price} ${selectedSubscription?.currency}/мес`
              )}
            </button>
            
            <button
              onClick={onClose}
              className="px-8 py-4 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 rounded-xl hover:bg-slate-700/50 transition-all font-semibold text-lg"
            >
              Отмена
            </button>
          </div>

          <p className="mt-4 text-slate-400 text-center text-sm">
            Подписка автоматически продлевается каждый месяц. Вы можете отменить в любое время.
          </p>
        </div>
      </div>
    </div>
  )
} 