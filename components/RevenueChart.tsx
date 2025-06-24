'use client'

import React, { useEffect, useState } from 'react'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
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
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useSolRate } from '@/lib/hooks/useSolRate'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface RevenueChartProps {
  creatorId: string
}

interface AnalyticsData {
  period: string
  revenue: {
    current: number
    previous: number
    growth: number
    byPeriod: Record<string, number>
    byType: {
      subscriptions: number
      posts: number
      tips: number
      messages: number
    }
  }
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
  topSubscribers: Array<{
    user: {
      id: string
      nickname: string | null
      fullName: string | null
      avatar: string | null
    }
    totalSpent: number
    transactions: number
  }>
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

export default function RevenueChart({ creatorId }: RevenueChartProps) {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week')
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { rate: solRate } = useSolRate()

  useEffect(() => {
    fetchAnalytics()
  }, [creatorId, period])

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/creators/analytics?creatorId=${creatorId}&period=${period}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
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
    csvData.push(['Доходы по типам'])
    csvData.push(['Тип', 'Доход (SOL)', 'Доход (USD)'])
    csvData.push(['Подписки', analytics.revenue.byType.subscriptions.toFixed(4), (analytics.revenue.byType.subscriptions * solRate).toFixed(2)])
    csvData.push(['Посты', analytics.revenue.byType.posts.toFixed(4), (analytics.revenue.byType.posts * solRate).toFixed(2)])
    csvData.push(['Чаевые', analytics.revenue.byType.tips.toFixed(4), (analytics.revenue.byType.tips * solRate).toFixed(2)])
    csvData.push(['Сообщения', analytics.revenue.byType.messages.toFixed(4), (analytics.revenue.byType.messages * solRate).toFixed(2)])
    
    csvData.push([])
    csvData.push(['Топ посты'])
    csvData.push(['Название', 'Доход (SOL)', 'Покупок'])
    analytics.topPosts.forEach(item => {
      csvData.push([item.post.title, item.revenue.toFixed(4), item.purchases])
    })
    
    csvData.push([])
    csvData.push(['Топ подписчики'])
    csvData.push(['Пользователь', 'Потрачено (SOL)', 'Транзакций'])
    analytics.topSubscribers.forEach(item => {
      csvData.push([
        item.user.fullName || item.user.nickname || 'Anonymous',
        item.totalSpent.toFixed(4),
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
  const chartLabels = Object.keys(analytics.revenue.byPeriod).map(key => {
    switch (period) {
      case 'day':
        return format(new Date(key), 'd MMM')
      case 'week':
        return `Неделя ${key.split('-')[1]}`
      case 'month':
        return format(new Date(key + '-01'), 'MMM yyyy')
      default:
        return key
    }
  })

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

  const revenueByTypeData = {
    labels: ['Подписки', 'Посты', 'Чаевые', 'Сообщения'],
    datasets: [
      {
        label: 'Доход по типам',
        data: [
          analytics.revenue.byType.subscriptions,
          analytics.revenue.byType.posts,
          analytics.revenue.byType.tips,
          analytics.revenue.byType.messages
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
              <ChartBarIcon className="w-8 h-8 text-blue-200" />
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

      {/* Revenue by Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Доходы по типам</h3>
          <div className="h-64">
            <Bar data={revenueByTypeData} options={{ ...chartOptions, indexAxis: 'y' as const }} />
          </div>
        </div>

        {/* Top Posts */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Топ посты</h3>
          <div className="space-y-3">
            {analytics.topPosts.length > 0 ? (
              analytics.topPosts.map((item, index) => (
                <div key={item.post.id} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-500 dark:text-slate-500 w-6">#{index + 1}</span>
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
      </div>

      {/* Top Subscribers */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Топ подписчики</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analytics.topSubscribers.length > 0 ? (
            analytics.topSubscribers.map((item, index) => (
              <div key={item.user.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">#{index + 1}</span>
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
            <p className="text-gray-500 dark:text-slate-400 text-sm col-span-3">Нет данных</p>
          )}
        </div>
      </div>
    </div>
  )
} 