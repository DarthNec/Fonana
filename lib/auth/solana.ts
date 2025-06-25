import { PublicKey } from '@solana/web3.js'
import nacl from 'tweetnacl'
import bs58 from 'bs58'

// Генерация сообщения для подписи с временной меткой
export function generateSignMessage(nonce?: string): string {
  const timestamp = Date.now()
  const randomNonce = nonce || Math.random().toString(36).substring(7)
  return `Sign this message to authenticate with Fonana.\n\nTimestamp: ${timestamp}\nNonce: ${randomNonce}`
}

// Проверка подписи
export function verifySignature(
  message: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    const messageBytes = new TextEncoder().encode(message)
    const signatureBytes = bs58.decode(signature)
    const publicKeyBytes = bs58.decode(publicKey)
    
    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    )
  } catch (error) {
    console.error('Signature verification failed:', error)
    return false
  }
}

// Проверка временной метки в сообщении (защита от replay атак)
export function isMessageValid(message: string, maxAgeMs = 5 * 60 * 1000): boolean {
  try {
    const timestampMatch = message.match(/Timestamp: (\d+)/)
    if (!timestampMatch) return false
    
    const timestamp = parseInt(timestampMatch[1])
    const now = Date.now()
    
    // Проверяем, что сообщение не старше maxAgeMs (по умолчанию 5 минут)
    return (now - timestamp) < maxAgeMs
  } catch (error) {
    console.error('Message validation failed:', error)
    return false
  }
}

// Проверка, что адрес является валидным Solana публичным ключом
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address)
    return true
  } catch {
    return false
  }
}

// Определение окружения кошелька
export function detectWalletEnvironment() {
  if (typeof window === 'undefined') {
    return { isPhantom: false, isMobile: false, isInWalletBrowser: false }
  }
  
  const userAgent = window.navigator.userAgent.toLowerCase()
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
  const isPhantom = !!(window as any).phantom?.solana?.isPhantom
  
  // Улучшенная проверка встроенного браузера кошелька
  // Проверяем специфичные признаки embedded браузеров, а не просто наличие расширения
  const isInWalletBrowser = 
    // Phantom mobile app - проверяем что это именно приложение, а не просто браузер с расширением
    (userAgent.includes('phantom-app') || (userAgent.includes('phantom') && isMobile && userAgent.includes('mobile'))) ||
    // Solflare mobile app
    (userAgent.includes('solflare') && isMobile) ||
    // Backpack mobile app
    (userAgent.includes('backpack') && isMobile) ||
    // Trust Wallet
    userAgent.includes('trustwallet') ||
    // Проверяем специфичные window свойства для embedded browsers
    (isMobile && !!(window as any).ethereum && userAgent.includes('metamask'))
    // Убираем проблемную проверку для desktop Phantom - она срабатывает в обычных браузерах
  
  return { isPhantom, isMobile, isInWalletBrowser }
} 