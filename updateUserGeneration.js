// 🔥 FIX 2026-03-09: Используем синглтон prisma для предотвращения connection pool exhaustion
const { prisma } = require('./lib/prisma')

/**
 * Получает всех пользователей с availableGenerationCount < 3
 */
async function getUsersWithLowGenerations() {
  try {
    console.log('[GenerationUpdater] Fetching users with low generation count...')
    
    const users = await prisma.user.findMany({
      where: {
        availableGenerationCount: {
          lt: 3
        }
      },
      select: {
        id: true,
        nickname: true,
        wallet: true,
        availableGenerationCount: true
      }
    })
    
    console.log(`[GenerationUpdater] Found ${users.length} users with availableGenerationCount < 3`)
    return users
  } catch (error) {
    console.error('[GenerationUpdater] Error fetching users:', error)
    return []
  }
}

/**
 * Обновляет availableGenerationCount для всех пользователей до 3
 */
async function updateUserGenerations() {
  try {
    console.log('[GenerationUpdater] Updating user generations to 3...')
    
    const result = await prisma.user.updateMany({
      where: {
        availableGenerationCount: {
          lt: 1
        }
      },
      data: {
        availableGenerationCount: 1
      }
    })
    
    console.log(`[GenerationUpdater] ✅ Successfully updated ${result.count} users`)
    return result.count
  } catch (error) {
    console.error('[GenerationUpdater] Error updating users:', error)
    return 0
  }
}

/**
 * Основная функция
 */
async function main() {
  console.log('\n[GenerationUpdater] ==========================================')
  console.log('[GenerationUpdater] Starting daily generation update...')
  console.log('[GenerationUpdater] Timestamp:', new Date().toISOString())
  console.log('[GenerationUpdater] ==========================================\n')
  
  try {
    // 1. Получаем список пользователей, которые будут обновлены (для логирования)
    const usersToUpdate = await getUsersWithLowGenerations()
    
    if (usersToUpdate.length === 0) {
      console.log('[GenerationUpdater] No users to update. All users have sufficient generations.')
      console.log('[GenerationUpdater] ==========================================\n')
      return
    }
    
    // Выводим информацию о пользователях
    console.log('[GenerationUpdater] Users to update:')
    usersToUpdate.forEach(user => {
      console.log(`  - ${user.nickname || user.wallet.substring(0, 8)} (ID: ${user.id}) | Current: ${user.availableGenerationCount} → New: 1`)
    })
    console.log('')
    
    // 2. Обновляем всех пользователей
    const updatedCount = await updateUserGenerations()
    
    console.log('\n[GenerationUpdater] ==========================================')
    console.log(`[GenerationUpdater] Update complete!`)
    console.log(`[GenerationUpdater] Total users updated: ${updatedCount}`)
    console.log('[GenerationUpdater] ==========================================\n')
    
  } catch (error) {
    console.error('[GenerationUpdater] Fatal error:', error)
  }
  // 🔥 FIX 2026-03-09: Не вызываем prisma.$disconnect() - синглтон управляет lifecycle сам
}

// Запускаем скрипт
if (require.main === module) {
  main()
    .then(() => {
      console.log('[GenerationUpdater] Script finished successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('[GenerationUpdater] Script failed:', error)
      process.exit(1)
    })
}

module.exports = { main }

