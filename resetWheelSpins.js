#!/usr/bin/env node

/**
 * WHEEL SPINS RESET SCRIPT
 * 
 * Назначение: Ежедневно начисляет 1 вращение колеса всем пользователям, у которых 0 вращений
 * Запуск: PM2 cron (раз в сутки в 00:00)
 * 
 * Логика:
 * - Находит всех пользователей с availableWheelSpins = 0
 * - Обновляет им availableWheelSpins = 1
 * - Логирует количество обновлённых пользователей
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function resetWheelSpins() {
  console.log('🎰 [Wheel Spins Reset] Starting daily wheel spins reset...')
  console.log(`🕐 [Wheel Spins Reset] Execution time: ${new Date().toISOString()}`)

  try {
    // ==================== 1. НАЙТИ ПОЛЬЗОВАТЕЛЕЙ С 0 ВРАЩЕНИЙ ====================
    console.log('🔍 [Wheel Spins Reset] Finding users with 0 wheel spins...')
    
    const usersWithZeroSpins = await prisma.user.findMany({
      where: {
        availableWheelSpins: 0
      },
      select: {
        id: true,
        nickname: true,
        wallet: true,
        availableWheelSpins: true
      }
    })

    console.log(`📊 [Wheel Spins Reset] Found ${usersWithZeroSpins.length} users with 0 spins`)

    if (usersWithZeroSpins.length === 0) {
      console.log('✅ [Wheel Spins Reset] No users to update. All users already have spins.')
      await prisma.$disconnect()
      process.exit(0)
    }

    // ==================== 2. ОБНОВИТЬ ВРАЩЕНИЯ ====================
    console.log('🔄 [Wheel Spins Reset] Updating wheel spins to 1...')
    
    const updateResult = await prisma.user.updateMany({
      where: {
        availableWheelSpins: 0
      },
      data: {
        availableWheelSpins: 1
      }
    })

    console.log(`✅ [Wheel Spins Reset] Successfully updated ${updateResult.count} users`)
    
    // ==================== 3. СТАТИСТИКА ====================
    const totalUsers = await prisma.user.count()
    const usersWithSpins = await prisma.user.count({
      where: {
        availableWheelSpins: {
          gt: 0
        }
      }
    })

    console.log('\n📊 [Wheel Spins Reset] Statistics:')
    console.log(`   - Total users: ${totalUsers}`)
    console.log(`   - Users with spins: ${usersWithSpins}`)
    console.log(`   - Users updated: ${updateResult.count}`)
    console.log(`   - Completion time: ${new Date().toISOString()}`)

    // ==================== 4. ЗАКРЫТЬ СОЕДИНЕНИЕ ====================
    await prisma.$disconnect()
    console.log('\n✅ [Wheel Spins Reset] Script completed successfully!\n')
    process.exit(0)

  } catch (error) {
    console.error('❌ [Wheel Spins Reset] Error:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

// Запуск скрипта
resetWheelSpins()
