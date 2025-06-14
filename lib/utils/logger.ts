// Простая система логирования для отслеживания операций

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

const LOG_LEVEL = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG

export class Logger {
  private context: string

  constructor(context: string) {
    this.context = context
  }

  private log(level: LogLevel, message: string, data?: any) {
    if (level < LOG_LEVEL) return

    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${this.context}] [${LogLevel[level]}]`

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message, data || '')
        break
      case LogLevel.INFO:
        console.info(prefix, message, data || '')
        break
      case LogLevel.WARN:
        console.warn(prefix, message, data || '')
        break
      case LogLevel.ERROR:
        console.error(prefix, message, data || '')
        break
    }
  }

  debug(message: string, data?: any) {
    this.log(LogLevel.DEBUG, message, data)
  }

  info(message: string, data?: any) {
    this.log(LogLevel.INFO, message, data)
  }

  warn(message: string, data?: any) {
    this.log(LogLevel.WARN, message, data)
  }

  error(message: string, error?: any) {
    this.log(LogLevel.ERROR, message, error)
  }

  // Специальный метод для логирования платежей
  payment(operation: string, details: {
    userId?: string
    creatorId?: string
    amount?: number
    currency?: string
    signature?: string
    hasReferrer?: boolean
    error?: any
  }) {
    const safeDetails = {
      ...details,
      userId: details.userId ? `${details.userId.slice(0, 8)}...` : undefined,
      creatorId: details.creatorId ? `${details.creatorId.slice(0, 8)}...` : undefined,
      signature: details.signature ? `${details.signature.slice(0, 16)}...` : undefined
    }
    
    if (details.error) {
      this.error(`Payment ${operation} failed`, safeDetails)
    } else {
      this.info(`Payment ${operation}`, safeDetails)
    }
  }
}

// Предварительно созданные логгеры для разных модулей
export const paymentLogger = new Logger('PAYMENT')
export const referralLogger = new Logger('REFERRAL')
export const apiLogger = new Logger('API') 