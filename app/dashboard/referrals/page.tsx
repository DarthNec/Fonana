'use client'

import { useEffect, useState } from 'react'
import { useWallet } from '@/lib/contexts/WalletContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Copy, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Link from 'next/link'
import { User } from '@prisma/client'

interface ReferralUser extends User {
  posts: { id: string }[]
  followers: { id: string }[]
}

export default function ReferralsPage() {
  const { user } = useWallet()
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
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Реферальная программа</h1>
      
      {/* Реферальная ссылка */}
      {user?.nickname ? (
        <Card className="mb-6 dark:bg-slate-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Ваша реферальная ссылка
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={referralLink || ''}
                readOnly
                className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-900 rounded-md text-sm"
              />
              <Button
                onClick={copyToClipboard}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
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
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Поделитесь этой ссылкой с друзьями. Когда они зарегистрируются, 
              они будут отображаться в вашем списке рефералов.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6 dark:bg-slate-800/50">
          <CardHeader>
            <CardTitle>Настройте никнейм</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Чтобы использовать реферальную программу, сначала настройте свой никнейм в профиле.
            </p>
            <Link href="/profile">
              <Button>Перейти в профиль</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="dark:bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего рефералов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referrals.length}</div>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Активных криейторов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {referrals.filter(r => r.posts.length > 0).length}
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Общее количество подписчиков
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {referrals.reduce((sum, r) => sum + r.followers.length, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Список рефералов */}
      <Card className="dark:bg-slate-800/50">
        <CardHeader>
          <CardTitle>Ваши рефералы</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Загрузка...
            </div>
          ) : referrals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              У вас пока нет рефералов. Поделитесь своей ссылкой, чтобы пригласить друзей!
            </div>
          ) : (
            <div className="space-y-4">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-4 rounded-lg border dark:border-slate-700"
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
                        {referral.nickname || referral.wallet.slice(0, 8) + '...'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Зарегистрирован {formatDate(referral.createdAt.toString())}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {referral.posts.length > 0 && (
                      <Badge variant="secondary">
                        {referral.posts.length} постов
                      </Badge>
                    )}
                    {referral.followers.length > 0 && (
                      <Badge variant="secondary">
                        {referral.followers.length} подписчиков
                      </Badge>
                    )}
                    <Link
                      href={referral.nickname ? `/${referral.nickname}` : `/creator/${referral.id}`}
                    >
                      <Button variant="ghost" size="sm">
                        Профиль
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 