import { PrismaClient } from '@prisma/client'

/**
 * 🔥 ЕДИНСТВЕННЫЙ СИНГЛТОН PRISMA CLIENT
 * 
 * ВСЕ файлы в проекте должны импортировать prisma ТОЛЬКО из этого файла!
 * НЕ создавать new PrismaClient() напрямую в других файлах!
 * 
 * Это предотвращает:
 * - Множественные подключения к БД
 * - Connection pool exhaustion
 * - Ошибки "Can't reach database server"
 */

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

// Создаём клиент только если его ещё нет
const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
    log: process.env.NODE_ENV === 'development' 
      ? ['error', 'warn'] 
      : ['error'],
  })
}

// Используем глобальную переменную для предотвращения создания новых инстансов при hot reload
export const prisma = globalThis.__prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}

export default prisma
