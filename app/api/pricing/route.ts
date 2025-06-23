import { NextResponse } from 'next/server'
import { priceService } from '@/lib/pricing/services/priceService'

export const runtime = 'edge' // Используем edge runtime для лучшей производительности

export async function GET() {
  try {
    // Получаем цены через сервис
    const prices = await priceService.getAllPrices()
    
    // Получаем статус для мониторинга
    const status = priceService.getStatus()
    
    return NextResponse.json({
      success: true,
      data: {
        prices,
        status: {
          lastUpdate: status.lastUpdateTime,
          errors: status.consecutiveErrors,
          cacheAge: status.cache.prices?.age || null
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
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch prices',
      data: null
    }, { 
      status: 500,
      headers: {
        // Не кэшируем ошибки
        'Cache-Control': 'no-store',
      }
    })
  }
} 