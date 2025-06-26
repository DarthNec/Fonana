const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function diagnoseReferralSystem() {
  try {
    log('🔍 Диагностика реферальной системы Fonana\n', 'cyan')
    
    // 1. Проверка пользователей с рефералами
    log('1. Анализ реферальных связей:', 'blue')
    const usersWithReferrers = await prisma.user.findMany({
      where: { referrerId: { not: null } },
      include: {
        referrer: {
          select: { nickname: true, fullName: true }
        }
      },
      take: 10,
      orderBy: { createdAt: 'desc' }
    })
    
    log(`   Найдено пользователей с рефералами: ${usersWithReferrers.length}`, 'green')
    
    if (usersWithReferrers.length > 0) {
      log('   Последние реферальные регистрации:', 'yellow')
      usersWithReferrers.forEach(user => {
        log(`   - ${user.nickname || 'No nickname'} → реферер: @${user.referrer?.nickname || 'Unknown'}`)
      })
    }
    
    // 2. Топ рефереры
    log('\n2. Топ-5 рефереров:', 'blue')
    const topReferrers = await prisma.user.findMany({
      where: {
        referrals: {
          some: {}
        }
      },
      select: {
        nickname: true,
        fullName: true,
        _count: {
          select: { referrals: true }
        }
      },
      orderBy: {
        referrals: {
          _count: 'desc'
        }
      },
      take: 5
    })
    
    topReferrers.forEach((referrer, index) => {
      log(`   ${index + 1}. @${referrer.nickname} - ${referrer._count.referrals} рефералов`, 'green')
    })
    
    // 3. Проверка транзакций с реферальными комиссиями
    log('\n3. Реферальные комиссии за последние 7 дней:', 'blue')
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const referralTransactions = await prisma.transaction.findMany({
      where: {
        referrerFee: { gt: 0 },
        createdAt: { gte: sevenDaysAgo }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
    
    if (referralTransactions.length > 0) {
      log(`   Найдено транзакций с реферальными: ${referralTransactions.length}`, 'green')
      let totalReferralFees = 0
      referralTransactions.forEach(tx => {
        totalReferralFees += tx.referrerFee || 0
        log(`   - ${tx.createdAt.toLocaleDateString()} | Комиссия: ${tx.referrerFee?.toFixed(4)} SOL | Wallet: ${tx.referrerWallet?.slice(0, 8)}...`)
      })
      log(`   Общая сумма реферальных за 7 дней: ${totalReferralFees.toFixed(4)} SOL`, 'yellow')
    } else {
      log('   Реферальных транзакций не найдено', 'yellow')
    }
    
    // 4. Проверка пользователей с подозрительными никами
    log('\n4. Проверка подозрительных никнеймов:', 'blue')
    const suspiciousNicknames = ['404', '500', 'feed', 'error', 'null', 'undefined']
    
    for (const nickname of suspiciousNicknames) {
      const user = await prisma.user.findFirst({
        where: { 
          nickname: {
            equals: nickname,
            mode: 'insensitive'
          }
        }
      })
      
      if (user) {
        log(`   ⚠️  Найден пользователь с никнеймом "${nickname}"!`, 'red')
        log(`      ID: ${user.id}, Created: ${user.createdAt.toLocaleDateString()}`)
        
        // Проверяем есть ли у него рефералы
        const referralCount = await prisma.user.count({
          where: { referrerId: user.id }
        })
        
        if (referralCount > 0) {
          log(`      ВНИМАНИЕ: У него есть ${referralCount} рефералов!`, 'red')
        }
      }
    }
    
    // 5. Проверка пользователей без никнеймов но с рефералами
    log('\n5. Пользователи без никнеймов с рефералами:', 'blue')
    const usersWithoutNicknames = await prisma.user.findMany({
      where: {
        nickname: null,
        referrals: {
          some: {}
        }
      },
      select: {
        id: true,
        wallet: true,
        _count: {
          select: { referrals: true }
        }
      }
    })
    
    if (usersWithoutNicknames.length > 0) {
      log(`   ⚠️  Найдено ${usersWithoutNicknames.length} пользователей без никнеймов но с рефералами!`, 'red')
      usersWithoutNicknames.forEach(user => {
        log(`   - Wallet: ${user.wallet?.slice(0, 8)}... | Рефералов: ${user._count.referrals}`)
      })
    } else {
      log('   ✅ Все рефереры имеют никнеймы', 'green')
    }
    
    // 6. Статистика по реферальной системе
    log('\n6. Общая статистика:', 'blue')
    const totalUsers = await prisma.user.count()
    const usersWithReferrer = await prisma.user.count({
      where: { referrerId: { not: null } }
    })
    const referrers = await prisma.user.count({
      where: {
        referrals: {
          some: {}
        }
      }
    })
    
    log(`   Всего пользователей: ${totalUsers}`)
    log(`   Пришли по реферальной ссылке: ${usersWithReferrer} (${((usersWithReferrer/totalUsers)*100).toFixed(1)}%)`)
    log(`   Активных рефереров: ${referrers}`)
    
    // 7. Проверка дубликатов никнеймов с разным регистром
    log('\n7. Проверка дубликатов никнеймов:', 'blue')
    const allNicknames = await prisma.user.findMany({
      where: { nickname: { not: null } },
      select: { nickname: true }
    })
    
    const nicknameMap = new Map()
    allNicknames.forEach(user => {
      if (user.nickname) {
        const lower = user.nickname.toLowerCase()
        if (!nicknameMap.has(lower)) {
          nicknameMap.set(lower, [])
        }
        nicknameMap.get(lower).push(user.nickname)
      }
    })
    
    let duplicatesFound = false
    nicknameMap.forEach((nicknames, lower) => {
      if (nicknames.length > 1) {
        duplicatesFound = true
        log(`   ⚠️  Найдены дубликаты для "${lower}": ${nicknames.join(', ')}`, 'red')
      }
    })
    
    if (!duplicatesFound) {
      log('   ✅ Дубликатов никнеймов не найдено', 'green')
    }
    
    log('\n✅ Диагностика завершена', 'green')
    
  } catch (error) {
    log(`\n❌ Ошибка: ${error.message}`, 'red')
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

// Запуск диагностики
diagnoseReferralSystem() 