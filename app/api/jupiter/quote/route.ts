import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Solana Tracker Swap API v2
// Документация: https://docs.solanatracker.io/swap-api/swap
const SOLANA_TRACKER_SWAP_API = 'https://swap-v2.solanatracker.io/swap'

// GET /api/jupiter/quote - получить swap транзакцию через Solana Tracker
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const inputMint = searchParams.get('inputMint')
    const outputMint = searchParams.get('outputMint')
    const amount = searchParams.get('amount')
    const slippageBps = searchParams.get('slippageBps')
    const payer = searchParams.get('payer') // Адрес кошелька пользователя

    if (!inputMint || !outputMint || !amount || !payer) {
      return NextResponse.json(
        { error: 'Missing required parameters: inputMint, outputMint, amount, payer' },
        { status: 400 }
      )
    }

    console.log('[Solana Tracker] Building swap transaction:', {
      from: inputMint,
      to: outputMint,
      amount,
      slippageBps,
      payer
    })

    // Конвертируем lamports в SOL (Solana Tracker принимает SOL, не lamports)
    const amountInSOL = parseInt(amount) / 1_000_000_000

    // Конвертируем slippage из BPS (basis points) в проценты
    // 300 BPS = 3%
    const slippagePercent = slippageBps ? parseInt(slippageBps) / 100 : 3

    // Строим query параметры для Solana Tracker
    const swapParams = new URLSearchParams({
      from: inputMint,
      to: outputMint,
      fromAmount: amountInSOL.toString(),
      slippage: slippagePercent.toString(),
      payer: payer, // Используем реальный адрес кошелька
      txVersion: 'v0',
    })

    const swapUrl = `${SOLANA_TRACKER_SWAP_API}?${swapParams}`
    console.log('[Solana Tracker] Request URL:', swapUrl)

    const swapResponse = await fetch(swapUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Fonana/1.0'
      },
    })

    console.log('[Solana Tracker] Response status:', swapResponse.status)

    if (!swapResponse.ok) {
      const errorText = await swapResponse.text()
      console.error('[Solana Tracker] API error:', {
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
    console.log('[Solana Tracker] Swap transaction received successfully')

    // Возвращаем в формате совместимом с Jupiter API
    return NextResponse.json({
      txn: swapData.txn,
      rate: swapData.rate,
      timeTaken: swapData.timeTaken,
      type: swapData.type
    })

  } catch (error) {
    console.error('[Solana Tracker] Error:', error)
    
    if (error instanceof Error) {
      console.error('[Solana Tracker] Error details:', {
        message: error.message,
        name: error.name,
        cause: (error as any).cause
      })
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// POST /api/jupiter/quote - создать swap транзакцию с payer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userPublicKey } = body

    if (!userPublicKey) {
      return NextResponse.json(
        { error: 'Missing required field: userPublicKey' },
        { status: 400 }
      )
    }

    // Для POST запроса мы просто возвращаем успех
    // Вся логика свапа идет через GET запрос с правильным payer
    console.log('[Solana Tracker] POST request - userPublicKey:', userPublicKey)

    return NextResponse.json({
      success: true,
      message: 'Use GET endpoint with proper payer parameter',
      userPublicKey
    })

  } catch (error) {
    console.error('[Solana Tracker] POST Error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}




