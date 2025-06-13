'use client'

import React, { useState } from 'react'
import { 
  SparklesIcon,
  CurrencyDollarIcon,
  HeartIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'

interface TierFeature {
  id: string
  text: string
  enabled: boolean
}

interface SubscriptionTier {
  id: string
  name: string
  price: number
  currency: string
  description: string
  features: TierFeature[]
  color: string
  icon: React.ComponentType<any>
  enabled: boolean
}

const defaultFeatures = {
  basic: [
    { id: 'basic-1', text: 'Доступ к публичным постам', enabled: true },
    { id: 'basic-2', text: 'Участие в чате сообщества', enabled: true },
    { id: 'basic-3', text: 'Ежемесячные стримы', enabled: true },
    { id: 'basic-4', text: 'Базовое взаимодействие с автором', enabled: true },
    { id: 'basic-5', text: 'Доступ к архиву контента', enabled: false },
    { id: 'basic-6', text: 'Значок подписчика', enabled: false }
  ],
  premium: [
    { id: 'premium-1', text: 'Все возможности Basic', enabled: true },
    { id: 'premium-2', text: 'Эксклюзивный премиум контент', enabled: true },
    { id: 'premium-3', text: 'Еженедельные приватные стримы', enabled: true },
    { id: 'premium-4', text: 'Приоритет в комментариях', enabled: true },
    { id: 'premium-5', text: 'Личные сообщения', enabled: true },
    { id: 'premium-6', text: 'Ранний доступ к новому контенту', enabled: true },
    { id: 'premium-7', text: 'Скидки на мерч', enabled: false },
    { id: 'premium-8', text: 'Голосование за контент', enabled: false }
  ],
  vip: [
    { id: 'vip-1', text: 'Все возможности Premium', enabled: true },
    { id: 'vip-2', text: 'Персональные видео сообщения', enabled: true },
    { id: 'vip-3', text: 'Видеозвонки один на один (ежемесячно)', enabled: true },
    { id: 'vip-4', text: 'Запросы на кастомный контент', enabled: true },
    { id: 'vip-5', text: 'Доступ за кулисы', enabled: true },
    { id: 'vip-6', text: 'Эксклюзивные NFT дропы', enabled: true },
    { id: 'vip-7', text: 'Персональный обзор портфолио', enabled: false },
    { id: 'vip-8', text: 'Приглашение на закрытые мероприятия', enabled: false },
    { id: 'vip-9', text: 'Упоминание в контенте', enabled: false }
  ]
}

export default function SubscriptionTiersSettings() {
  const [tiers, setTiers] = useState<SubscriptionTier[]>([
    {
      id: 'basic',
      name: 'Basic',
      price: 0.05,
      currency: 'SOL',
      description: 'Доступ к базовому контенту',
      features: [...defaultFeatures.basic],
      color: 'from-gray-400 to-gray-600',
      icon: CurrencyDollarIcon,
      enabled: true
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 0.15,
      currency: 'SOL',
      description: 'Расширенный доступ с эксклюзивным контентом',
      features: [...defaultFeatures.premium],
      color: 'from-indigo-500 to-purple-600',
      icon: SparklesIcon,
      enabled: true
    },
    {
      id: 'vip',
      name: 'VIP',
      price: 0.35,
      currency: 'SOL',
      description: 'Максимальный доступ с личным взаимодействием',
      features: [...defaultFeatures.vip],
      color: 'from-yellow-400 to-orange-500',
      icon: HeartIcon,
      enabled: true
    }
  ])

  const [showRecommendations, setShowRecommendations] = useState(false)

  const updateTierPrice = (tierId: string, price: number) => {
    setTiers(prev => prev.map(tier => 
      tier.id === tierId ? { ...tier, price } : tier
    ))
  }

  const updateTierDescription = (tierId: string, description: string) => {
    setTiers(prev => prev.map(tier => 
      tier.id === tierId ? { ...tier, description } : tier
    ))
  }

  const toggleTierEnabled = (tierId: string) => {
    const enabledCount = tiers.filter(t => t.enabled).length
    const tierToToggle = tiers.find(t => t.id === tierId)
    
    if (tierToToggle?.enabled && enabledCount <= 1) {
      toast.error('Должен быть активен хотя бы один тарифный план')
      return
    }

    setTiers(prev => prev.map(tier => 
      tier.id === tierId ? { ...tier, enabled: !tier.enabled } : tier
    ))
  }

  const toggleFeature = (tierId: string, featureId: string) => {
    setTiers(prev => prev.map(tier => 
      tier.id === tierId 
        ? {
            ...tier,
            features: tier.features.map(feature =>
              feature.id === featureId 
                ? { ...feature, enabled: !feature.enabled }
                : feature
            )
          }
        : tier
    ))
  }

  const addCustomFeature = (tierId: string, featureText: string) => {
    if (!featureText.trim()) return

    setTiers(prev => prev.map(tier => 
      tier.id === tierId 
        ? {
            ...tier,
            features: [
              ...tier.features,
              {
                id: `custom-${Date.now()}`,
                text: featureText,
                enabled: true
              }
            ]
          }
        : tier
    ))
  }

  const removeFeature = (tierId: string, featureId: string) => {
    setTiers(prev => prev.map(tier => 
      tier.id === tierId 
        ? {
            ...tier,
            features: tier.features.filter(f => f.id !== featureId)
          }
        : tier
    ))
  }

  const applyRecommendedSettings = () => {
    // Применяем рекомендованные настройки для разных типов контента
    const contentType = 'standard' // Здесь можно определить тип контента автора
    
    if (contentType === 'standard') {
      setTiers([
        {
          ...tiers[0],
          price: 0.05,
          features: defaultFeatures.basic.map(f => ({ ...f, enabled: true })).slice(0, 4)
        },
        {
          ...tiers[1],
          price: 0.15,
          features: defaultFeatures.premium.map(f => ({ ...f, enabled: true })).slice(0, 6)
        },
        {
          ...tiers[2],
          price: 0.35,
          features: defaultFeatures.vip.map(f => ({ ...f, enabled: true })).slice(0, 7)
        }
      ])
    }
    
    toast.success('Применены рекомендованные настройки')
    setShowRecommendations(false)
  }

  const saveTiers = () => {
    // Здесь будет сохранение в базу данных
    console.log('Saving tiers:', tiers)
    toast.success('Настройки тарифов сохранены!')
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
            <SparklesIcon className="w-5 h-5 text-white" />
          </div>
          Настройки тарифных планов
        </h2>
        
        <button
          onClick={() => setShowRecommendations(!showRecommendations)}
          className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-xl font-medium transition-all duration-300 flex items-center gap-2"
        >
          <InformationCircleIcon className="w-5 h-5" />
          Рекомендации
        </button>
      </div>

      {/* Recommendations */}
      {showRecommendations && (
        <div className="mb-8 p-6 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
          <h3 className="text-lg font-semibold text-purple-300 mb-4">
            Рекомендованные настройки для вашего типа контента
          </h3>
          <p className="text-purple-200 mb-4">
            Основываясь на вашей категории и типе контента, мы рекомендуем следующие настройки:
          </p>
          <ul className="space-y-2 text-purple-100 mb-6">
            <li className="flex items-start gap-2">
              <CheckIcon className="w-5 h-5 text-purple-400 mt-0.5" />
              <span>Basic (0.05 SOL): 4 основные функции для новых подписчиков</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckIcon className="w-5 h-5 text-purple-400 mt-0.5" />
              <span>Premium (0.15 SOL): 6 расширенных функций для активных фанатов</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckIcon className="w-5 h-5 text-purple-400 mt-0.5" />
              <span>VIP (0.35 SOL): 7 эксклюзивных функций для самых преданных</span>
            </li>
          </ul>
          <button
            onClick={applyRecommendedSettings}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105"
          >
            Применить рекомендации
          </button>
        </div>
      )}

      {/* Tiers */}
      <div className="space-y-8">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={`border rounded-2xl p-6 transition-all duration-300 ${
              tier.enabled 
                ? 'border-slate-600/50 bg-slate-700/30' 
                : 'border-slate-700/30 bg-slate-800/30 opacity-60'
            }`}
          >
            {/* Tier Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 bg-gradient-to-r ${tier.color} rounded-xl flex items-center justify-center`}>
                  <tier.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                  <p className="text-slate-400 text-sm">
                    {tier.enabled ? 'Активен' : 'Отключен'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => toggleTierEnabled(tier.id)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${
                  tier.enabled 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                    : 'bg-slate-600'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                  tier.enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {tier.enabled && (
              <>
                {/* Price and Description */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Цена (SOL/месяц)
                    </label>
                    <input
                      type="number"
                      value={tier.price}
                      onChange={(e) => updateTierPrice(tier.id, parseFloat(e.target.value) || 0)}
                      step="0.01"
                      min="0"
                      className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Описание
                    </label>
                    <input
                      type="text"
                      value={tier.description}
                      onChange={(e) => updateTierDescription(tier.id, e.target.value)}
                      className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                      placeholder="Краткое описание тарифа"
                    />
                  </div>
                </div>

                {/* Features */}
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3">
                    Возможности тарифа
                  </h4>
                  <div className="space-y-2">
                    {tier.features.map((feature) => (
                      <div
                        key={feature.id}
                        className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl group hover:bg-slate-700/50 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleFeature(tier.id, feature.id)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                              feature.enabled
                                ? 'bg-purple-500 border-purple-500'
                                : 'border-slate-500 hover:border-purple-400'
                            }`}
                          >
                            {feature.enabled && (
                              <CheckIcon className="w-3 h-3 text-white" />
                            )}
                          </button>
                          <span className={`${
                            feature.enabled ? 'text-white' : 'text-slate-400'
                          }`}>
                            {feature.text}
                          </span>
                        </div>
                        
                        {feature.id.startsWith('custom-') && (
                          <button
                            onClick={() => removeFeature(tier.id, feature.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded-lg transition-all"
                          >
                            <TrashIcon className="w-4 h-4 text-red-400" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Custom Feature */}
                  <div className="mt-4">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        const input = e.currentTarget.elements.namedItem('feature') as HTMLInputElement
                        if (input.value) {
                          addCustomFeature(tier.id, input.value)
                          input.value = ''
                        }
                      }}
                      className="flex gap-2"
                    >
                      <input
                        name="feature"
                        type="text"
                        placeholder="Добавить свою возможность"
                        className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-xl transition-all duration-300"
                      >
                        <PlusIcon className="w-5 h-5" />
                      </button>
                    </form>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={saveTiers}
          className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-bold transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/25"
        >
          Сохранить настройки тарифов
        </button>
      </div>
    </div>
  )
} 