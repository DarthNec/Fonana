// Простой кеш курсов валют на сервере
// Обновляется автоматически раз в 5 минут

interface RatesCache {
  SOL_USD: number
  lastUpdate: number
}

// Глобальный кеш для серверной части
let ratesCache: RatesCache | null = null

// Дефолтный курс если не удалось получить актуальный
const DEFAULT_RATE = 135

// Получить текущий курс из кеша
export function getCachedRate(): number {
  // Если кеш устарел больше чем на 5 минут, возвращаем дефолтный курс
  if (!ratesCache || Date.now() - ratesCache.lastUpdate > 5 * 60 * 1000) {
    return DEFAULT_RATE
  }
  return ratesCache.SOL_USD
}

// Обновить кеш новым курсом
export function updateRatesCache(rate: number) {
  ratesCache = {
    SOL_USD: rate,
    lastUpdate: Date.now()
  }
}

// Проверить нужно ли обновление
export function needsUpdate(): boolean {
  return !ratesCache || Date.now() - ratesCache.lastUpdate > 5 * 60 * 1000
} 