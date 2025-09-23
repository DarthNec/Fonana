import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

export const prisma = globalThis.prisma || new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  // 🔥 ОГРАНИЧИВАЕМ КОЛИЧЕСТВО ПОДКЛЮЧЕНИЙ
  // Для большинства приложений достаточно 5-10 подключений
  __internal: {
    engine: {
      connectionLimit: 5  // Максимум 5 подключений вместо 49
    }
  }
})

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
} 