'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { 
  createSubscriptionTransaction, 
  calculatePaymentDistribution,
  formatSolAmount 
} from '@/lib/solana/payments'
import { isValidSolanaAddress } from '@/lib/solana/config'
import { connection } from '@/lib/solana/connection'
import { toast } from 'react-hot-toast'

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
  const { publicKey, connected, sendTransaction } = useWallet()
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [creatorData, setCreatorData] = useState<any>(null)

  useEffect(() => {
    if (plans.length > 0 && !selectedPlan) {
      setSelectedPlan(plans[0].id)
    }
  }, [plans, selectedPlan])

  useEffect(() => {
    // Загружаем актуальные данные создателя
    fetch(`/api/creators/${creatorId}`)
      .then(res => res.json())
      .then(data => {
        if (data.creator) {
          setCreatorData(data.creator)
        }
      })
      .catch(err => console.error('Error loading creator data:', err))
  }, [creatorId])

  const handleSubscribe = async () => {
    if (!publicKey || !connected) {
      toast.error('Пожалуйста, подключите ваш Solana кошелек')
      return
    }
    
    // КРИТИЧЕСКАЯ ПРОВЕРКА: запрещаем подписки с кошелька платформы
    const PLATFORM_WALLET = 'npzAZaN9fDMgLV63b3kv3FF8cLSd8dQSLxyMXASA5T4'
    if (publicKey.toBase58() === PLATFORM_WALLET) {
      toast.error('❌ Вы не можете оформлять подписку с кошелька платформы!')
      return
    }

    if (!creatorWallet || !isValidSolanaAddress(creatorWallet)) {
      toast.error('Кошелек создателя не настроен')
      return
    }
    
    // Дополнительная проверка: создатель не может подписаться сам на себя
    if (creatorWallet === publicKey.toBase58()) {
      toast.error('Вы не можете подписаться сами на себя')
      return
    }

    const plan = plans.find(p => p.id === selectedPlan)
    if (!plan) return

    // Используем данные создателя для определения кошельков
    const finalCreatorWallet = creatorData?.solanaWallet || creatorData?.wallet || creatorWallet
    const finalReferrerWallet = creatorData?.referrer?.solanaWallet || creatorData?.referrer?.wallet || referrerWallet
    const finalHasReferrer = creatorData?.referrerId && finalReferrerWallet && isValidSolanaAddress(finalReferrerWallet)

    if (!isValidSolanaAddress(finalCreatorWallet)) {
      toast.error('Некорректный адрес кошелька создателя')
      return
    }

    setIsProcessing(true)

    try {
      // Calculate payment distribution
      const distribution = calculatePaymentDistribution(
        plan.price,
        finalCreatorWallet,
        finalHasReferrer,
        finalReferrerWallet
      )

      // Create transaction
      const transaction = await createSubscriptionTransaction(
        publicKey,
        distribution
      )

      // Send transaction
      let signature: string = ''
      let attempts = 0
      const maxAttempts = 3
      const sendOptions = {
        skipPreflight: false,
        preflightCommitment: 'confirmed' as any,
        maxRetries: 3
      }
      
      while (attempts < maxAttempts) {
        attempts++
        
        try {
          // ВАЖНО: Получаем свежий blockhash прямо перед отправкой
          const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
          transaction.recentBlockhash = blockhash
          ;(transaction as any).lastValidBlockHeight = lastValidBlockHeight
          
          // Симулируем транзакцию перед отправкой (опционально)
          try {
            const simulation = await connection.simulateTransaction(transaction)
            
            if (simulation.value.err && simulation.value.err !== 'AccountNotFound') {
              console.error('Simulation failed:', simulation.value.err)
              throw new Error(`Симуляция транзакции неуспешна: ${JSON.stringify(simulation.value.err)}`)
            }
          } catch (simError) {
            // Продолжаем даже если симуляция не удалась
          }
          
          signature = await sendTransaction(transaction, connection, sendOptions)
          
          // Даем транзакции время попасть в сеть
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Успешно отправлено, выходим из цикла
          break
          
        } catch (sendError) {
          console.error(`Error on attempt ${attempts}:`, sendError)
          
          if (attempts === maxAttempts) {
            // Последняя попытка не удалась
            throw new Error(`Не удалось отправить транзакцию после ${maxAttempts} попыток: ${sendError instanceof Error ? sendError.message : 'Неизвестная ошибка'}`)
          }
          
          // Ждем перед следующей попыткой
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }

      // Ждем подтверждения транзакции в блокчейне (обычно 5-10 секунд)
      toast.loading('Ожидаем подтверждения в блокчейне Solana...')
      await new Promise(resolve => setTimeout(resolve, 5000))

      // Process payment on backend
      const response = await fetch('/api/subscriptions/process-payment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-wallet': publicKey.toBase58()
        },
        body: JSON.stringify({
          creatorId,
          plan: plan.id,
          price: plan.price,
          signature,
          hasReferrer: finalHasReferrer,
          distribution
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка обработки платежа')
      }

      toast.success(`Вы успешно подписались на ${creatorName}!`)

      // Redirect or update UI
      window.location.reload()

    } catch (error) {
      console.error('Payment error:', error)
      
      let errorMessage = 'Произошла ошибка при оплате'
      
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          errorMessage = 'Вы отменили транзакцию'
        } else if (error.message.includes('insufficient')) {
          errorMessage = 'Недостаточно средств на кошельке'
        } else if (error.message.includes('Transaction not confirmed')) {
          errorMessage = 'Транзакция не была подтверждена. Попробуйте еще раз'
        } else if (error.message.includes('block height exceeded')) {
          errorMessage = 'Транзакция истекла. Попробуйте еще раз'
        } else {
          errorMessage = error.message
        }
      }
      
      toast.error(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  // Определяем реальное распределение платежа на основе загруженных данных
  const realHasReferrer = creatorData?.referrerId && creatorData?.referrer && 
    (creatorData.referrer.solanaWallet || creatorData.referrer.wallet) &&
    isValidSolanaAddress(creatorData.referrer.solanaWallet || creatorData.referrer.wallet)

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
                        <p>Платформа: {formatSolAmount(plan.price * (realHasReferrer ? 0.05 : 0.1))}</p>
                        {realHasReferrer && (
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
            className="w-full py-3 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? 'Обработка...' : 'Оформить подписку'}
          </button>
        </>
      )}
    </div>
  )
} 