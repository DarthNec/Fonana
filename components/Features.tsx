'use client'

import { 
  CurrencyDollarIcon, 
  ShieldCheckIcon, 
  GlobeAltIcon, 
  UserGroupIcon,
  CreditCardIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

const features = [
  {
    name: 'Криптооплата',
    description: 'Принимайте оплату в SOL, USDC, ETH напрямую на свой кошелёк без посредников.',
    icon: CurrencyDollarIcon,
  },
  {
    name: 'Безопасность Web3',
    description: 'Все транзакции прозрачны и защищены блокчейном. Никаких скрытых комиссий.',
    icon: ShieldCheckIcon,
  },
  {
    name: 'Глобальный доступ',
    description: 'Принимайте поддержку от фанатов со всего мира без ограничений.',
    icon: GlobeAltIcon,
  },
  {
    name: 'NFT-подписки',
    description: 'Создавайте уникальные NFT для подписчиков с возможностью перепродажи.',
    icon: UserGroupIcon,
  },
  {
    name: 'Мгновенные выплаты',
    description: 'Получайте средства мгновенно без задержек на банковские переводы.',
    icon: CreditCardIcon,
  },
  {
    name: 'Аналитика',
    description: 'Отслеживайте доходы, активность подписчиков и эффективность контента.',
    icon: ChartBarIcon,
  },
]

export function Features() {
  return (
    <div id="features" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-primary-400">Все возможности</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Всё для успешной монетизации творчества
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-300">
            Fonana предоставляет все инструменты для получения поддержки от фанатов через современные криптотехнологии.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
            {features.map((feature) => (
              <div key={feature.name} className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-white">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
                    <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  {feature.name}
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-300">{feature.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
} 