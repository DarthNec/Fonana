export const PRICING_CONFIG = {
  // API endpoints
  APIs: {
    COINGECKO: 'https://api.coingecko.com/api/v3/simple/price',
    BINANCE: 'https://api.binance.com/api/v3/ticker/price',
  },
  
  // Cache settings
  CACHE: {
    TTL: 5 * 60 * 1000, // 5 минут в миллисекундах
    STALE_TTL: 30 * 60 * 1000, // 30 минут для stale данных
  },
  
  // Fallback prices
  FALLBACK_PRICES: {
    SOL_USD: 100,  // Безопасное значение по умолчанию
    BTC_USD: 50000,
    ETH_USD: 3000,
  },
  
  // API timeouts
  REQUEST_TIMEOUT: 3000, // 3 секунды
  
  // Rate limits
  MIN_UPDATE_INTERVAL: 60 * 1000, // Минимум 1 минута между обновлениями
  
  // Price change thresholds
  THRESHOLDS: {
    MAX_PRICE_CHANGE_PERCENT: 50, // Максимальное изменение за час
    MIN_PRICE: 0.01, // Минимальная цена SOL в USD
    MAX_PRICE: 10000, // Максимальная цена SOL в USD
  },
  
  // Feature flags
  FEATURES: {
    USE_COINGECKO: true,
    USE_BINANCE: true,
    LOG_PRICE_UPDATES: true,
    AUTO_ROLLBACK_ON_ERROR: true,
  },
  
  // Supported currencies
  SUPPORTED_CRYPTOS: ['SOL', 'BTC', 'ETH'] as const,
  
  // Display settings
  DISPLAY: {
    USD_SYMBOL: '$',
    DECIMAL_PLACES: 2,
    SHOW_EXCHANGE_RATE: true,
    UPDATE_INDICATOR: true,
  }
}

export type SupportedCrypto = typeof PRICING_CONFIG.SUPPORTED_CRYPTOS[number]

export interface PriceData {
  SOL_USD: number
  BTC_USD: number
  ETH_USD: number
  timestamp: number
  source: 'coingecko' | 'binance' | 'cache' | 'fallback'
  isStale?: boolean
} 