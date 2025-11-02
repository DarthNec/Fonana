import { NextRequest, NextResponse } from 'next/server'
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction
} from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount
} from '@solana/spl-token'
import bs58 from 'bs58'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// 🔹 RPC endpoint - используем тот же, что и для наград
const RPC_ENDPOINT = 'https://rpc.helius.xyz/?api-key=29fc7f17-2a08-48da-9c14-88780e1fedd0'

// 🔹 Приватный ключ кошелька-плательщика (тот же, что отправляет награды)
const SENDER_PRIVATE_KEY = '2GTLeohbNhpfdenQEXjan7erw391b7qCwErzzR6bQJ1NczosBLj7gJ6DpabgMJB6v5Vxt2Hu2R5JgbL2FFfd1a4u'

// 🔹 Адрес токена DogWater
const DOGWATER_MINT = new PublicKey('99smS99MkGP8WFggmUZWaVbe18Y8iWuC3YhGtUMMBray')

/**
 * POST /api/dogWater/initwallet
 * 
 * Создает Associated Token Account (ATA) для токена DogWater для пользователя
 * 
 * Body: { userWallet: string }
 * 
 * Returns: { 
 *   success: boolean, 
 *   ata?: string, 
 *   signature?: string, 
 *   alreadyExists?: boolean 
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userWallet } = body

    // Валидация входных данных
    if (!userWallet) {
      return NextResponse.json(
        { error: 'userWallet is required' },
        { status: 400 }
      )
    }

    console.log('[initwallet] Creating ATA for user:', userWallet)

    // Валидация формата кошелька пользователя
    let userPublicKey: PublicKey
    try {
      userPublicKey = new PublicKey(userWallet)
    } catch (error) {
      console.error('[initwallet] Invalid wallet format:', error)
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    // Создаем Keypair плательщика из приватного ключа
    let payerKeypair: Keypair
    try {
      const secretKey = bs58.decode(SENDER_PRIVATE_KEY)
      payerKeypair = Keypair.fromSecretKey(secretKey)
      console.log('[initwallet] Payer wallet:', payerKeypair.publicKey.toBase58())
    } catch (error) {
      console.error('[initwallet] Failed to decode private key:', error)
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Подключаемся к Solana
    const connection = new Connection(RPC_ENDPOINT, 'confirmed')

    // Находим адрес ATA для пользователя
    const ata = await getAssociatedTokenAddress(
      DOGWATER_MINT,
      userPublicKey,
      false // allowOwnerOffCurve = false (стандартное поведение)
    )

    console.log('[initwallet] ATA address:', ata.toBase58())

    // Проверяем, существует ли уже ATA
    try {
      const accountInfo = await getAccount(connection, ata)
      console.log('[initwallet] ATA already exists:', ata.toBase58())
      
      return NextResponse.json({
        success: true,
        ata: ata.toBase58(),
        alreadyExists: true,
        message: 'ATA already exists for this user'
      })
    } catch (error) {
      // ATA не существует, продолжаем создание
      console.log('[initwallet] ATA does not exist, creating...')
    }

    // Проверяем баланс плательщика
    const payerBalance = await connection.getBalance(payerKeypair.publicKey)
    console.log('[initwallet] Payer balance:', payerBalance / 1e9, 'SOL')

    if (payerBalance < 5000) { // ~0.000005 SOL минимум для комиссии
      console.error('[initwallet] Insufficient balance for ATA creation')
      return NextResponse.json(
        { error: 'Insufficient balance on server wallet' },
        { status: 500 }
      )
    }

    // Получаем последний blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed')

    // Создаем транзакцию с инструкцией создания ATA
    const transaction = new Transaction({
      feePayer: payerKeypair.publicKey,
      recentBlockhash: blockhash,
    }).add(
      createAssociatedTokenAccountInstruction(
        payerKeypair.publicKey, // плательщик комиссии
        ata,                    // адрес ATA
        userPublicKey,          // владелец ATA
        DOGWATER_MINT           // адрес токена
      )
    )

    // Подписываем и отправляем транзакцию
    console.log('[initwallet] Sending ATA creation transaction...')
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payerKeypair],
      {
        commitment: 'confirmed',
        skipPreflight: false,
      }
    )

    console.log('[initwallet] ATA created successfully!')
    console.log('[initwallet] Transaction:', signature)
    console.log('[initwallet] Solscan:', `https://solscan.io/tx/${signature}`)

    return NextResponse.json({
      success: true,
      ata: ata.toBase58(),
      signature: signature,
      solscan: `https://solscan.io/tx/${signature}`,
      message: 'ATA created successfully'
    })

  } catch (error) {
    console.error('[initwallet] Error creating ATA:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to create ATA',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

