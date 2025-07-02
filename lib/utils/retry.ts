/**
 * Утилиты для retry логики с exponential backoff
 * Обеспечивает устойчивость к временным сбоям сети и API
 */

export interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  jitter: boolean
}

export interface RetryResult<T> {
  success: boolean
  data?: T
  error?: Error
  attempts: number
  totalTime: number
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 секунда
  maxDelay: 10000, // 10 секунд
  backoffMultiplier: 2,
  jitter: true
}

/**
 * Вычисляет задержку с exponential backoff
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = Math.min(
    config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
    config.maxDelay
  )

  if (config.jitter) {
    // Добавляем случайность для предотвращения thundering herd
    const jitter = delay * 0.1 * Math.random()
    return delay + jitter
  }

  return delay
}

/**
 * Retry функция с exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const startTime = Date.now()
  let lastError: Error

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      const data = await fn()
      return {
        success: true,
        data,
        attempts: attempt,
        totalTime: Date.now() - startTime
      }
    } catch (error) {
      lastError = error as Error
      
      // Если это последняя попытка, возвращаем ошибку
      if (attempt === finalConfig.maxAttempts) {
        break
      }

      // Проверяем, стоит ли повторять попытку
      if (!shouldRetry(error as Error)) {
        break
      }

      // Ждем перед следующей попыткой
      const delay = calculateDelay(attempt, finalConfig)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  return {
    success: false,
    error: lastError!,
    attempts: finalConfig.maxAttempts,
    totalTime: Date.now() - startTime
  }
}

/**
 * Определяет, стоит ли повторять попытку для данной ошибки
 */
function shouldRetry(error: Error): boolean {
  // Повторяем для сетевых ошибок и временных сбоев сервера
  const retryableErrors = [
    'NetworkError',
    'TypeError',
    'AbortError',
    'TimeoutError'
  ]

  const retryableMessages = [
    'network',
    'timeout',
    'connection',
    'temporary',
    'rate limit',
    'server error',
    'service unavailable'
  ]

  // Проверяем тип ошибки
  if (retryableErrors.some(type => error.name.includes(type))) {
    return true
  }

  // Проверяем сообщение ошибки
  const message = error.message.toLowerCase()
  if (retryableMessages.some(keyword => message.includes(keyword))) {
    return true
  }

  // Проверяем HTTP статус коды (если есть)
  if ('status' in error) {
    const status = (error as any).status
    return status >= 500 || status === 429 // 5xx ошибки и rate limit
  }

  return false
}

/**
 * Retry для API запросов
 */
export async function retryApiRequest<T>(
  requestFn: () => Promise<Response>,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  return retry(async () => {
    const response = await requestFn()
    
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`)
      ;(error as any).status = response.status
      throw error
    }
    
    return response.json() as T
  }, config)
}

/**
 * Retry для функций с таймаутом
 */
export async function retryWithTimeout<T>(
  fn: () => Promise<T>,
  timeout: number,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  return retry(async () => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), timeout)
    })

    return Promise.race([fn(), timeoutPromise])
  }, config)
}

/**
 * Retry для функций с условием успеха
 */
export async function retryUntil<T>(
  fn: () => Promise<T>,
  condition: (result: T) => boolean,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  return retry(async () => {
    const result = await fn()
    if (!condition(result)) {
      throw new Error('Condition not met')
    }
    return result
  }, config)
}

/**
 * Хук для использования retry в React компонентах
 */
export function useRetry() {
  const retryWithToast = async <T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    context?: string
  ): Promise<T | null> => {
    const result = await retry(fn, config)
    
    if (!result.success) {
      console.error(`[${context || 'Retry'}] Failed after ${result.attempts} attempts:`, result.error)
      
      // Показываем toast уведомление
      const { toast } = await import('react-hot-toast')
      toast.error(`Ошибка после ${result.attempts} попыток. Попробуйте еще раз.`, {
        duration: 5000
      })
      
      return null
    }
    
    return result.data || null
  }

  return { retryWithToast }
}

/**
 * Конфигурации для разных типов операций
 */
export const RETRY_CONFIGS = {
  // Быстрые операции (лайки, комментарии)
  fast: {
    maxAttempts: 2,
    baseDelay: 500,
    maxDelay: 2000,
    backoffMultiplier: 1.5,
    jitter: true
  },
  
  // Обычные API запросы
  normal: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 2,
    jitter: true
  },
  
  // Медленные операции (загрузка файлов, тяжелые запросы)
  slow: {
    maxAttempts: 3,
    baseDelay: 2000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true
  },
  
  // Критически важные операции
  critical: {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 15000,
    backoffMultiplier: 2,
    jitter: true
  }
} as const 