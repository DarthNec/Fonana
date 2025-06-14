#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkSubscriptions() {
  try {
    console.log('🔍 Проверка подписок...\n')

    // Получаем всех пользователей
    const users = await prisma.user.findMany({
      select: {
        id: true,
        nickname: true,
        wallet: true
      }
    })

    console.log('👥 Найдено пользователей:', users.length)
    
    // Создаем мапу для быстрого поиска
    const userMap = new Map()
    users.forEach(user => {
      userMap.set(user.nickname, user)
    })

    // Проверяем существующие подписки
    const subscriptions = await prisma.subscription.findMany({
      include: {
        user: {
          select: { nickname: true }
        },
        creator: {
          select: { nickname: true }
        }
      }
    })

    console.log('\n📋 Существующие подписки:')
    subscriptions.forEach(sub => {
      const status = sub.isActive && sub.validUntil > new Date() ? '✅ Активна' : '❌ Неактивна'
      console.log(`  ${sub.user.nickname} → ${sub.creator.nickname} (${sub.plan}) ${status}`)
    })

    // Проверяем специфичную подписку Dogwater на Pal
    const dogwater = userMap.get('Dogwater')
    const pal = userMap.get('Pal')

    if (dogwater && pal) {
      const existingSub = await prisma.subscription.findFirst({
        where: {
          userId: dogwater.id,
          creatorId: pal.id
        }
      })

      if (!existingSub) {
        console.log('\n⚠️  Подписка Dogwater на Pal не найдена! Создаем...')
        
        const validUntil = new Date()
        validUntil.setMonth(validUntil.getMonth() + 1)

        await prisma.subscription.create({
          data: {
            userId: dogwater.id,
            creatorId: pal.id,
            plan: 'basic',
            price: 10,
            validUntil: validUntil,
            isActive: true
          }
        })

        console.log('✅ Подписка создана')
      } else {
        console.log(`\n✅ Подписка Dogwater на Pal существует (план: ${existingSub.plan}, активна: ${existingSub.isActive})`)
        
        // Если подписка неактивна или истекла, обновляем
        if (!existingSub.isActive || existingSub.validUntil < new Date()) {
          const validUntil = new Date()
          validUntil.setMonth(validUntil.getMonth() + 1)
          
          await prisma.subscription.update({
            where: { id: existingSub.id },
            data: {
              isActive: true,
              validUntil: validUntil
            }
          })
          console.log('✅ Подписка обновлена и активирована')
        }
      }
    } else {
      if (!dogwater) console.log('\n❌ Пользователь Dogwater не найден')
      if (!pal) console.log('\n❌ Пользователь Pal не найден')
    }

    // Проверяем все подписки после изменений
    console.log('\n📊 Итоговые подписки:')
    const finalSubs = await prisma.subscription.findMany({
      where: {
        isActive: true,
        validUntil: { gte: new Date() }
      },
      include: {
        user: { select: { nickname: true } },
        creator: { select: { nickname: true } }
      }
    })

    finalSubs.forEach(sub => {
      console.log(`  ${sub.user.nickname} → ${sub.creator.nickname} (${sub.plan})`)
    })

  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSubscriptions() 