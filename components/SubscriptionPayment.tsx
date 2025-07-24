'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@/lib/hooks/useSafeWallet'
import { SafeWalletButton } from '@/components/ui/ssr-safe'
import { 
  createSubscriptionTransaction, 
  calculatePaymentDistribution,
  formatSolAmount 
} from '@/lib/solana/payments'
import { isValidSolanaAddress } from '@/lib/solana/config'
import { connection } from '@/lib/solana/connection'
import { toast } from 'react-hot-toast'
import { refreshSubscriptionStatus } from '@/lib/utils/subscriptions'

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
  const publicKeyString = publicKey?.toBase58() ?? null // 🔥 ALTERNATIVE FIX: Stable string
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
    if (!publicKeyString || !connected) {
      toast.error('Пожалуйста, подключите ваш Solana кошелек')
      return
    }
    
    // КРИТИЧЕСКАЯ ПРОВЕРКА: запрещаем подписки с кошелька платформы
    const PLATFORM_WALLET = 'EEqsmopVfTuaiJrh8xL7ZsZbUctckY6S5WyHYR66wjpw'
    if (publicKeyString === PLATFORM_WALLET) {
      toast.error('❌ Вы не можете оформлять подписку с кошелька платформы!')
      return
    }

    if (!creatorWallet || !isValidSolanaAddress(creatorWallet)) {
      toast.error('Кошелек создателя не настроен')
      return
    }
    
    // Дополнительная проверка: создатель не может подписаться сам на себя
          if (creatorWallet === publicKeyString) {
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
            }
          } catch (error) {
            console.error('Simulation error:', error)
          }
        } catch (error) {
          console.error('Transaction error:', error)
        }
      }
    } catch (error) {
      console.error('Subscription error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div>
      {/* Render your component content here */}
    </div>
  )
}
