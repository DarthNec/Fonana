'use client'

import { ArrowRightIcon, CurrencyDollarIcon, ShieldCheckIcon, GlobeAltIcon } from '@heroicons/react/24/outline'

export function Hero() {
  return (
    <div className="relative isolate overflow-hidden">
      <div className="mx-auto max-w-7xl pb-24 pt-10 sm:pb-32 lg:grid lg:grid-cols-2 lg:gap-x-8 lg:px-8 lg:py-40">
        <div className="px-6 lg:px-0 lg:pt-4">
          <div className="mx-auto max-w-2xl">
            <div className="max-w-lg">
              <h1 className="mt-10 text-4xl font-bold tracking-tight text-white sm:text-6xl">
                Поддерживайте авторов с помощью 
                <span className="neon-text"> криптовалют</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-300">
                Fonana - это Web3 платформа, где авторы получают поддержку через подписки, донаты и продажи контента. 
                Все транзакции прозрачны и проходят напрямую между кошельками.
              </p>
              <div className="mt-10 flex items-center gap-x-6">
                <button className="rounded-md bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 transition-all flex items-center gap-2">
                  Начать как автор
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
                <button className="text-sm font-semibold leading-6 text-white hover:text-primary-300 transition-colors">
                  Поддержать авторов <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-20 sm:mt-24 md:mx-auto md:max-w-2xl lg:mx-0 lg:mt-0 lg:w-screen">
          <div className="absolute inset-y-0 right-1/2 -z-10 -mr-10 w-[200%] skew-x-[-30deg] bg-white/10 shadow-xl shadow-primary-600/10 ring-1 ring-primary-50 md:-mr-20 lg:-mr-36" />
          <div className="shadow-lg md:rounded-3xl">
            <div className="bg-primary-500 [clip-path:inset(0)] md:[clip-path:inset(0_round_theme(borderRadius.3xl))]">
              <div className="absolute -inset-y-px left-1/2 -z-10 ml-10 w-[200%] skew-x-[-30deg] bg-primary-100 opacity-20 ring-1 ring-inset ring-white md:ml-20 lg:ml-36" />
              <div className="relative px-6 pt-8 sm:pt-16 md:pl-16 md:pr-0">
                <div className="mx-auto max-w-2xl md:mx-0 md:max-w-none">
                  <div className="w-screen overflow-hidden rounded-tl-xl bg-gray-900">
                    <div className="flex bg-gray-800/40 ring-1 ring-white/5">
                      <div className="-mb-px flex text-sm font-medium leading-6 text-gray-400">
                        <div className="border-b border-r border-b-white/20 border-r-white/10 bg-white/5 px-4 py-2 text-white">
                          Creator Dashboard
                        </div>
                        <div className="border-r border-gray-600/10 px-4 py-2">
                          Analytics
                        </div>
                      </div>
                    </div>
                    <div className="px-6 pb-14 pt-6">
                      {/* Демо контент панели */}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="crypto-card">
                          <div className="flex items-center">
                            <CurrencyDollarIcon className="h-8 w-8 text-green-400" />
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-400">Общий доход</p>
                              <p className="text-2xl font-bold text-white">1,247 USDC</p>
                            </div>
                          </div>
                        </div>
                        <div className="crypto-card">
                          <div className="flex items-center">
                            <ShieldCheckIcon className="h-8 w-8 text-blue-400" />
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-400">Подписчики</p>
                              <p className="text-2xl font-bold text-white">342</p>
                            </div>
                          </div>
                        </div>
                        <div className="crypto-card">
                          <div className="flex items-center">
                            <GlobeAltIcon className="h-8 w-8 text-purple-400" />
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-400">NFT проданы</p>
                              <p className="text-2xl font-bold text-white">89</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 