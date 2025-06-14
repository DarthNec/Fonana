'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { 
  createSubscriptionTransaction, 
  calculatePaymentDistribution,
  formatSolAmount 
} from '@/lib/solana/payments'
import { isValidSolanaAddress } from '@/lib/solana/validation'
import { connection } from '@/lib/solana/connection'
import { useToast } from '@/lib/hooks/use-toast'

interface SubscriptionPaymentProps {
  creatorId: string
  creatorName: string
  creatorWallet: string
  hasReferrer: boolean
  referrerWallet?: string
  plans: {
    id: string
    name: string
    price: number
    duration: string
  }[]
}

export function SubscriptionPayment({
  creatorId,
  creatorName,
  creatorWallet,
  hasReferrer,
  referrerWallet,
  plans
}: SubscriptionPaymentProps) {
  const { publicKey, sendTransaction, connected } = useWallet()
  const [selectedPlan, setSelectedPlan] = useState(plans[0]?.id || '')
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  const handleSubscribe = async () => {
    if (!publicKey || !connected) {
      toast({
        title: 'Кошелек не подключен',
        description: 'Пожалуйста, подключите ваш Solana кошелек',
        variant: 'destructive'
      })
      return
    }

    const plan = plans.find(p => p.id === selectedPlan)
    if (!plan) return

    if (!isValidSolanaAddress(creatorWallet)) {
      toast({
        title: 'Ошибка',
        description: 'Некорректный адрес кошелька создателя',
        variant: 'destructive'
      })
      return
    }

    setIsProcessing(true)

    try {
      // Calculate payment distribution
      const distribution = calculatePaymentDistribution(
        plan.price,
        creatorWallet,
        hasReferrer,
        referrerWallet
      )

      // Create transaction
      const transaction = await createSubscriptionTransaction(
        publicKey,
        distribution
      )

      // Send transaction
      const signature = await sendTransaction(transaction, connection)
      
      console.log('Transaction sent:', signature)

      // Process payment on backend
      const response = await fetch('/api/subscriptions/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId,
          plan: plan.id,
          price: plan.price,
          signature
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка обработки платежа')
      }

      toast({
        title: 'Подписка оформлена!',
        description: `Вы успешно подписались на ${creatorName}`,
      })

      // Redirect or update UI
      window.location.reload()

    } catch (error) {
      console.error('Payment error:', error)
      toast({
        title: 'Ошибка платежа',
        description: error instanceof Error ? error.message : 'Произошла ошибка при оплате',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <WalletMultiButton />
      </div>

      {connected && (
        <>
          <div className="space-y-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedPlan === plan.id
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{plan.name}</h3>
                    <p className="text-sm text-gray-500">{plan.duration}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatSolAmount(plan.price)}</p>
                    {selectedPlan === plan.id && (
                      <div className="text-xs text-gray-500 mt-1">
                        <p>Создатель: {formatSolAmount(plan.price * 0.9)}</p>
                        <p>Платформа: {formatSolAmount(plan.price * (hasReferrer ? 0.05 : 0.1))}</p>
                        {hasReferrer && (
                          <p>Реферер: {formatSolAmount(plan.price * 0.05)}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleSubscribe}
            disabled={!selectedPlan || isProcessing}
            className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Обработка...' : 'Подписаться'}
          </button>
        </>
      )}
    </div>
  )
} 