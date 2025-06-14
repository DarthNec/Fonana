'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { Users, Copy, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { User } from '@prisma/client'

interface ReferralUser extends User {
  posts: { id: string }[]
  followers: { id: string }[]
}

export default function ReferralsPage() {
  const { user } = useUser()
  const [referrals, setReferrals] = useState<ReferralUser[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  // Генерируем реферальную ссылку
  const referralLink = user?.nickname 
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://fonana.me'}/${user.nickname}`
    : null

  useEffect(() => {
    const fetchReferrals = async () => {
      if (!user) return

      try {
        setLoading(true)
        const response = await fetch(`/api/user/referrals?userId=${user.id}`)
        
        if (response.ok) {
          const data = await response.json()
          setReferrals(data.referrals || [])
        }
      } catch (error) {
        console.error('Error fetching referrals:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchReferrals()
  }, [user])

  const copyToClipboard = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink)
      setCopied(true)
      toast.success('Реферальная ссылка скопирована!')
      
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <div className="container mx-auto p-4 pt-24">
      <h1 className="text-3xl font-bold mb-6">Реферальная программа</h1>
      
      {/* Реферальная ссылка */}
      {user?.nickname ? (
        <div className="mb-6 bg-white dark:bg-slate-800/50 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Ваша реферальная ссылка
          </h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={referralLink || ''}
              readOnly
              className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-900 rounded-md text-sm"
            />
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Скопировано
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Копировать
                </>
              )}
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Поделитесь этой ссылкой с друзьями. Когда они зарегистрируются, 
            они будут отображаться в вашем списке рефералов.
          </p>
        </div>
      ) : (
        <div className="mb-6 bg-white dark:bg-slate-800/50 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Настройте никнейм</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Чтобы использовать реферальную программу, сначала настройте свой никнейм в профиле.
          </p>
          <Link href="/profile">
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors">
              Перейти в профиль
            </button>
          </Link>
        </div>
      )}

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800/50 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Всего рефералов
          </h3>
          <div className="text-2xl font-bold">{referrals.length}</div>
        </div>

        <div className="bg-white dark:bg-slate-800/50 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Активных криейторов
          </h3>
          <div className="text-2xl font-bold">
            {referrals.filter(r => r.posts.length > 0).length}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/50 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Общее количество подписчиков
          </h3>
          <div className="text-2xl font-bold">
            {referrals.reduce((sum, r) => sum + r.followers.length, 0)}
          </div>
        </div>
      </div>

      {/* Список рефералов */}
      <div className="bg-white dark:bg-slate-800/50 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Ваши рефералы</h2>
        {loading ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            Загрузка...
          </div>
        ) : referrals.length === 0 ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            У вас пока нет рефералов. Поделитесь своей ссылкой, чтобы пригласить друзей!
          </div>
        ) : (
          <div className="space-y-4">
            {referrals.map((referral) => (
              <div
                key={referral.id}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-slate-700"
              >
                <div className="flex items-center gap-3">
                  {referral.avatar ? (
                    <img
                      src={referral.avatar}
                      alt={referral.nickname || 'User'}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
                  )}
                  <div>
                    <div className="font-medium">
                      {referral.nickname || referral.wallet?.slice(0, 8) + '...' || 'User'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Зарегистрирован {formatDate(referral.createdAt.toString())}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {referral.posts.length > 0 && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                      {referral.posts.length} постов
                    </span>
                  )}
                  {referral.followers.length > 0 && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                      {referral.followers.length} подписчиков
                    </span>
                  )}
                  <Link
                    href={referral.nickname ? `/${referral.nickname}` : `/creator/${referral.id}`}
                  >
                    <button className="px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                      Профиль
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 