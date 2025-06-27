'use client'

import React, { useEffect, useState } from 'react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { format } from 'date-fns'
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  UsersIcon,
  DocumentTextIcon,
  ChatBubbleLeftEllipsisIcon,
  GiftIcon,
  ShoppingBagIcon,
  CalendarIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useSolRate } from '@/lib/hooks/useSolRate'
import { useCreatorData } from '@/lib/hooks/useCreatorData'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface RevenueChartProps {}

interface SubscriberData {
  user: {
    id: string
    nickname: string | null
    fullName: string | null
    avatar: string | null
    wallet: string | null
  }
  totalSpent: number
  breakdown: {
    subscriptions: number
    posts: number
    messages: number
    tips: number
  }
  transactions: number
  lastActivity: string | null
}

interface AnalyticsData {
  period: string
  revenue: {
    current: number
    previous: number
    growth: number
    byPeriod: Record<string, number>
    bySource: {
      subscriptions: {
        total: number
        byTier: {
          basic: { revenue: number; count: number }
          premium: { revenue: number; count: number }
          vip: { revenue: number; count: number }
        }
      }
      posts: {
        total: number
        count: number
        topPosts: Array<{
          post: {
            id: string
            title: string
            thumbnail: string | null
            price: number | null
          }
          revenue: number
          purchases: number
        }>
      }
      messages: {
        ppv: { total: number; count: number }
        tips: { total: number; count: number }
      }
    }
  }
  tierEfficiency: {
    basic: number
    premium: number
    vip: number
  }
  topSubscribers: SubscriberData[]
  allSubscribers: SubscriberData[]
  engagement: {
    totalViews: number
    totalLikes: number
    totalComments: number
    averageViews: number
    engagementRate: number
  }
  subscribers: {
    total: number
    new: number
    growthRate: number
  }
}

export default function RevenueChart({}: RevenueChartProps) {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week')
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAllSubscribers, setShowAllSubscribers] = useState(false)
  const [subscribersPage, setSubscribersPage] = useState(0)
  const { rate: solRate } = useSolRate()
  const { creator } = useCreatorData()
  
  const subscribersPerPage = 10

  useEffect(() => {
    if (creator) {
      fetchAnalytics()
    }
  }, [creator, period])

  const fetchAnalytics = async () => {
    if (!creator) return
    
    try {
      setIsLoading(true)
      const response = await fetch(`/api/creators/analytics?creatorId=${creator.id}&period=${period}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      } else {
        console.error('Analytics API error:', await response.text())
        toast.error('Ошибка загрузки аналитики')
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast.error('Ошибка загрузки аналитики')
    } finally {
      setIsLoading(false)
    }
  }

  const exportToCSV = () => {
    if (!analytics) return

    // Prepare data for CSV
    const csvData = []
    
    // Revenue by period
    csvData.push(['Доходы по периодам'])
    csvData.push(['Дата', 'Доход (SOL)', 'Доход (USD)'])
    Object.entries(analytics.revenue.byPeriod).forEach(([date, amount]) => {
      csvData.push([date, amount.toFixed(4), (amount * solRate).toFixed(2)])
    })
    
    csvData.push([])
    csvData.push(['Доходы по источникам'])
    csvData.push(['Источник', 'Доход (SOL)', 'Доход (USD)', 'Количество'])
    csvData.push(['Подписки - Basic', analytics.revenue.bySource.subscriptions.byTier.basic.revenue.toFixed(4), (analytics.revenue.bySource.subscriptions.byTier.basic.revenue * solRate).toFixed(2), analytics.revenue.bySource.subscriptions.byTier.basic.count])
    csvData.push(['Подписки - Premium', analytics.revenue.bySource.subscriptions.byTier.premium.revenue.toFixed(4), (analytics.revenue.bySource.subscriptions.byTier.premium.revenue * solRate).toFixed(2), analytics.revenue.bySource.subscriptions.byTier.premium.count])
    csvData.push(['Подписки - VIP', analytics.revenue.bySource.subscriptions.byTier.vip.revenue.toFixed(4), (analytics.revenue.bySource.subscriptions.byTier.vip.revenue * solRate).toFixed(2), analytics.revenue.bySource.subscriptions.byTier.vip.count])
    csvData.push(['Платные посты', analytics.revenue.bySource.posts.total.toFixed(4), (analytics.revenue.bySource.posts.total * solRate).toFixed(2), analytics.revenue.bySource.posts.count])
    csvData.push(['PPV сообщения', analytics.revenue.bySource.messages.ppv.total.toFixed(4), (analytics.revenue.bySource.messages.ppv.total * solRate).toFixed(2), analytics.revenue.bySource.messages.ppv.count])
    csvData.push(['Чаевые', analytics.revenue.bySource.messages.tips.total.toFixed(4), (analytics.revenue.bySource.messages.tips.total * solRate).toFixed(2), analytics.revenue.bySource.messages.tips.count])
    
    csvData.push([])
    csvData.push(['Все подписчики'])
    csvData.push(['Пользователь', 'Всего потрачено (SOL)', 'Подписки', 'Посты', 'Сообщения', 'Чаевые', 'Транзакций'])
    analytics.allSubscribers.forEach(item => {
      csvData.push([
        item.user.fullName || item.user.nickname || 'Anonymous',
        item.totalSpent.toFixed(4),
        item.breakdown.subscriptions.toFixed(4),
        item.breakdown.posts.toFixed(4),
        item.breakdown.messages.toFixed(4),
        item.breakdown.tips.toFixed(4),
        item.transactions
      ])
    })
    
    // Convert to CSV string
    const csvContent = csvData.map(row => row.join(',')).join('\n')
    
    // Download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `analytics_${period}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success('Данные экспортированы')
  }

  const formatPeriodLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    switch (period) {
      case 'day':
        return format(date, 'd MMM')
      case 'week':
        return `Неделя с ${format(date, 'd MMM')}`
      case 'month':
        return format(date, 'MMM yyyy')
      default:
        return dateStr
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return null
  }

  // Prepare chart data
  const chartLabels = Object.keys(analytics.revenue.byPeriod).map(formatPeriodLabel)

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Доход (SOL)',
        data: Object.values(analytics.revenue.byPeriod),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        tension: 0.3,
        fill: true
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.parsed.y
            return `${value.toFixed(4)} SOL (≈ $${(value * solRate).toFixed(2)} USD)`
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => `${value} SOL`
        }
      }
    }
  }

  // Revenue by source for doughnut chart
  const sourceData = {
    labels: ['Подписки', 'Посты', 'PPV сообщения', 'Чаевые'],
    datasets: [
      {
        data: [
          analytics.revenue.bySource.subscriptions.total,
          analytics.revenue.bySource.posts.total,
          analytics.revenue.bySource.messages.ppv.total,
          analytics.revenue.bySource.messages.tips.total
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(16, 185, 129, 0.8)'
        ]
      }
    ]
  }

  // Tier efficiency data
  const tierData = {
    labels: ['Basic', 'Premium', 'VIP'],
    datasets: [
      {
        label: 'Доход',
        data: [
          analytics.revenue.bySource.subscriptions.byTier.basic.revenue,
          analytics.revenue.bySource.subscriptions.byTier.premium.revenue,
          analytics.revenue.bySource.subscriptions.byTier.vip.revenue
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.8)'
      },
      {
        label: 'Эффективность',
        data: [
          analytics.tierEfficiency.basic,
          analytics.tierEfficiency.premium,
          analytics.tierEfficiency.vip
        ],
        backgroundColor: 'rgba(16, 185, 129, 0.8)'
      }
    ]
  }

  // Paginate subscribers
  const paginatedSubscribers = showAllSubscribers 
    ? analytics.allSubscribers.slice(subscribersPage * subscribersPerPage, (subscribersPage + 1) * subscribersPerPage)
    : analytics.topSubscribers

  const totalPages = Math.ceil(analytics.allSubscribers.length / subscribersPerPage)

  return (
    <div className="space-y-6">
      {/* Revenue Overview */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">График доходов</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={exportToCSV}
              className="p-2 text-gray-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              title="Экспорт в CSV"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
            </button>
            <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => setPeriod('day')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  period === 'day' 
                    ? 'bg-white dark:bg-slate-600 text-purple-600 dark:text-purple-400 shadow-sm' 
                    : 'text-gray-600 dark:text-slate-400'
                }`}
              >
                День
              </button>
              <button
                onClick={() => setPeriod('week')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  period === 'week' 
                    ? 'bg-white dark:bg-slate-600 text-purple-600 dark:text-purple-400 shadow-sm' 
                    : 'text-gray-600 dark:text-slate-400'
                }`}
              >
                Неделя
              </button>
              <button
                onClick={() => setPeriod('month')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  period === 'month' 
                    ? 'bg-white dark:bg-slate-600 text-purple-600 dark:text-purple-400 shadow-sm' 
                    : 'text-gray-600 dark:text-slate-400'
                }`}
              >
                Месяц
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Текущий период</p>
                <p className="text-2xl font-bold">{analytics.revenue.current.toFixed(4)} SOL</p>
                <p className="text-purple-200 text-xs">≈ ${(analytics.revenue.current * solRate).toFixed(2)} USD</p>
              </div>
              <CurrencyDollarIcon className="w-8 h-8 text-purple-200" />
            </div>
            <div className="mt-2 flex items-center">
              {analytics.revenue.growth > 0 ? (
                <>
                  <ArrowUpIcon className="w-4 h-4 text-green-300 mr-1" />
                  <span className="text-green-300 text-sm font-medium">+{analytics.revenue.growth.toFixed(1)}%</span>
                </>
              ) : analytics.revenue.growth < 0 ? (
                <>
                  <ArrowDownIcon className="w-4 h-4 text-red-300 mr-1" />
                  <span className="text-red-300 text-sm font-medium">{analytics.revenue.growth.toFixed(1)}%</span>
                </>
              ) : (
                <span className="text-purple-200 text-sm">0%</span>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Подписчики</p>
                <p className="text-2xl font-bold">{analytics.subscribers.total}</p>
                <p className="text-blue-200 text-xs">+{analytics.subscribers.new} новых</p>
              </div>
              <UsersIcon className="w-8 h-8 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Вовлеченность</p>
                <p className="text-2xl font-bold">{analytics.engagement.engagementRate.toFixed(1)}%</p>
                <p className="text-emerald-200 text-xs">{analytics.engagement.totalViews} просмотров</p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-emerald-200" />
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-64">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Revenue Sources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Source Breakdown */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Источники дохода</h3>
          <div className="h-64 flex items-center justify-center">
            <Doughnut 
              data={sourceData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                  },
                  tooltip: {
                    callbacks: {
                      label: (context: any) => {
                        const value = context.parsed
                        return `${context.label}: ${value.toFixed(4)} SOL`
                      }
                    }
                  }
                }
              }} 
            />
          </div>
          
          {/* Source Details */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-2">
                <UsersIcon className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">Подписки</span>
              </div>
              <span className="text-sm font-bold">{analytics.revenue.bySource.subscriptions.total.toFixed(4)} SOL</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-2">
                <DocumentTextIcon className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium">Платные посты</span>
              </div>
              <span className="text-sm font-bold">{analytics.revenue.bySource.posts.total.toFixed(4)} SOL</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-2">
                <ChatBubbleLeftEllipsisIcon className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">PPV сообщения</span>
              </div>
              <span className="text-sm font-bold">{analytics.revenue.bySource.messages.ppv.total.toFixed(4)} SOL</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-2">
                <GiftIcon className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium">Чаевые</span>
              </div>
              <span className="text-sm font-bold">{analytics.revenue.bySource.messages.tips.total.toFixed(4)} SOL</span>
            </div>
          </div>
        </div>

        {/* Tier Analysis */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Анализ тиров подписок</h3>
          <div className="h-64">
            <Bar 
              data={tierData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: true
                  },
                  tooltip: {
                    callbacks: {
                      label: (context: any) => {
                        const value = context.parsed.y
                        const label = context.dataset.label
                        if (label === 'Доход') {
                          return `${label}: ${value.toFixed(4)} SOL`
                        } else {
                          return `${label}: ${(value * 100).toFixed(1)}%`
                        }
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true
                  }
                }
              }} 
            />
          </div>
          
          {/* Tier Stats */}
          <div className="mt-4 space-y-2">
            {['basic', 'premium', 'vip'].map(tier => {
              const tierKey = tier as keyof typeof analytics.revenue.bySource.subscriptions.byTier
              const tierData = analytics.revenue.bySource.subscriptions.byTier[tierKey]
              return (
                <div key={tier} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <span className="text-sm font-medium capitalize">{tier}</span>
                  <div className="flex items-center gap-4 text-xs">
                    <span>{tierData.revenue.toFixed(4)} SOL</span>
                    <span className="text-gray-500 dark:text-slate-500">{tierData.count} подписок</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Top Content & Subscribers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Posts */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Топ платные посты</h3>
          <div className="space-y-3">
            {analytics.revenue.bySource.posts.topPosts.length > 0 ? (
              analytics.revenue.bySource.posts.topPosts.map((item, index) => (
                <div key={item.post.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <span className="text-sm font-bold text-purple-600 dark:text-purple-400 w-6">#{index + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.post.title}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-500">
                      {item.revenue.toFixed(4)} SOL • {item.purchases} покупок
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-slate-400 text-sm">Нет данных</p>
            )}
          </div>
        </div>

        {/* Top Subscribers */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Топ подписчики</h3>
          <div className="space-y-3">
            {analytics.topSubscribers.length > 0 ? (
              analytics.topSubscribers.slice(0, 5).map((item, index) => (
                <div key={item.user.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <span className="text-sm font-bold text-purple-600 dark:text-purple-400 w-6">#{index + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.user.fullName || item.user.nickname || 'Anonymous'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-500">
                      {item.totalSpent.toFixed(4)} SOL • {item.transactions} транзакций
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-slate-400 text-sm">Нет данных</p>
            )}
          </div>
        </div>
      </div>

      {/* All Subscribers Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {showAllSubscribers ? 'Все подписчики' : 'Топ-10 подписчиков'} ({analytics.allSubscribers.length})
          </h3>
          <button
            onClick={() => {
              setShowAllSubscribers(!showAllSubscribers)
              setSubscribersPage(0)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            {showAllSubscribers ? (
              <>
                Показать топ-10
                <ChevronUpIcon className="w-4 h-4" />
              </>
            ) : (
              <>
                Показать всех
                <ChevronDownIcon className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-gray-200 dark:border-slate-700">
                <th className="pb-3 text-sm font-medium text-gray-600 dark:text-slate-400">#</th>
                <th className="pb-3 text-sm font-medium text-gray-600 dark:text-slate-400">Пользователь</th>
                <th className="pb-3 text-sm font-medium text-gray-600 dark:text-slate-400 text-right">Всего (SOL)</th>
                <th className="pb-3 text-sm font-medium text-gray-600 dark:text-slate-400 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <UsersIcon className="w-4 h-4" />
                    <span>Подписки</span>
                  </div>
                </th>
                <th className="pb-3 text-sm font-medium text-gray-600 dark:text-slate-400 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <DocumentTextIcon className="w-4 h-4" />
                    <span>Посты</span>
                  </div>
                </th>
                <th className="pb-3 text-sm font-medium text-gray-600 dark:text-slate-400 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />
                    <span>PPV</span>
                  </div>
                </th>
                <th className="pb-3 text-sm font-medium text-gray-600 dark:text-slate-400 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <GiftIcon className="w-4 h-4" />
                    <span>Чаевые</span>
                  </div>
                </th>
                <th className="pb-3 text-sm font-medium text-gray-600 dark:text-slate-400 text-right">Активность</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSubscribers.map((item, index) => {
                const globalIndex = showAllSubscribers ? subscribersPage * subscribersPerPage + index : index
                return (
                  <tr key={item.user.id} className="border-b border-gray-100 dark:border-slate-700/50">
                    <td className="py-3 text-sm font-bold text-purple-600 dark:text-purple-400">
                      {globalIndex + 1}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        {item.user.avatar && (
                          <img 
                            src={item.user.avatar} 
                            alt={item.user.nickname || 'User'} 
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {item.user.fullName || item.user.nickname || 'Anonymous'}
                          </p>
                          {item.user.nickname && (
                            <p className="text-xs text-gray-500 dark:text-slate-500">
                              @{item.user.nickname}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {item.totalSpent.toFixed(4)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-500">
                        ≈ ${(item.totalSpent * solRate).toFixed(2)}
                      </p>
                    </td>
                    <td className="py-3 text-right text-sm text-gray-600 dark:text-slate-400">
                      {item.breakdown.subscriptions > 0 ? item.breakdown.subscriptions.toFixed(4) : '-'}
                    </td>
                    <td className="py-3 text-right text-sm text-gray-600 dark:text-slate-400">
                      {item.breakdown.posts > 0 ? item.breakdown.posts.toFixed(4) : '-'}
                    </td>
                    <td className="py-3 text-right text-sm text-gray-600 dark:text-slate-400">
                      {item.breakdown.messages > 0 ? item.breakdown.messages.toFixed(4) : '-'}
                    </td>
                    <td className="py-3 text-right text-sm text-gray-600 dark:text-slate-400">
                      {item.breakdown.tips > 0 ? item.breakdown.tips.toFixed(4) : '-'}
                    </td>
                    <td className="py-3 text-right">
                      {item.lastActivity && (
                        <div className="flex items-center justify-end gap-1 text-xs text-gray-500 dark:text-slate-500">
                          <ClockIcon className="w-3 h-3" />
                          {format(new Date(item.lastActivity), 'd MMM')}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {showAllSubscribers && totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Показано {subscribersPage * subscribersPerPage + 1}-{Math.min((subscribersPage + 1) * subscribersPerPage, analytics.allSubscribers.length)} из {analytics.allSubscribers.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSubscribersPage(Math.max(0, subscribersPage - 1))}
                disabled={subscribersPage === 0}
                className="px-3 py-1 bg-gray-100 dark:bg-slate-700 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                Назад
              </button>
              <span className="text-sm text-gray-600 dark:text-slate-400">
                {subscribersPage + 1} / {totalPages}
              </span>
              <button
                onClick={() => setSubscribersPage(Math.min(totalPages - 1, subscribersPage + 1))}
                disabled={subscribersPage === totalPages - 1}
                className="px-3 py-1 bg-gray-100 dark:bg-slate-700 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                Вперед
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 