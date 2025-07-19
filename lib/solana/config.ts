import { Connection, clusterApiUrl } from '@solana/web3.js';

// Получаем конфигурацию из переменных окружения
const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';
const customRpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_HOST;

// Определяем RPC URL на основе настроек
function getSolanaRpcUrl(): string {
  // Если есть кастомный RPC URL, используем его
  if (customRpcUrl) {
    console.log('[Solana Config] Using custom RPC URL:', customRpcUrl);
    return customRpcUrl;
  }
  
  // Иначе используем стандартные endpoints Solana
  if (network === 'mainnet-beta') {
    const url = clusterApiUrl('mainnet-beta');
    console.log('[Solana Config] Using mainnet-beta RPC:', url);
    return url;
  } else if (network === 'testnet') {
    const url = clusterApiUrl('testnet');
    console.log('[Solana Config] Using testnet RPC:', url);
    return url;
  } else {
    // devnet или fallback
    const url = clusterApiUrl('devnet');
    console.log('[Solana Config] Using devnet RPC:', url);
    return url;
  }
}

// Создаем connection с правильным RPC URL
const rpcUrl = getSolanaRpcUrl();
console.log('[Solana Config] Network:', network);
console.log('[Solana Config] Final RPC URL:', rpcUrl);

export const connection = new Connection(rpcUrl, 'confirmed');

// Экспортируем также платформенный кошелек
export const PLATFORM_WALLET = process.env.NEXT_PUBLIC_PLATFORM_WALLET || 'EEqsmopVfTuaiJrh8xL7ZsZbUctckY6S5WyHYR66wjpw';

console.log('[Solana Config] Platform wallet:', PLATFORM_WALLET);

// Экспортируем сетевую конфигурацию
export const SOLANA_NETWORK = network;
export const RPC_URL = rpcUrl;

// Конфигурация Solana и проверка переменных окружения

export const SOLANA_CONFIG = {
  // Network configuration
  NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet-beta',
  RPC_HOST: process.env.NEXT_PUBLIC_SOLANA_RPC_HOST || 
    'https://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/',
  WS_ENDPOINT: process.env.NEXT_PUBLIC_SOLANA_WS_ENDPOINT ||
    'wss://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/',
  
  // Platform configuration
  PLATFORM_WALLET: process.env.NEXT_PUBLIC_PLATFORM_WALLET || 'EEqsmopVfTuaiJrh8xL7ZsZbUctckY6S5WyHYR66wjpw',
  
  // Таймауты
  CONFIRMATION_TIMEOUT: 30000, // 30 секунд
  
  // Минимальные суммы
  MIN_PAYMENT_AMOUNT: 0.001, // 0.001 SOL минимум
  MIN_REFERRAL_WITHDRAWAL: 0.1, // 0.1 SOL минимум для вывода реферальных
}

// Проверка критических переменных при старте
export function validateSolanaConfig() {
  const warnings: string[] = []
  
  if (!process.env.NEXT_PUBLIC_PLATFORM_WALLET) {
    warnings.push('NEXT_PUBLIC_PLATFORM_WALLET не установлен - используется дефолтный кошелек')
  }
  
  if (!process.env.NEXT_PUBLIC_SOLANA_RPC_HOST) {
    warnings.push('NEXT_PUBLIC_SOLANA_RPC_HOST не установлен - используется встроенный QuickNode RPC')
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️  Solana Config Warnings:')
    warnings.forEach(w => console.warn(`   - ${w}`))
  }
  
  // Логируем текущую конфигурацию (маскируя чувствительные данные)
  console.info('📡 Solana Configuration:')
  console.info(`   RPC: ${SOLANA_CONFIG.RPC_HOST.substring(0, 30)}...`)
  console.info(`   Platform Wallet: ${SOLANA_CONFIG.PLATFORM_WALLET.substring(0, 8)}...`)
  console.info(`   Network: ${SOLANA_CONFIG.NETWORK}`)
  
  return warnings
}

// Валидация Solana адреса
export function isValidSolanaAddress(address: string | null | undefined): boolean {
  if (!address) return false
  
  try {
    // Проверяем длину (32 байта в base58 = 44 символа)
    if (address.length < 32 || address.length > 44) return false
    
    // Проверяем символы base58
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/
    return base58Regex.test(address)
  } catch {
    return false
  }
} 