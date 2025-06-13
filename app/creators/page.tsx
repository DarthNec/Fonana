'use client'

import CreatorsExplorer from '@/components/CreatorsExplorer'
import SubscriptionsCarousel from '@/components/SubscriptionsCarousel'
import RecommendedCreators from '@/components/RecommendedCreators'

export default function CreatorsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <section className="pt-32 pb-8 lg:pt-40 lg:pb-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-5xl md:text-6xl font-black mb-6">
              <span className="text-white">Исследуйте </span>
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                авторов
              </span>
            </h1>
          </div>
          
          {/* Recommended Section */}
          <div className="mb-12">
            <div className="mb-6">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-purple-500"></div>
                <h2 className="text-2xl font-bold text-white text-center">
                  Ваши подписки
                </h2>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-pink-500"></div>
              </div>
              <p className="text-sm text-slate-400 text-center">Авторы, на которых вы подписаны</p>
            </div>
            <RecommendedCreators />
          </div>

          {/* Subscriptions Section */}
          <div className="mb-12">
            <div className="mb-6">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-purple-500"></div>
                <h2 className="text-2xl font-bold text-white text-center">
                  Рекомендации для вас
                </h2>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-pink-500"></div>
              </div>
              <p className="text-sm text-slate-400 text-center">Авторы, которые могут вас заинтересовать</p>
            </div>
            <SubscriptionsCarousel />
          </div>
        </div>
      </section>

      {/* Creators Explorer */}
      <section className="py-8">
        <div className="container mx-auto px-4 mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-purple-500"></div>
            <h2 className="text-2xl font-bold text-white text-center">
              Все авторы
            </h2>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-pink-500"></div>
          </div>
          <p className="text-sm text-slate-400 text-center">Откройте для себя новых талантливых креаторов</p>
        </div>
        <CreatorsExplorer />
      </section>
    </div>
  )
} 