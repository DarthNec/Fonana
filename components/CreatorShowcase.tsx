'use client'

import { StarIcon } from '@heroicons/react/24/solid'

const creators = [
  {
    id: 1,
    name: 'Анна Криптохудожница',
    category: 'NFT Арт',
    subscribers: 1250,
    monthlyEarning: '4,500 USDC',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2787&q=80',
    rating: 4.9,
    description: 'Создаю уникальные NFT коллекции и обучаю цифровому искусству'
  },
  {
    id: 2,
    name: 'Максим Блокчейн',
    category: 'Крипто-образование',
    subscribers: 3420,
    monthlyEarning: '8,200 USDC',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2787&q=80',
    rating: 4.8,
    description: 'Делюсь знаниями о DeFi, торговле и инвестициях в криптовалюты'
  },
  {
    id: 3,
    name: 'Елена Деватор',
    category: 'Web3 Разработка',
    subscribers: 890,
    monthlyEarning: '3,100 USDC',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
    rating: 5.0,
    description: 'Обучаю созданию dApps на Solana и Ethereum. Смарт-контракты и фронтенд'
  }
]

export function CreatorShowcase() {
  return (
    <div id="creators" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Успешные авторы на Fonana
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-300">
            Присоединяйтесь к сообществу авторов, которые уже зарабатывают криптовалюты благодаря поддержке фанатов.
          </p>
        </div>
        
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {creators.map((creator) => (
            <div key={creator.id} className="crypto-card hover:scale-105 transition-transform duration-300">
              <div className="flex items-center gap-4 mb-4">
                <img
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-primary-500"
                  src={creator.avatar}
                  alt={creator.name}
                />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {creator.name}
                  </h3>
                  <p className="text-sm text-primary-600">{creator.category}</p>
                </div>
              </div>
              
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {creator.description}
              </p>
              
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(creator.rating)
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {creator.rating}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Подписчики</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {creator.subscribers.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Месячный доход</p>
                  <p className="text-lg font-semibold text-green-600">
                    {creator.monthlyEarning}
                  </p>
                </div>
              </div>
              
              <button className="mt-4 w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                Поддержать автора
              </button>
            </div>
          ))}
        </div>
        
        <div className="mt-16 text-center">
          <button className="rounded-md bg-primary-600 px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 transition-all">
            Стать автором
          </button>
        </div>
      </div>
    </div>
  )
} 