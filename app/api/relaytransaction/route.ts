import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Настрой через env: SOLANA_RPC (желательно свой Helius/Alchemy/QuickNode)
const RPC = 'https://rpc.helius.xyz/?api-key=29fc7f17-2a08-48da-9c14-88780e1fedd0';

function looksBase58(s: string) {
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(s);
}

export async function POST(req: NextRequest) {
  try {
    console.log('🛰️ [relay] Incoming request to relay-transaction')

    const { signedTransaction, encoding, waitForConfirmation } = await req.json()
    console.log('📦 [relay] Body parsed:', {
      encoding,
      waitForConfirmation,
      txPreview: signedTransaction?.substring?.(0, 30),
    })

    if (!signedTransaction || typeof signedTransaction !== 'string') {
      console.error('❌ [relay] signedTransaction missing or invalid')
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
      console.error('❌ [relay] Failed to decode transaction:', decodeError)
      return NextResponse.json({ error: 'Invalid signedTransaction encoding' }, { status: 400 })
    }

    console.log('📏 [relay] Transaction size:', bytes.length)
    if (bytes.length < 100) {
      console.error('❌ [relay] Transaction too short')
      return NextResponse.json({ error: 'Signed tx too short' }, { status: 400 })
    }

    const txBase64 = Buffer.from(bytes).toString('base64')

    // skipPreflight: true - пропускаем симуляцию, так как транзакция уже подписана
    // и blockhash может устареть между созданием и отправкой
    const sendBody = {
      jsonrpc: '2.0',
      id: 1,
      method: 'sendTransaction',
      params: [txBase64, { 
        encoding: 'base64', 
        skipPreflight: true,  // Пропускаем preflight для избежания "Blockhash not found"
        maxRetries: 3,         // Повторные попытки при ошибке
        preflightCommitment: 'confirmed'
      }],
    };
      

    console.log('🚀 [relay] Sending to RPC:', RPC)
    const sendRes = await fetch(RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(sendBody),
    })

    const text = await sendRes.text()
    console.log('📡 [relay] RPC raw response:', text.substring(0, 200))

    let sendJson
    try {
      sendJson = JSON.parse(text)
    } catch (parseError: any) {
      console.error('❌ [relay] RPC returned non-JSON response')
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
      console.error('❌ [relay] RPC error:', sendJson.error)
      
      // Специальная обработка ошибки "Blockhash not found"
      const errorMessage = JSON.stringify(sendJson.error)
      if (errorMessage.includes('Blockhash not found') || errorMessage.includes('block height exceeded')) {
        return NextResponse.json({ 
          error: 'Transaction expired',
          details: 'Blockhash has expired. Please create a new transaction.',
          code: 'BLOCKHASH_EXPIRED',
          originalError: sendJson.error
        }, { status: 400 })
      }
      
      return NextResponse.json({ error: sendJson.error }, { status: 502 })
    }

    const signature: string = sendJson.result
    console.log('✅ [relay] Transaction sent, signature:', signature)

    // 3) (опционально) подтверждение
    if (waitForConfirmation) {
      console.log('⏳ [relay] Waiting for confirmation...')
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
          console.log('🎉 [relay] Confirmed:', s.confirmationStatus)
          return NextResponse.json({ signature, confirmationStatus: s.confirmationStatus })
        }
        await new Promise((res) => setTimeout(res, 2000))
      }

      console.warn('⚠️ [relay] Timeout waiting for confirmation')
      return NextResponse.json({ signature, confirmationStatus: 'timeout' })
    }

    return NextResponse.json({ signature })
  } catch (e: any) {
    console.error('💥 [relay] Fatal error:', e)
    return NextResponse.json({ error: e?.message ?? 'relay error', stack: e?.stack }, { status: 500 })
  }
}
