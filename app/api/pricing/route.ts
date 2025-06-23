import { NextResponse } from 'next/server'
import { PRICING_CONFIG } from '@/lib/pricing/config'

// Убираем edge runtime чтобы можно было делать внешние запросы
// export const runtime = 'edge'

async function fetchFromCoinGecko() {
  try {
    const ids = 'solana,bitcoin,ethereum'
    const url = `${PRICING_CONFIG.APIs.COINGECKO}?ids=${ids}&vs_currencies=usd`
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      },
      next: { revalidate: 60 } // Кешируем на 60 секунд
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
      source: 'coingecko' as const
    }
  } catch (error) {
    console.error('CoinGecko error:', error)
    return null
  }
}

async function fetchFromBinance() {
  try {
    const symbols = ['SOLUSDT', 'BTCUSDT', 'ETHUSDT']
    const promises = symbols.map(symbol => 
      fetch(`${PRICING_CONFIG.APIs.BINANCE}?symbol=${symbol}`, {
        headers: {
          'Accept': 'application/json'
        },
        next: { revalidate: 60 }
      })
    )

    const responses = await Promise.all(promises)
    const data = await Promise.all(responses.map(r => r.json()))
    
    return {
      SOL_USD: parseFloat(data[0]?.price) || PRICING_CONFIG.FALLBACK_PRICES.SOL_USD,
      BTC_USD: parseFloat(data[1]?.price) || PRICING_CONFIG.FALLBACK_PRICES.BTC_USD,
      ETH_USD: parseFloat(data[2]?.price) || PRICING_CONFIG.FALLBACK_PRICES.ETH_USD,
      timestamp: Date.now(),
      source: 'binance' as const
    }
  } catch (error) {
    console.error('Binance error:', error)
    return null
  }
}

export async function GET() {
  try {
    // Пробуем получить цены от разных источников
    let prices = null
    
    // Сначала CoinGecko
    if (PRICING_CONFIG.FEATURES.USE_COINGECKO) {
      prices = await fetchFromCoinGecko()
    }
    
    // Если не получилось, пробуем Binance
    if (!prices && PRICING_CONFIG.FEATURES.USE_BINANCE) {
      prices = await fetchFromBinance()
    }
    
    // Если всё еще нет цен, используем fallback
    if (!prices) {
      prices = {
        ...PRICING_CONFIG.FALLBACK_PRICES,
        timestamp: Date.now(),
        source: 'fallback' as const
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        prices,
        status: {
          lastUpdate: Date.now(),
          errors: 0,
          cacheAge: null
        }
      }
    }, {
      headers: {
        // Кэшируем на CDN на 1 минуту
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      }
    })
  } catch (error) {
    console.error('Pricing API error:', error)
    
    // В случае ошибки возвращаем fallback цены
    return NextResponse.json({
      success: true,
      data: {
        prices: {
          ...PRICING_CONFIG.FALLBACK_PRICES,
          timestamp: Date.now(),
          source: 'fallback' as const
        },
        status: {
          lastUpdate: Date.now(),
          errors: 1,
          cacheAge: null
        }
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      }
    })
  }
} 