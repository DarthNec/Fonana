// Rate limiting для email endpoints
// Хранит timestamps запросов по IP адресу

interface RateLimitEntry {
  timestamps: number[]
}

const rateLimitMap = new Map<string, RateLimitEntry>()

// Очистка старых записей каждые 5 минут
setInterval(() => {
  const now = Date.now()
  const fiveMinutesAgo = now - 5 * 60 * 1000
  
  rateLimitMap.forEach((entry, ip) => {
    entry.timestamps = entry.timestamps.filter((ts: number) => ts > fiveMinutesAgo)
    if (entry.timestamps.length === 0) {
      rateLimitMap.delete(ip)
    }
  })
}, 5 * 60 * 1000)

/**
 * Проверяет rate limit для IP адреса
 * @param ip IP адрес клиента
 * @param maxRequests Максимальное количество запросов (по умолчанию 5)
 * @param windowMs Временное окно в миллисекундах (по умолчанию 1 минута)
 * @returns true если лимит превышен, false если можно продолжать
 */
export function checkRateLimit(
  ip: string,
  maxRequests: number = 5,
  windowMs: number = 60 * 1000
): { limited: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const windowStart = now - windowMs
  
  // Получаем или создаём запись для IP
  let entry = rateLimitMap.get(ip)
  if (!entry) {
    entry = { timestamps: [] }
    rateLimitMap.set(ip, entry)
  }
  
  // Фильтруем старые timestamps
  entry.timestamps = entry.timestamps.filter(ts => ts > windowStart)
  
  // Проверяем лимит
  if (entry.timestamps.length >= maxRequests) {
    const oldestTimestamp = Math.min(...entry.timestamps)
    const resetAt = oldestTimestamp + windowMs
    
    return {
      limited: true,
      remaining: 0,
      resetAt
    }
  }
  
  // Добавляем текущий timestamp
  entry.timestamps.push(now)
  
  return {
    limited: false,
    remaining: maxRequests - entry.timestamps.length,
    resetAt: now + windowMs
  }
}

/**
 * Получает IP адрес клиента из request
 */
export function getClientIP(req: Request): string {
  // Проверяем заголовки для реального IP (за прокси/CDN)
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  
  const realIP = req.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }
  
  // Fallback на connection remote address (но это не доступно в Edge Runtime)
  return 'unknown'
}
