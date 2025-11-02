import { NextRequest, NextResponse } from 'next/server'
import bs58 from 'bs58'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const DOGWATER_TOKEN_MINT = '99smS99MkGP8WFggmUZWaVbe18Y8iWuC3YhGtUMMBray'
const SOL_MINT = 'So11111111111111111111111111111111111111112'
const SOLANA_TRACKER_SWAP_API = 'https://swap-v2.solanatracker.io/swap'

// POST /api/createtransaction/swap - создать swap транзакцию для мобильного приложения
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userPublicKey } = body

    console.log('[Swap API] Creating swap transaction for mobile:', {
      user: userPublicKey
    })

    // Валидация входных данных
    if (!userPublicKey) {
      return NextResponse.json(
        { error: 'Missing required field: userPublicKey' },
        { status: 400 }
      )
    }

    // 1. Получаем динамическую цену SOL
    console.log('[Swap API] Fetching SOL price...')
    let SOL_PRICE_USD = 150 // Fallback значение
    
    try {
      const solPriceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
      if (solPriceResponse.ok) {
        const solPriceData = await solPriceResponse.json()
        SOL_PRICE_USD = solPriceData.solana?.usd || 150
        console.log('[Swap API] SOL price in USD:', SOL_PRICE_USD)
      }
    } catch (error) {
      console.warn('[Swap API] Failed to fetch SOL price, using fallback $150')
    }

    // 2. Рассчитываем сколько SOL нужно для $0.9
    const TARGET_USD = 1 // Свапаем на $0.9
    const solAmount = TARGET_USD / SOL_PRICE_USD
    const lamports = Math.floor(solAmount * 1_000_000_000)
    
    console.log('[Swap API] Swap calculation:', {
      targetUSD: TARGET_USD,
      solPriceUSD: SOL_PRICE_USD,
      solAmount,
      lamports
    })

    // 3. Получаем swap транзакцию от Solana Tracker
    const swapParams = new URLSearchParams({
      from: SOL_MINT,
      to: DOGWATER_TOKEN_MINT,
      fromAmount: solAmount.toString(),
      slippage: '3', // 3% slippage
      payer: userPublicKey,
      txVersion: 'v0',
    })

    const swapUrl = `${SOLANA_TRACKER_SWAP_API}?${swapParams}`
    console.log('[Swap API] Requesting swap from Solana Tracker...')

    const swapResponse = await fetch(swapUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Fonana/1.0'
      },
    })

    console.log('[Swap API] Solana Tracker response status:', swapResponse.status)

    if (!swapResponse.ok) {
      const errorText = await swapResponse.text()
      console.error('[Swap API] Solana Tracker error:', {
        status: swapResponse.status,
        statusText: swapResponse.statusText,
        body: errorText
      })
      
      return NextResponse.json(
        { 
          error: 'Failed to get swap from Solana Tracker', 
          details: errorText,
          status: swapResponse.status 
        },
        { status: swapResponse.status }
      )
    }

    const swapData = await swapResponse.json()
    console.log('[Swap API] Swap transaction received successfully')

    // 4. Рассчитываем примерное количество токенов
    // Получаем цену DogWater токена для расчёта
    let expectedTokens = 0
    let tokenPriceUSD = 0
    
    try {
      const priceResponse = await fetch(`https://gmgn.ai/defi/quotation/v1/tokens/sol/${DOGWATER_TOKEN_MINT}`)
      if (priceResponse.ok) {
        const priceData = await priceResponse.json()
        tokenPriceUSD = priceData.data?.token?.price || 0
        
        if (tokenPriceUSD > 0) {
          // Рассчитываем количество токенов: $1 / цена токена
          expectedTokens = TARGET_USD / tokenPriceUSD
          console.log('[Swap API] Token calculation:', {
            tokenPriceUSD,
            targetUSD: TARGET_USD,
            expectedTokens
          })
        }
      }
    } catch (error) {
      console.warn('[Swap API] Failed to fetch token price for calculation:', error)
    }

    // Также можем получить из rate, если Solana Tracker предоставляет
    if (swapData.rate?.outAmount) {
      expectedTokens = swapData.rate.outAmount
      console.log('[Swap API] Using outAmount from Solana Tracker:', expectedTokens)
    }

    // 5. Транзакция уже в base64, нужно правильно её обработать
    const txnBuffer = Buffer.from(swapData.txn, 'base64')
    
    console.log('[Swap API] Transaction buffer details:', {
      base64Length: swapData.txn.length,
      bufferLength: txnBuffer.length,
      firstBytes: Array.from(txnBuffer.slice(0, 10)),
      txVersion: swapData.txVersion || 'unknown'
    })

    // Транзакция от Solana Tracker уже сериализована и готова к подписи
    // Просто конвертируем в base58 для мобильного приложения
    const transactionBase58 = bs58.encode(txnBuffer)

    console.log('[Swap API] Transaction encoded for mobile:', {
      base58Length: transactionBase58.length,
      base58Preview: transactionBase58.substring(0, 50) + '...'
    })

    // 6. Возвращаем в формате совместимом с createtransaction
    return NextResponse.json({ 
      success: true,
      transactionBase58,
      swapDetails: {
        inputToken: 'SOL',
        outputToken: 'DogWater',
        targetUSD: TARGET_USD,
        solAmount,
        lamports,
        solPriceUSD: SOL_PRICE_USD,
        tokenPriceUSD,
        expectedTokens, // 🔥 Ожидаемое количество токенов
        slippage: 3,
        rate: swapData.rate,
        timeTaken: swapData.timeTaken,
        swapType: swapData.type
      },
      // Для совместимости с мобильным приложением
      distribution: {
        totalAmount: solAmount,
        recipientAmount: solAmount, // Весь swap идет пользователю
        platformFee: 0, // Комиссия платформы не взимается на верификацию
        platformWallet: null
      },
      // Информация о транзакции
      validity: {
        warning: 'Transaction should be signed and sent immediately',
        note: 'Swap transactions have limited validity time'
      }
    })

  } catch (error) {
    console.error('[Swap API] Error creating swap transaction:', error)
    
    if (error instanceof Error) {
      console.error('[Swap API] Error details:', {
        message: error.message,
        name: error.name,
        cause: (error as any).cause
      })
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create swap transaction', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

