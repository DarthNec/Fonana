'use client'

import bs58 from 'bs58'
import nacl from 'tweetnacl'

/**
 * Phantom Mobile Deep Link Utility
 * Handles encryption keypair generation and deep link creation for mobile wallet connection
 */

interface PhantomConnectionParams {
  appUrl: string
  redirectLink: string
  cluster?: 'mainnet-beta' | 'devnet' | 'testnet'
}

/**
 * Генерирует или получает encryption keypair для dApp
 * Сохраняет в localStorage для последующего использования
 */
export function getDappEncryptionKeypair() {
  const STORAGE_KEY = 'fonana_dapp_encryption_keypair'
  
  try {
    // Проверяем существующую пару ключей
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const { publicKey, secretKey } = JSON.parse(stored)
      return {
        publicKey: new Uint8Array(publicKey),
        secretKey: new Uint8Array(secretKey)
      }
    }
    
    // Генерируем новую пару ключей
    const keypair = nacl.box.keyPair()
    
    // Сохраняем в localStorage (конвертируем в массив для сериализации)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      publicKey: Array.from(keypair.publicKey),
      secretKey: Array.from(keypair.secretKey)
    }))
    
    console.log('[Phantom Mobile] New encryption keypair generated')
    
    return keypair
  } catch (error) {
    console.error('[Phantom Mobile] Error managing encryption keypair:', error)
    // Fallback: генерируем новую пару без сохранения
    return nacl.box.keyPair()
  }
}

/**
 * Создает правильный Phantom Deep Link для подключения кошелька
 */
export function createPhantomConnectDeepLink(params: PhantomConnectionParams): string {
  const { appUrl, redirectLink, cluster = 'mainnet-beta' } = params
  
  // Получаем encryption keypair
  const keypair = getDappEncryptionKeypair()
  
  // Конвертируем public key в base58
  const dappEncryptionPublicKey = bs58.encode(keypair.publicKey)
  
  console.log('[Phantom Mobile] Creating deep link:', {
    appUrl,
    redirectLink,
    cluster,
    dappPublicKey: dappEncryptionPublicKey.substring(0, 20) + '...'
  })
  
  // Формируем URL с правильными параметрами
  const deepLink = new URL('https://phantom.app/ul/v1/connect')
  deepLink.searchParams.set('app_url', appUrl)
  deepLink.searchParams.set('dapp_encryption_public_key', dappEncryptionPublicKey)
  deepLink.searchParams.set('redirect_link', redirectLink)
  deepLink.searchParams.set('cluster', cluster)
  
  const finalUrl = deepLink.toString()
  console.log('[Phantom Mobile] Deep link created:', finalUrl)
  
  return finalUrl
}

/**
 * Проверяет, является ли текущее устройство мобильным
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  
  const userAgent = window.navigator.userAgent.toLowerCase()
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
}

/**
 * Проверяет, установлен ли Phantom в текущем браузере
 */
export function isPhantomInstalled(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window as any).solana?.isPhantom
}

/**
 * Обрабатывает возврат из Phantom после подключения
 * Извлекает параметры из URL
 */
export interface PhantomCallbackData {
  phantomEncryptionPublicKey: string
  data: string
  nonce: string
}

export function parsePhantomCallback(): PhantomCallbackData | null {
  if (typeof window === 'undefined') return null
  
  const params = new URLSearchParams(window.location.search)
  
  const phantomPublicKey = params.get('phantom_encryption_public_key')
  const data = params.get('data')
  const nonce = params.get('nonce')
  
  if (!phantomPublicKey || !data || !nonce) {
    return null
  }
  
  console.log('[Phantom Mobile] Callback parameters detected:', {
    hasPublicKey: !!phantomPublicKey,
    hasData: !!data,
    hasNonce: !!nonce
  })
  
  return {
    phantomEncryptionPublicKey: phantomPublicKey,
    data,
    nonce
  }
}

/**
 * Расшифровывает данные от Phantom (публичный ключ пользователя)
 */
export function decryptPhantomPayload(
  data: string,
  nonce: string,
  phantomPublicKey: string
): string | null {
  try {
    // Получаем наш секретный ключ
    const dappKeypair = getDappEncryptionKeypair()
    
    // Декодируем из base58
    const dataBytes = bs58.decode(data)
    const nonceBytes = bs58.decode(nonce)
    const phantomPublicKeyBytes = bs58.decode(phantomPublicKey)
    
    // Расшифровываем
    const decryptedData = nacl.box.open(
      dataBytes,
      nonceBytes,
      phantomPublicKeyBytes,
      dappKeypair.secretKey
    )
    
    if (!decryptedData) {
      console.error('[Phantom Mobile] Failed to decrypt payload')
      return null
    }
    
    // Конвертируем в строку
    const decoder = new TextDecoder()
    const decryptedString = decoder.decode(decryptedData)
    
    console.log('[Phantom Mobile] Payload decrypted successfully')
    
    return decryptedString
    
  } catch (error) {
    console.error('[Phantom Mobile] Error decrypting payload:', error)
    return null
  }
}
