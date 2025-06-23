const fetch = require('node-fetch')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testDynamicPricing() {
  console.log('🔍 Тестирование системы динамического курса...\n')
  
  try {
    // 1. Проверяем API endpoint
    console.log('1. Проверка API endpoint /api/pricing:')
    const apiUrl = 'http://localhost:3000/api/pricing'
      
    const response = await fetch(apiUrl)
    const data = await response.json()
    
    console.log('Response status:', response.status)
    console.log('Response data:', JSON.stringify(data, null, 2))
    
    if (data.success) {
      console.log('✅ API endpoint работает корректно')
      console.log(`   Курс SOL/USD: $${data.rate}`)
      console.log(`   Источник: ${data.data?.prices?.source || 'неизвестно'}`)
    } else {
      console.log('❌ API endpoint вернул ошибку')
    }
    
    // 2. Проверяем пользователей с кошельками
    console.log('\n2. Проверка пользователей с кошельками:')
    const usersWithWallets = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { wallet: { not: null } },
              { solanaWallet: { not: null } }
            ]
          },
          {
            nickname: { not: null }
          }
        ]
      },
      select: {
        id: true,
        nickname: true,
        wallet: true,
        solanaWallet: true,
        referrerId: true
      },
      take: 10
    })
    
    console.log(`✅ Найдено ${usersWithWallets.length} пользователей с кошельками и никнеймами:`)
    usersWithWallets.forEach(user => {
      const wallet = user.solanaWallet || user.wallet
      console.log(`   - @${user.nickname}: ${wallet ? wallet.slice(0, 8) + '...' : 'нет кошелька'}`)
    })
    
    // 3. Проверяем кеширование (делаем 3 запроса подряд)
    console.log('\n3. Проверка кеширования (3 запроса с интервалом 1 сек):')
    for (let i = 0; i < 3; i++) {
      const start = Date.now()
      const res = await fetch(apiUrl)
      const time = Date.now() - start
      const json = await res.json()
      
      console.log(`   Запрос ${i + 1}: ${time}ms, курс: $${json.rate}, источник: ${json.data?.prices?.source}`)
      
      if (i < 2) await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    console.log('\n✅ Тестирование завершено успешно!')
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Запускаем тест
testDynamicPricing()

// Instructions
console.log('\nUsage:')
console.log('  Local:      node scripts/test-dynamic-pricing.js')
console.log('  Production: node scripts/test-dynamic-pricing.js https://fonana.me')
console.log('  Custom:     node scripts/test-dynamic-pricing.js http://your-server:port') 