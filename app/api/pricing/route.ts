import { NextResponse } from 'next/server'
import { getCachedRate, updateRatesCache, needsUpdate } from '@/lib/config/ratesCache'

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
    
    // Если нужно обновление, пробуем получить новый курс
    if (needsUpdate()) {
      const newRate = await fetchSolanaRate()
      if (newRate && newRate > 0 && newRate < 10000) { // Простая проверка на адекватность
        updateRatesCache(newRate)
        rate = newRate
      }
    }
    
    return NextResponse.json({
      success: true,
      rate,
      lastUpdate: new Date().toISOString()
    })
  } catch (error) {
    console.error('Pricing API error:', error)
    
    // В случае ошибки возвращаем кешированный или дефолтный курс
    return NextResponse.json({
      success: true,
      rate: getCachedRate(),
      lastUpdate: new Date().toISOString()
    })
  }
} 