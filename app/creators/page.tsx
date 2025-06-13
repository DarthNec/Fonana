'use client'

import CreatorsExplorer from '../../components/CreatorsExplorer'
import SubscriptionsCarousel from '../../components/SubscriptionsCarousel'

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
          
          {/* Subscriptions Section */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              Ваши подписки
            </h2>
            <SubscriptionsCarousel />
          </div>
        </div>
      </section>

      {/* Creators Explorer */}
      <CreatorsExplorer />
    </div>
  )
} 