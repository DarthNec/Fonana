'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Avatar from './Avatar'
import { EyeIcon, EyeSlashIcon, UserIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { getCreatorById, mockUserSubscriptions } from '@/lib/mockData'

export default function UserSubscriptions() {
  // Преобразуем данные из mockUserSubscriptions в формат для компонента
  const convertedSubscriptions = mockUserSubscriptions.map((sub, index) => ({
    id: index + 1,
    creatorId: sub.creatorId,
    subscriptionTier: sub.plan,
    subscriptionPrice: `${sub.price} SOL`,
    subscribedAt: sub.subscribedAt,
    isPublicVisible: index !== 2, // Emma Charts будет скрыта, остальные видимы
    expiresAt: sub.validUntil
  }))

  const [subscriptions, setSubscriptions] = useState(convertedSubscriptions)

  const toggleVisibility = (subscriptionId: number) => {
    setSubscriptions(subs => 
      subs.map(sub => 
        sub.id === subscriptionId 
          ? { ...sub, isPublicVisible: !sub.isPublicVisible }
          : sub
      )
    )
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Basic': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'Premium': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400'
      case 'VIP': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  if (subscriptions.length === 0) {
    return null
  }

  return (
    <section className="section-padding bg-gradient-to-br from-indigo-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="container-modern">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              My Subscriptions
            </h2>
            <p className="text-muted">
              Manage your subscriptions and their visibility
            </p>
          </div>
          <div className="text-sm text-muted">
            {subscriptions.length} active subscriptions
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {subscriptions.map((subscription) => {
            const creator = getCreatorById(subscription.creatorId)
            if (!creator) return null

            return (
              <div
                key={subscription.id}
                className="relative bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-300"
              >
                {/* Индикатор видимости */}
                <div className="absolute top-4 right-4">
                  <button
                    onClick={() => toggleVisibility(subscription.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      subscription.isPublicVisible
                        ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-500'
                    }`}
                    title={subscription.isPublicVisible ? 'Hide from public view' : 'Show publicly'}
                  >
                    {subscription.isPublicVisible ? (
                      <EyeIcon className="w-4 h-4" />
                    ) : (
                      <EyeSlashIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Информация о создателе */}
                <div className="flex items-start space-x-4 mb-4">
                  <Avatar
                    src={creator.avatar}
                    alt={creator.name}
                    seed={creator.username}
                    size={48}
                    rounded="full"
                    className="flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/creator/${creator.id}`}
                      className="font-semibold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      {creator.name}
                    </Link>
                    <p className="text-sm text-muted">{creator.username}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTierColor(subscription.subscriptionTier)}`}>
                        {subscription.subscriptionTier}
                      </span>
                      <span className="text-xs text-muted">
                        {subscription.subscriptionPrice}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Детали подписки */}
                <div className="space-y-2 text-sm text-muted">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    <span>Subscribed since {new Date(subscription.subscribedAt).toLocaleDateString('en-US')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4" />
                    <span>Valid until {new Date(subscription.expiresAt).toLocaleDateString('en-US')}</span>
                  </div>
                </div>

                {/* Быстрые действия */}
                <div className="flex gap-2 mt-4">
                  <Link
                    href={`/creator/${creator.id}`}
                    className="flex-1 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors text-center"
                  >
                    View
                  </Link>
                  <Link
                    href={`/creator/${creator.id}/subscribe`}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Manage
                  </Link>
                </div>

                {/* Статус видимости */}
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>Public visibility:</span>
                    <span className={subscription.isPublicVisible ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>
                      {subscription.isPublicVisible ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Кнопка для поиска новых креаторов */}
        <div className="mt-8 text-center">
          <Link
            href="#creators"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            Discover New Creators
          </Link>
        </div>
      </div>
    </section>
  )
} 