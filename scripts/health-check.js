#!/usr/bin/env node

// Скрипт проверки здоровья системы
// Использование: node scripts/health-check.js

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function checkDatabase() {
  log('\n🗄️  Проверка базы данных...', 'blue')
  
  try {
    // Проверяем подключение
    await prisma.$connect()
    log('✅ Подключение к БД успешно', 'green')
    
    // Проверяем основные таблицы
    const tables = [
      { model: 'user', display: 'users' },
      { model: 'post', display: 'posts' },
      { model: 'subscription', display: 'subscriptions' },
      { model: 'transaction', display: 'transactions' },
      { model: 'postPurchase', display: 'post_purchases' }
    ]
    
    for (const table of tables) {
      try {
        const count = await prisma[table.model].count()
        log(`✅ Таблица ${table.display}: ${count} записей`, 'green')
      } catch (error) {
        log(`❌ Ошибка проверки таблицы ${table.display}: ${error.message}`, 'red')
        return false
      }
    }
    
    // Проверяем пользователей без кошельков
    const usersWithoutWallets = await prisma.user.count({
      where: {
        AND: [
          { solanaWallet: null },
          { wallet: null }
        ]
      }
    })
    
    if (usersWithoutWallets > 0) {
      log(`⚠️  Найдено ${usersWithoutWallets} пользователей без кошельков`, 'yellow')
    }
    
    // Проверяем создателей без кошельков
    const creatorsWithoutWallets = await prisma.user.count({
      where: {
        isCreator: true,
        AND: [
          { solanaWallet: null },
          { wallet: null }
        ]
      }
    })
    
    if (creatorsWithoutWallets > 0) {
      log(`⚠️  Найдено ${creatorsWithoutWallets} создателей без кошельков!`, 'yellow')
    }
    
    return true
  } catch (error) {
    log(`❌ Ошибка подключения к БД: ${error.message}`, 'red')
    return false
  }
}

async function checkPaymentSystem() {
  log('\n💳 Проверка системы платежей...', 'blue')
  
  try {
    // Проверяем незавершенные транзакции
    const pendingTransactions = await prisma.transaction.count({
      where: { status: 'PENDING' }
    })
    
    if (pendingTransactions > 0) {
      log(`⚠️  Найдено ${pendingTransactions} незавершенных транзакций`, 'yellow')
    } else {
      log('✅ Нет незавершенных транзакций', 'green')
    }
    
    // Проверяем несоответствия покупок
    const incompletePurchases = await prisma.postPurchase.count({
      where: {
        paymentStatus: 'PROCESSING'
      }
    })
    
    if (incompletePurchases > 0) {
      log(`⚠️  Найдено ${incompletePurchases} покупок в обработке`, 'yellow')
    }
    
    // Проверяем общую статистику
    const stats = await prisma.transaction.groupBy({
      by: ['type'],
      _count: true,
      _sum: {
        amount: true,
        referrerFee: true
      }
    })
    
    log('\n📊 Статистика транзакций:', 'blue')
    stats.forEach(stat => {
      log(`  ${stat.type}: ${stat._count} транзакций, сумма: ${stat._sum.amount || 0} SOL`, 'green')
      if (stat._sum.referrerFee) {
        log(`    Реферальные: ${stat._sum.referrerFee} SOL`, 'green')
      }
    })
    
    return true
  } catch (error) {
    log(`❌ Ошибка проверки платежей: ${error.message}`, 'red')
    return false
  }
}

async function checkReferralSystem() {
  log('\n👥 Проверка реферальной системы...', 'blue')
  
  try {
    // Проверяем пользователей с рефералами
    const usersWithReferrals = await prisma.user.count({
      where: {
        referrals: {
          some: {}
        }
      }
    })
    
    log(`✅ Пользователей с рефералами: ${usersWithReferrals}`, 'green')
    
    // Проверяем топ рефереров
    const topReferrers = await prisma.user.findMany({
      where: {
        referrals: {
          some: {}
        }
      },
      select: {
        nickname: true,
        _count: {
          select: {
            referrals: true
          }
        }
      },
      orderBy: {
        referrals: {
          _count: 'desc'
        }
      },
      take: 5
    })
    
    if (topReferrers.length > 0) {
      log('\n🏆 Топ рефереров:', 'blue')
      topReferrers.forEach((ref, index) => {
        log(`  ${index + 1}. ${ref.nickname || 'Unknown'}: ${ref._count.referrals} рефералов`, 'green')
      })
    }
    
    return true
  } catch (error) {
    log(`❌ Ошибка проверки рефералов: ${error.message}`, 'red')
    return false
  }
}

async function main() {
  log('🏥 Запуск проверки здоровья системы Fonana...', 'blue')
  
  let allChecksPass = true
  
  // Проверка БД
  const dbOk = await checkDatabase()
  allChecksPass = allChecksPass && dbOk
  
  // Проверка платежей
  const paymentsOk = await checkPaymentSystem()
  allChecksPass = allChecksPass && paymentsOk
  
  // Проверка рефералов
  const referralsOk = await checkReferralSystem()
  allChecksPass = allChecksPass && referralsOk
  
  // Итоги
  log('\n' + '='.repeat(50), 'blue')
  if (allChecksPass) {
    log('✅ Все проверки пройдены успешно!', 'green')
    process.exit(0)
  } else {
    log('❌ Некоторые проверки не пройдены', 'red')
    log('⚠️  Рекомендуется исправить проблемы перед деплоем', 'yellow')
    process.exit(1)
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  }) 