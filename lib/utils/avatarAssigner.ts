// Утилита для автоматического назначения уникальных CDN аватаров новым пользователям
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const AVATAR_CONFIG = {
  cdnBasePath: 'https://fonanastorage.b-cdn.net/avatars/default/',
  totalAvatars: 250,
  filePattern: 'female-portrait-{number}.jpg'
}

/**
 * Получить URL следующего доступного аватара
 * Автоматически увеличивает счетчик и возвращает уникальный аватар
 * Когда все 250 аватаров использованы - начинает с начала (циклически)
 * 
 * @returns {Promise<string>} URL CDN аватара
 */
export async function getNextAvatar(): Promise<string> {
  try {
    // 1. Получаем или создаем запись счетчика
    let counter = await prisma.avatarCounter.findUnique({
      where: { id: 1 }
    })
    
    // Если счетчик не существует - создаем с начальным значением 148
    if (!counter) {
      console.log('[AVATAR ASSIGNER] Initializing counter with value 148')
      counter = await prisma.avatarCounter.create({
        data: {
          id: 1,
          counter: 148,
          totalAvatars: AVATAR_CONFIG.totalAvatars
        }
      })
    }
    
    // 2. Атомарно увеличиваем счетчик
    const updatedCounter = await prisma.avatarCounter.update({
      where: { id: 1 },
      data: {
        counter: {
          increment: 1
        }
      }
    })
    
    // 3. Вычисляем индекс аватара (циклически: 1-250)
    const avatarIndex = ((updatedCounter.counter - 1) % AVATAR_CONFIG.totalAvatars) + 1
    
    // 4. Формируем URL с padding (001, 002, ..., 250)
    const paddedNumber = String(avatarIndex).padStart(3, '0')
    const avatarUrl = `${AVATAR_CONFIG.cdnBasePath}${AVATAR_CONFIG.filePattern.replace('{number}', paddedNumber)}`
    
    console.log(`[AVATAR ASSIGNER] ✅ Assigned avatar #${avatarIndex} (total used: ${updatedCounter.counter})`)
    console.log(`[AVATAR ASSIGNER] URL: ${avatarUrl}`)
    
    return avatarUrl
    
  } catch (error) {
    console.error('[AVATAR ASSIGNER] ❌ Error assigning avatar:', error)
    
    // Fallback: если что-то пошло не так - вернуть первый аватар
    const fallbackUrl = `${AVATAR_CONFIG.cdnBasePath}female-portrait-001.jpg`
    console.log(`[AVATAR ASSIGNER] Using fallback: ${fallbackUrl}`)
    return fallbackUrl
  }
}

/**
 * Получить статистику использования аватаров
 * 
 * @returns {Promise<object>} Статистика: used, total, available, cyclesCompleted
 */
export async function getAvatarStats() {
  try {
    const counter = await prisma.avatarCounter.findUnique({
      where: { id: 1 }
    })
    
    if (!counter) {
      return {
        used: 0,
        total: AVATAR_CONFIG.totalAvatars,
        available: AVATAR_CONFIG.totalAvatars,
        cyclesCompleted: 0
      }
    }
    
    const cyclesCompleted = Math.floor(counter.counter / AVATAR_CONFIG.totalAvatars)
    const currentCycleUsed = counter.counter % AVATAR_CONFIG.totalAvatars
    const available = currentCycleUsed === 0 ? 0 : AVATAR_CONFIG.totalAvatars - currentCycleUsed
    
    return {
      used: counter.counter,
      total: AVATAR_CONFIG.totalAvatars,
      available: available,
      cyclesCompleted: cyclesCompleted
    }
  } catch (error) {
    console.error('[AVATAR ASSIGNER] Error getting stats:', error)
    return {
      used: 0,
      total: AVATAR_CONFIG.totalAvatars,
      available: AVATAR_CONFIG.totalAvatars,
      cyclesCompleted: 0
    }
  }
}
