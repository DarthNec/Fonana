import { NextResponse } from 'next/server'
import { getCachedRate, updateRatesCache, needsUpdate } from '@/lib/config/ratesCache'
import { PRICING_CONFIG } from '@/lib/pricing/config'

// Убираем edge runtime чтобы можно было делать внешние запросы
// export const runtime = 'edge'

async function fetchSolanaRate(): Promise<number | null> {
  try {
    // Используем CoinGecko API
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 300 } // Кешируем на 5 минут
      }
    )
    
    if (!response.ok) return null
    
    const data = await response.json()
    return data.solana?.usd || null
  } catch (error) {
    console.error('Error fetching Solana rate:', error)
    return null
  }
}

export async function GET() {
  try {
    let rate = getCachedRate()
    let source: 'coingecko' | 'cache' | 'fallback' = 'cache'
    
    // Если нужно обновление, пробуем получить новый курс
    if (needsUpdate()) {
      const newRate = await fetchSolanaRate()
      if (newRate && newRate > 0 && newRate < 10000) { // Простая проверка на адекватность
        updateRatesCache(newRate)
        rate = newRate
        source = 'coingecko'
      } else {
        source = 'fallback'
      }
    }
    
    // Формируем полный объект цен для совместимости с priceService
    const prices = {
      SOL_USD: rate,
      BTC_USD: PRICING_CONFIG.FALLBACK_PRICES.BTC_USD,
      ETH_USD: PRICING_CONFIG.FALLBACK_PRICES.ETH_USD,
      timestamp: Date.now(),
      source: source
    }
    
    // Возвращаем данные в двух форматах для обратной совместимости
    return NextResponse.json({
      success: true,
      // Старый формат для обратной совместимости
      rate: rate,
      lastUpdate: new Date().toISOString(),
      // Новый формат для priceService
      data: {
        prices: prices
      }
    })
  } catch (error) {
    console.error('Pricing API error:', error)
    
    const fallbackRate = getCachedRate()
    const fallbackPrices = {
      SOL_USD: fallbackRate,
      BTC_USD: PRICING_CONFIG.FALLBACK_PRICES.BTC_USD,
      ETH_USD: PRICING_CONFIG.FALLBACK_PRICES.ETH_USD,
      timestamp: Date.now(),
      source: 'fallback' as const
    }
    
    // В случае ошибки возвращаем кешированный или дефолтный курс
    return NextResponse.json({
      success: true,
      rate: fallbackRate,
      lastUpdate: new Date().toISOString(),
      data: {
        prices: fallbackPrices
      }
    })
  }
} 