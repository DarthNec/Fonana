const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixSubscriptionDisplayIssue() {
  console.log('🔧 ИСПРАВЛЕНИЕ ПРОБЛЕМ С ОТОБРАЖЕНИЕМ ПОДПИСОК\n')
  
  try {
    // 1. Анализ текущей ситуации
    console.log('📊 АНАЛИЗ ПРОБЛЕМЫ:')
    console.log('1. Планы в БД хранятся с заглавной буквы: "Basic", "Premium", "VIP"')
    console.log('2. SubscribeModal отправляет планы с заглавной буквы')
    console.log('3. process-payment сохраняет план как есть (с заглавной буквы)')
    console.log('4. Проверка доступа работает корректно (используется .toLowerCase())')
    console.log('5. ПРОБЛЕМА: Отображение в UI несогласованно\n')
    
    console.log('🔍 НАЙДЕННЫЕ ПРОБЛЕМЫ В КОДЕ:')
    console.log('creator/[id]/page.tsx:')
    console.log('- Строка 155: setCurrentSubscriptionTier(subData.subscription.plan) - устанавливает "Premium"')
    console.log('- Строки 551, 594, 634: currentSubscriptionTier?.toLowerCase() !== "basic" - сравнивает правильно')
    console.log('- НО логика отображения кнопок может быть неправильной\n')
    
    // 2. Статистика планов в БД
    console.log('📈 СТАТИСТИКА ПЛАНОВ В БД:')
    const planStats = await prisma.subscription.groupBy({
      by: ['plan'],
      _count: true,
      where: {
        isActive: true,
        paymentStatus: 'COMPLETED'
      }
    })
    
    console.log('Активные подписки:')
    planStats.forEach(stat => {
      console.log(`  ${stat.plan}: ${stat._count} подписок`)
    })
    
    // 3. Проверка несогласованности с минами для постов
    console.log('\n\n🔐 ПРОВЕРКА ОГРАНИЧЕНИЙ ПОСТОВ:')
    const tierStats = await prisma.post.groupBy({
      by: ['minSubscriptionTier'],
      _count: true,
      where: {
        minSubscriptionTier: { not: null }
      }
    })
    
    console.log('Требования к тирам (в нижнем регистре):')
    tierStats.forEach(stat => {
      console.log(`  ${stat.minSubscriptionTier}: ${stat._count} постов`)
    })
    
    // 4. Рекомендации по исправлению
    console.log('\n\n🛠️  НЕОБХОДИМЫЕ ИСПРАВЛЕНИЯ:\n')
    
    console.log('1. СТАНДАРТИЗАЦИЯ ХРАНЕНИЯ (выберите один вариант):')
    console.log('   Вариант A: Хранить планы в нижнем регистре в БД')
    console.log('   - Запустить миграцию: UPDATE subscriptions SET plan = LOWER(plan)')
    console.log('   - Изменить SubscribeModal чтобы отправлял планы в нижнем регистре')
    console.log('   Вариант B: Оставить как есть, но исправить отображение')
    console.log('   - Проще и безопаснее\n')
    
    console.log('2. ИСПРАВЛЕНИЕ ОТОБРАЖЕНИЯ (рекомендуется):')
    console.log('   В creator/[id]/page.tsx:')
    console.log('   - Использовать единый формат для сравнения и отображения')
    console.log('   - Всегда приводить к нижнему регистру при сравнении')
    console.log('   - Для отображения использовать форматирование\n')
    
    console.log('3. КОНКРЕТНЫЕ ИЗМЕНЕНИЯ В КОДЕ:')
    console.log('   Заменить условия типа:')
    console.log('   {currentSubscriptionTier?.toLowerCase() !== "premium" && (')
    console.log('   На более надежные проверки\n')
    
    console.log('4. ТЕСТИРОВАНИЕ:')
    console.log('   - Проверить отображение для всех планов')
    console.log('   - Убедиться что кнопки апгрейда показываются правильно')
    console.log('   - Проверить доступ к постам после изменений\n')
    
    // 5. Предлагаем SQL для быстрого исправления данных
    console.log('\n📝 SQL ДЛЯ БЫСТРОГО ИСПРАВЛЕНИЯ (если нужно):')
    console.log('-- Вариант 1: Привести все планы к единому формату с заглавной буквы')
    console.log(`UPDATE subscriptions 
SET plan = CASE 
  WHEN LOWER(plan) = 'free' THEN 'Free'
  WHEN LOWER(plan) = 'basic' THEN 'Basic'
  WHEN LOWER(plan) = 'premium' THEN 'Premium'
  WHEN LOWER(plan) = 'vip' THEN 'VIP'
  ELSE plan
END;`)
    
    console.log('\n-- Вариант 2: Привести все к нижнему регистру')
    console.log(`UPDATE subscriptions SET plan = LOWER(plan);`)
    console.log(`UPDATE posts SET "minSubscriptionTier" = LOWER("minSubscriptionTier") WHERE "minSubscriptionTier" IS NOT NULL;`)
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixSubscriptionDisplayIssue() 