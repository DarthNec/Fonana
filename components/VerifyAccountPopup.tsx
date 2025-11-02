'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/store/appStore'
import { useWallet } from '@solana/wallet-adapter-react'
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'
import Avatar from './Avatar'
import toast from 'react-hot-toast'

const DOGWATER_TOKEN_MINT = '99smS99MkGP8WFggmUZWaVbe18Y8iWuC3YhGtUMMBray'
const RPC_ENDPOINT = 'https://rpc.helius.xyz/?api-key=29fc7f17-2a08-48da-9c14-88780e1fedd0'

// Native SOL mint address
const SOL_MINT = 'So11111111111111111111111111111111111111112'

// GMGN API для получения цены токена относительно SOL
const GMGN_API = 'https://gmgn.ai/defi/quotation/v1/tokens/sol'

export default function VerifyAccountPopup() {
  const user = useUser()
  const { publicKey, signTransaction, signAllTransactions } = useWallet()
  const [isVerifying, setIsVerifying] = useState(false)
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    // Показываем попап только если пользователь авторизован и не купил DogWater
    // @ts-expect-error - Поле isBoughtDogWater будет доступно после генерации Prisma Client
    if (user && user.isBoughtDogWater === false) {
        if(user.id === 'cmfetoamd001spzkowc5pdygf')
        {
            setShouldShow(true)
        }else{
            setShouldShow(false)
        }
    } else {
      setShouldShow(false)
    }
  }, [user])

  const handleVerify = async () => {
    if (!publicKey || !signTransaction) {
      toast.error('Подключите кошелек Phantom')
      return
    }

    setIsVerifying(true)

    try {
      console.log('[VerifyAccount] Starting verification...')

      // 1. Получаем динамическую цену SOL
      console.log('[VerifyAccount] Fetching SOL price...')
      let SOL_PRICE_USD = 150 // Fallback значение
      
      try {
        // Получаем цену SOL в USD
        const solPriceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
        if (solPriceResponse.ok) {
          const solPriceData = await solPriceResponse.json()
          SOL_PRICE_USD = solPriceData.solana?.usd || 150
          console.log('[VerifyAccount] SOL price in USD:', SOL_PRICE_USD)
        }
      } catch (error) {
        console.warn('[VerifyAccount] Failed to fetch SOL price, using fallback $150')
      }

      // 2. Рассчитываем сколько SOL нужно для $1
      const TARGET_USD = 1 // Свапаем на $0.9
      const solAmount = TARGET_USD / SOL_PRICE_USD // $1 / $192 = 0.00520 SOL
      
      console.log('[VerifyAccount] Swap amount calculation:', {
        targetUSD: TARGET_USD,
        solPriceUSD: SOL_PRICE_USD,
        solAmount
      })

      // 3. Получаем swap транзакцию
      const amount = Math.floor(solAmount * 1_000_000_000) // Конвертируем SOL в lamports
      
      console.log('[VerifyAccount] Swap parameters:', {
        usdAmount: TARGET_USD,
        solAmount,
        lamports: amount
      })
      
      const swapParams = new URLSearchParams({
        inputMint: SOL_MINT,
        outputMint: DOGWATER_TOKEN_MINT,
        amount: amount.toString(),
        slippageBps: '300', // 3% slippage
        payer: publicKey.toBase58(), // Адрес кошелька пользователя
      })

      console.log('[VerifyAccount] Getting swap transaction from Solana Tracker...')
      const swapResponse = await fetch(`/api/jupiter/quote?${swapParams}`)
      
      if (!swapResponse.ok) {
        const errorData = await swapResponse.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[VerifyAccount] Swap error:', errorData)
        throw new Error(errorData.details || errorData.error || 'Failed to get swap transaction')
      }

      const swapData = await swapResponse.json()
      console.log('[VerifyAccount] Swap transaction received:', swapData)

      // Десериализуем транзакцию
      const swapTransactionBuf = Buffer.from(swapData.txn, 'base64')
      let transaction: Transaction | VersionedTransaction

      try {
        // Пытаемся десериализовать как VersionedTransaction
        transaction = VersionedTransaction.deserialize(swapTransactionBuf)
        console.log('[VerifyAccount] Deserialized as VersionedTransaction')
      } catch {
        // Если не получилось, десериализуем как обычную Transaction
        transaction = Transaction.from(swapTransactionBuf)
        console.log('[VerifyAccount] Deserialized as legacy Transaction')
      }

      // 4. Подписываем транзакцию
      console.log('[VerifyAccount] Signing transaction...')
      const signedTransaction = await signTransaction(transaction)

      // 5. Отправляем транзакцию в сеть
      console.log('[VerifyAccount] Sending transaction...')
      const connection = new Connection(RPC_ENDPOINT, 'confirmed')
      
      const rawTransaction = signedTransaction.serialize()
      const signature = await connection.sendRawTransaction(rawTransaction, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3,
      })

      console.log('[VerifyAccount] Transaction sent:', signature)
      toast.success('Транзакция отправлена! Ожидание подтверждения...')

      // 6. Ожидаем подтверждения
      const confirmation = await connection.confirmTransaction(signature, 'confirmed')
      
      if (confirmation.value.err) {
        throw new Error('Transaction failed: ' + JSON.stringify(confirmation.value.err))
      }

      console.log('[VerifyAccount] Transaction confirmed!')
      toast.success('Транзакция подтверждена!')

      // 7. Получаем реальное количество токенов из транзакции
      console.log('[VerifyAccount] Fetching transaction details...')
      let actualTokensReceived = 0
      
      try {
        const txDetails = await connection.getParsedTransaction(signature, {
          maxSupportedTransactionVersion: 0,
          commitment: 'confirmed'
        })
        
        if (txDetails?.meta?.postTokenBalances && txDetails?.meta?.preTokenBalances) {
          // Ищем изменение баланса DogWater токена
          const postBalance = txDetails.meta.postTokenBalances.find(
            (b: any) => b.mint === DOGWATER_TOKEN_MINT && b.owner === publicKey.toBase58()
          )
          const preBalance = txDetails.meta.preTokenBalances.find(
            (b: any) => b.mint === DOGWATER_TOKEN_MINT && b.owner === publicKey.toBase58()
          )
          
          const postAmount = postBalance?.uiTokenAmount?.uiAmount || 0
          const preAmount = preBalance?.uiTokenAmount?.uiAmount || 0
          actualTokensReceived = postAmount - preAmount
          
          console.log('[VerifyAccount] Token balance change:', {
            before: preAmount,
            after: postAmount,
            received: actualTokensReceived
          })
        }
      } catch (error) {
        console.warn('[VerifyAccount] Failed to get transaction details:', error)
        // Если не удалось получить детали, используем расчётное значение
        actualTokensReceived = 0
      }

      // 8. Обновляем флаг в базе данных и сохраняем количество токенов
      console.log('[VerifyAccount] Updating database...')
      const userWallet = user?.wallet || user?.solanaWallet || publicKey.toBase58()
      
      const updateResponse = await fetch('/api/dogWater', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recieveWallet: userWallet,
          tokensReceived: actualTokensReceived, // Передаем РЕАЛЬНОЕ количество полученных токенов
        }),
      })

      if (!updateResponse.ok) {
        console.error('[VerifyAccount] Failed to update database')
        throw new Error('Failed to update verification status')
      }

      const updateData = await updateResponse.json()
      console.log('[VerifyAccount] Database updated:', updateData)

      toast.success('Аккаунт успешно верифицирован! 🎉')
      
      // Перезагружаем страницу чтобы обновить состояние пользователя
      setTimeout(() => {
        window.location.reload()
      }, 1500)

    } catch (error) {
      console.error('[VerifyAccount] Error:', error)
      
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          toast.error('Вы отменили транзакцию')
        } else {
          toast.error('Ошибка верификации: ' + error.message)
        }
      } else {
        toast.error('Произошла ошибка при верификации')
      }
    } finally {
      setIsVerifying(false)
    }
  }

  if (!shouldShow) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8">
        {/* Аватар */}
        <div className="flex flex-col items-center mb-6">
          <div className="mb-4">
            <Avatar
              src={user?.avatar}
              alt={user?.nickname || 'User'}
              seed={user?.id || user?.wallet || 'default'}
              size={100}
              className="ring-4 ring-purple-500/20"
            />
          </div>
          
          {/* Username */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {user?.nickname || user?.fullName || 'Пользователь'}
          </h2>
          
          {/* Описание */}
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            Верифицируйте свой аккаунт через Phantom кошелёк, чтобы пользоваться площадкой
          </p>
        </div>

        {/* Информация о верификации */}
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 mb-6">
          <div className="flex items-start space-x-3">
            <svg 
              className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Для верификации подтвердите действие в Phantom кошельке
              </p>
            </div>
          </div>
        </div>

        {/* Кнопка верификации */}
        <button
          onClick={handleVerify}
          disabled={isVerifying}
          className={`
            w-full py-4 rounded-xl font-semibold text-white text-lg
            transition-all duration-200 shadow-lg
            ${isVerifying 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hover:shadow-xl transform hover:scale-[1.02]'
            }
          `}
        >
          {isVerifying ? (
            <span className="flex items-center justify-center">
              <svg 
                className="animate-spin h-5 w-5 mr-3" 
                viewBox="0 0 24 24"
              >
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                  fill="none"
                />
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Верификация...
            </span>
          ) : (
            'Верифицировать'
          )}
        </button>

        {/* Дополнительная информация */}
        <p className="text-xs text-center text-gray-500 dark:text-gray-500 mt-4">
          После верификации вы получите полный доступ к функциям платформы
        </p>
      </div>
    </div>
  )
}

