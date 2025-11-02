import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// RPC endpoint для Solana
const RPC = 'https://rpc.helius.xyz/?api-key=29fc7f17-2a08-48da-9c14-88780e1fedd0';

function looksBase58(s: string) {
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(s);
}

// POST /api/relaytransaction/swap - отправка swap транзакции в сеть Solana
export async function POST(req: NextRequest) {
  try {
    console.log('🔄 [relay-swap] Incoming request to relay swap transaction')

    const { signedTransaction, encoding, waitForConfirmation } = await req.json()
    console.log('📦 [relay-swap] Body parsed:', {
      encoding,
      waitForConfirmation,
      txPreview: signedTransaction?.substring?.(0, 30),
    })

    if (!signedTransaction || typeof signedTransaction !== 'string') {
      console.error('❌ [relay-swap] signedTransaction missing or invalid')
      return NextResponse.json({ error: 'signedTransaction required' }, { status: 400 })
    }

    // 1) Преобразуем в base64
    let bytes: Uint8Array
    try {
      if ((encoding ?? '') === 'base64' || (!encoding && !looksBase58(signedTransaction))) {
        bytes = Buffer.from(signedTransaction, 'base64')
      } else {
        const bs58 = (await import('bs58')).default
        bytes = bs58.decode(signedTransaction)
      }
    } catch (decodeError: any) {
      console.error('❌ [relay-swap] Failed to decode transaction:', decodeError)
      return NextResponse.json({ error: 'Invalid signedTransaction encoding' }, { status: 400 })
    }

    console.log('📏 [relay-swap] Transaction size:', bytes.length)
    if (bytes.length < 100) {
      console.error('❌ [relay-swap] Transaction too short')
      return NextResponse.json({ error: 'Signed tx too short' }, { status: 400 })
    }

    const txBase64 = Buffer.from(bytes).toString('base64')

    // skipPreflight: true - пропускаем симуляцию для swap транзакций
    // так как они могут содержать динамические данные о ценах
    const sendBody = {
      jsonrpc: '2.0',
      id: 1,
      method: 'sendTransaction',
      params: [txBase64, { 
        encoding: 'base64', 
        skipPreflight: true,  // Пропускаем preflight для swap транзакций
        maxRetries: 3,         // Повторные попытки при ошибке
        preflightCommitment: 'confirmed'
      }],
    };

    console.log('🚀 [relay-swap] Sending swap transaction to RPC:', RPC)
    const sendRes = await fetch(RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(sendBody),
    })

    const text = await sendRes.text()
    console.log('📡 [relay-swap] RPC raw response:', text.substring(0, 200))

    let sendJson
    try {
      sendJson = JSON.parse(text)
    } catch (parseError: any) {
      console.error('❌ [relay-swap] RPC returned non-JSON response')
      return NextResponse.json(
        {
          error: 'Invalid RPC JSON response',
          details: text.substring(0, 500),
          rpc: RPC,
        },
        { status: 502 }
      )
    }

    if (sendJson?.error) {
      console.error('❌ [relay-swap] RPC error:', sendJson.error)
      
      // Специальная обработка ошибок для swap транзакций
      const errorMessage = JSON.stringify(sendJson.error)
      
      if (errorMessage.includes('Blockhash not found') || errorMessage.includes('block height exceeded')) {
        return NextResponse.json({ 
          error: 'Transaction expired',
          details: 'Blockhash has expired. Please create a new swap transaction.',
          code: 'BLOCKHASH_EXPIRED',
          originalError: sendJson.error
        }, { status: 400 })
      }
      
      if (errorMessage.includes('slippage tolerance exceeded') || errorMessage.includes('Price impact too high')) {
        return NextResponse.json({ 
          error: 'Swap failed',
          details: 'Price changed too much. Please try again.',
          code: 'SLIPPAGE_EXCEEDED',
          originalError: sendJson.error
        }, { status: 400 })
      }
      
      return NextResponse.json({ error: sendJson.error }, { status: 502 })
    }

    const signature: string = sendJson.result
    console.log('✅ [relay-swap] Swap transaction sent, signature:', signature)

    // 3) (опционально) подтверждение
    if (waitForConfirmation) {
      console.log('⏳ [relay-swap] Waiting for confirmation...')
      const confBody = {
        jsonrpc: '2.0',
        id: 2,
        method: 'getSignatureStatuses',
        params: [[signature], { searchTransactionHistory: true }],
      }

      let tries = 30
      while (tries-- > 0) {
        const r = await fetch(RPC, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(confBody),
        })
        const j = await r.json()
        const s = j?.result?.value?.[0]
        
        if (s?.confirmationStatus === 'confirmed' || s?.confirmationStatus === 'finalized') {
          console.log('🎉 [relay-swap] Confirmed:', s.confirmationStatus)
          return NextResponse.json({ 
            signature, 
            confirmationStatus: s.confirmationStatus,
            swapSuccess: true 
          })
        }
        
        await new Promise((res) => setTimeout(res, 2000))
      }

      console.warn('⚠️ [relay-swap] Timeout waiting for confirmation')
      return NextResponse.json({ 
        signature, 
        confirmationStatus: 'timeout',
        swapSuccess: false 
      })
    }

    return NextResponse.json({ signature, swapSuccess: true })
  } catch (e: any) {
    console.error('💥 [relay-swap] Fatal error:', e)
    return NextResponse.json({ 
      error: e?.message ?? 'relay swap error', 
      stack: e?.stack 
    }, { status: 500 })
  }
}

