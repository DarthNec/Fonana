'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { 
  UserGroupIcon, 
  LinkIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  UserPlusIcon,
  ShoppingCartIcon,
  CalendarIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import Avatar from '@/components/Avatar'
import { formatSolAmount } from '@/lib/solana/payments'

interface ReferralData {
  id: string
  nickname: string
  fullName?: string
  avatar?: string
  createdAt: string
  isCreator: boolean
  postsCount: number
  subscribersCount: number
}

interface EarningsData {
  totalEarnings: number
  totalTransactions: number
  earningsByType: {
    subscriptions: number
    posts: number
  }
  earningsByCurrency: Record<string, number>
  recentTransactions: any[]
}

export default function ReferralsPage() {
  const { user } = useUser()
  const [referrals, setReferrals] = useState<ReferralData[]>([])
  const [earnings, setEarnings] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [sortBy, setSortBy] = useState<'date' | 'profit' | 'name'>('date')
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals' | 'transactions'>('overview')

  const referralLink = user?.nickname 
    ? `${window.location.origin}/${user.nickname}`
    : ''

  useEffect(() => {
    if (user?.id) {
      fetchReferrals()
      fetchEarnings()
    }
  }, [user?.id])

  const fetchReferrals = async () => {
    try {
      const response = await fetch(`/api/user/referrals?userId=${user?.id}`)
      const data = await response.json()
      setReferrals(data.referrals || [])
    } catch (error) {
      console.error('Error fetching referrals:', error)
      toast.error('Ошибка загрузки рефералов')
    } finally {
      setLoading(false)
    }
  }

  const fetchEarnings = async () => {
    try {
      const response = await fetch(`/api/user/referral-earnings?userId=${user?.id}`)
      const data = await response.json()
      setEarnings(data)
    } catch (error) {
      console.error('Error fetching earnings:', error)
    }
  }

  const copyLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink)
      setCopied(true)
      toast.success('Ссылка скопирована!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const sortedReferrals = [...referrals].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'profit':
        return b.subscribersCount - a.subscribersCount
      case 'name':
        return (a.fullName || a.nickname).localeCompare(b.fullName || b.nickname)
      default:
        return 0
    }
  })

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Войдите в систему</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Реферальная программа
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Приглашайте новых пользователей и зарабатывайте
          </p>
        </div>

        {/* Реферальная ссылка */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Ваша реферальная ссылка
          </h2>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
            />
            <button
              onClick={copyLink}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
            >
              <LinkIcon className="w-5 h-5" />
              <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
            </button>
          </div>
        </div>

        {/* Табы */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Обзор
            </button>
            <button
              onClick={() => setActiveTab('referrals')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'referrals'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Рефералы ({referrals.length})
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'transactions'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Транзакции
            </button>
          </nav>
        </div>

        {/* Контент */}
        {activeTab === 'overview' && (
          <>
            {/* Статистика */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Общий заработок
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {earnings ? formatSolAmount(earnings.totalEarnings) : '0 SOL'}
                    </p>
                  </div>
                  <CurrencyDollarIcon className="w-8 h-8 text-green-500" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Всего рефералов
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {referrals.length}
                    </p>
                  </div>
                  <UserGroupIcon className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Активные создатели
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {referrals.filter(r => r.isCreator).length}
                    </p>
                  </div>
                  <UserPlusIcon className="w-8 h-8 text-purple-500" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Транзакций
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {earnings?.totalTransactions || 0}
                    </p>
                  </div>
                  <ChartBarIcon className="w-8 h-8 text-orange-500" />
                </div>
              </div>
            </div>

            {/* Заработок по типам */}
            {earnings && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Заработок по типам
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Подписки</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatSolAmount(earnings.earningsByType.subscriptions)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Платные посты</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatSolAmount(earnings.earningsByType.posts)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Заработок по валютам
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(earnings.earningsByCurrency).map(([currency, amount]) => (
                      <div key={currency} className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">{currency}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {currency === 'SOL' ? formatSolAmount(amount) : `${amount.toFixed(2)} ${currency}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'referrals' && (
          <>
            {/* Сортировка */}
            <div className="flex justify-end mb-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'profit' | 'name')}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              >
                <option value="date">По дате</option>
                <option value="profit">По доходу</option>
                <option value="name">По имени</option>
              </select>
            </div>

            {/* Список рефералов */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : sortedReferrals.length > 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {sortedReferrals.map((referral) => (
                    <div key={referral.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Avatar
                            src={referral.avatar}
                            alt={referral.fullName || referral.nickname}
                            seed={referral.nickname}
                            size={48}
                            rounded="xl"
                          />
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {referral.fullName || referral.nickname}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              @{referral.nickname}
                            </p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Присоединился {new Date(referral.createdAt).toLocaleDateString('ru-RU')}
                              </span>
                              {referral.isCreator && (
                                <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full">
                                  Создатель
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {referral.postsCount} постов
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {referral.subscribersCount} подписчиков
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  У вас пока нет рефералов
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  Поделитесь своей реферальной ссылкой, чтобы начать зарабатывать
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            {earnings && earnings.recentTransactions.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {earnings.recentTransactions.map((tx: any) => (
                  <div key={tx.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-lg ${
                          tx.type === 'subscription' 
                            ? 'bg-blue-100 dark:bg-blue-900' 
                            : 'bg-green-100 dark:bg-green-900'
                        }`}>
                          {tx.type === 'subscription' ? (
                            <UserPlusIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <ShoppingCartIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {tx.type === 'subscription' ? 'Подписка' : 'Покупка поста'}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {tx.buyer.fullName || tx.buyer.nickname} → {tx.creator.fullName || tx.creator.nickname}
                          </p>
                          {tx.postTitle && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                              "{tx.postTitle}"
                            </p>
                          )}
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {new Date(tx.date).toLocaleString('ru-RU')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                          +{tx.currency === 'SOL' ? formatSolAmount(tx.amount) : `${tx.amount.toFixed(2)} ${tx.currency}`}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Комиссия 5%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Транзакций пока нет
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  Здесь будут отображаться ваши реферальные комиссии
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 