import { PRICING_CONFIG, PriceData, SupportedCrypto } from '../config'
import { cacheService } from './cacheService'

class PriceService {
  private static instance: PriceService
  private lastUpdateTime: number = 0
  private consecutiveErrors: number = 0
  private lastPrices: PriceData | null = null

  private constructor() {}

  static getInstance(): PriceService {
    if (!PriceService.instance) {
      PriceService.instance = new PriceService()
    }
    return PriceService.instance
  }

  async getPrice(crypto: SupportedCrypto = 'SOL'): Promise<number> {
    const priceData = await this.getAllPrices()
    return priceData[`${crypto}_USD`]
  }

  async getAllPrices(): Promise<PriceData> {
    // Проверяем кэш
    const cached = cacheService.get('prices')
    if (cached && !cached.isStale) {
      return cached
    }

    // Проверяем rate limit
    const now = Date.now()
    if (now - this.lastUpdateTime < PRICING_CONFIG.MIN_UPDATE_INTERVAL) {
      return cached || this.getFallbackPrices()
    }

    this.lastUpdateTime = now

    try {
      // Пробуем получить цены
      const prices = await this.fetchPrices()
      
      // Валидируем цены
      if (this.validatePrices(prices)) {
        this.consecutiveErrors = 0
        this.lastPrices = prices
        cacheService.set('prices', prices)
        
        if (PRICING_CONFIG.FEATURES.LOG_PRICE_UPDATES) {
          console.log('Price update:', prices)
        }
        
        return prices
      }
    } catch (error) {
      this.consecutiveErrors++
      console.error('Price fetch error:', error)
      
      // Автоматический откат после 5 ошибок подряд
      if (this.consecutiveErrors >= 5 && PRICING_CONFIG.FEATURES.AUTO_ROLLBACK_ON_ERROR) {
        console.warn('Too many errors, using fallback prices')
        return this.getFallbackPrices()
      }
    }

    // Возвращаем кэшированные данные или fallback
    return cached || this.lastPrices || this.getFallbackPrices()
  }

  private async fetchPrices(): Promise<PriceData> {
    const errors: Error[] = []

    // Пробуем CoinGecko
    if (PRICING_CONFIG.FEATURES.USE_COINGECKO) {
      try {
        const prices = await this.fetchFromCoinGecko()
        if (prices) return prices
      } catch (error) {
        errors.push(error as Error)
      }
    }

    // Пробуем Binance
    if (PRICING_CONFIG.FEATURES.USE_BINANCE) {
      try {
        const prices = await this.fetchFromBinance()
        if (prices) return prices
      } catch (error) {
        errors.push(error as Error)
      }
    }

    // Если все API не работают
    if (errors.length > 0) {
      throw new Error(`All APIs failed: ${errors.map(e => e.message).join(', ')}`)
    }

    throw new Error('No price sources available')
  }

  private async fetchFromCoinGecko(): Promise<PriceData | null> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), PRICING_CONFIG.REQUEST_TIMEOUT)

    try {
      const ids = 'solana,bitcoin,ethereum'
      const url = `${PRICING_CONFIG.APIs.COINGECKO}?ids=${ids}&vs_currencies=usd`
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`)
      }

      const data = await response.json()
      
      return {
        SOL_USD: data.solana?.usd || PRICING_CONFIG.FALLBACK_PRICES.SOL_USD,
        BTC_USD: data.bitcoin?.usd || PRICING_CONFIG.FALLBACK_PRICES.BTC_USD,
        ETH_USD: data.ethereum?.usd || PRICING_CONFIG.FALLBACK_PRICES.ETH_USD,
        timestamp: Date.now(),
        source: 'coingecko'
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('CoinGecko request timeout')
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }

  private async fetchFromBinance(): Promise<PriceData | null> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), PRICING_CONFIG.REQUEST_TIMEOUT)

    try {
      const symbols = ['SOLUSDT', 'BTCUSDT', 'ETHUSDT']
      const promises = symbols.map(symbol => 
        fetch(`${PRICING_CONFIG.APIs.BINANCE}?symbol=${symbol}`, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json'
          }
        })
      )

      const responses = await Promise.all(promises)
      const data = await Promise.all(responses.map(r => r.json()))
      
      return {
        SOL_USD: parseFloat(data[0]?.price) || PRICING_CONFIG.FALLBACK_PRICES.SOL_USD,
        BTC_USD: parseFloat(data[1]?.price) || PRICING_CONFIG.FALLBACK_PRICES.BTC_USD,
        ETH_USD: parseFloat(data[2]?.price) || PRICING_CONFIG.FALLBACK_PRICES.ETH_USD,
        timestamp: Date.now(),
        source: 'binance'
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Binance request timeout')
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }

  private validatePrices(prices: PriceData): boolean {
    // Проверяем диапазоны цен
    const { MIN_PRICE, MAX_PRICE, MAX_PRICE_CHANGE_PERCENT } = PRICING_CONFIG.THRESHOLDS

    if (prices.SOL_USD < MIN_PRICE || prices.SOL_USD > MAX_PRICE) {
      console.warn(`SOL price out of range: ${prices.SOL_USD}`)
      return false
    }

    // Проверяем изменение цены (если есть последняя цена)
    if (this.lastPrices) {
      const changePercent = Math.abs(
        ((prices.SOL_USD - this.lastPrices.SOL_USD) / this.lastPrices.SOL_USD) * 100
      )
      
      if (changePercent > MAX_PRICE_CHANGE_PERCENT) {
        console.warn(`SOL price change too large: ${changePercent}%`)
        return false
      }
    }

    return true
  }

  private getFallbackPrices(): PriceData {
    return {
      ...PRICING_CONFIG.FALLBACK_PRICES,
      timestamp: Date.now(),
      source: 'fallback'
    }
  }

  // Методы для дебага и мониторинга
  getStatus() {
    return {
      lastUpdateTime: this.lastUpdateTime,
      consecutiveErrors: this.consecutiveErrors,
      lastPrices: this.lastPrices,
      cache: cacheService.getAll()
    }
  }

  resetErrors() {
    this.consecutiveErrors = 0
  }
}

export const priceService = PriceService.getInstance() 