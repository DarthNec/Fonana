#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkWalletConnections() {
  console.log('🔍 Checking wallet connections in production...\n')

  try {
    // Получаем пользователей с кошельками
    const usersWithWallets = await prisma.user.findMany({
      where: {
        OR: [
          { wallet: { not: null } },
          { solanaWallet: { not: null } }
        ]
      },
      select: {
        id: true,
        nickname: true,
        wallet: true,
        solanaWallet: true,
        createdAt: true,
        _count: {
          select: {
            subscriptions: true,
            posts: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    console.log(`📊 Latest users with wallets: ${usersWithWallets.length}\n`)

    for (const user of usersWithWallets) {
      console.log(`👤 User: ${user.nickname || 'Anonymous'}`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Wallet: ${user.wallet ? user.wallet.slice(0, 8) + '...' : 'N/A'}`)
      console.log(`   Solana: ${user.solanaWallet ? user.solanaWallet.slice(0, 8) + '...' : 'N/A'}`)
      console.log(`   Posts: ${user._count.posts}`)
      console.log(`   Subscriptions: ${user._count.subscriptions}`)
      console.log(`   Joined: ${user.createdAt.toLocaleDateString()}\n`)
    }

    // Статистика по активным подпискам
    const activeSubscriptions = await prisma.subscription.count({
      where: { isActive: true }
    })

    console.log(`\n💳 Active subscriptions: ${activeSubscriptions}`)

    // Последние транзакции
    const recentTransactions = await prisma.transaction.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        txSignature: true,
        amount: true,
        type: true,
        createdAt: true
      }
    })

    console.log(`\n💰 Recent transactions:`)
    for (const tx of recentTransactions) {
      console.log(`   ${tx.type}: ${tx.amount} SOL - ${tx.createdAt.toLocaleDateString()}`)
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkWalletConnections().catch(console.error) 