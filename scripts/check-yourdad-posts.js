const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkYourdadPosts() {
  try {
    // Найти автора yourdad
    const creator = await prisma.user.findFirst({
      where: { nickname: 'yourdad' }
    })
    
    if (!creator) {
      console.log('Автор yourdad не найден')
      return
    }
    
    console.log('=== Автор yourdad ===')
    console.log('ID:', creator.id)
    console.log('Wallet:', creator.wallet)
    
    // Найти все посты yourdad
    const posts = await prisma.post.findMany({
      where: {
        creatorId: creator.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log(`\n=== Все посты yourdad (${posts.length}) ===`)
    for (const post of posts) {
      console.log(`\n"${post.title}"`)
      console.log(`ID: ${post.id}`)
      console.log(`Заблокирован: ${post.isLocked}`)
      console.log(`Минимальный тир: ${post.minSubscriptionTier || 'НЕ УСТАНОВЛЕН'}`)
      console.log(`Премиум: ${post.isPremium}`)
      console.log(`Цена: ${post.price ? post.price + ' ' + post.currency : 'Бесплатно'}`)
      console.log(`Создан: ${post.createdAt.toISOString()}`)
    }
    
    // Найти заблокированные посты без установленного тира
    const lockedWithoutTier = posts.filter(p => p.isLocked && !p.minSubscriptionTier && !p.price)
    
    if (lockedWithoutTier.length > 0) {
      console.log(`\n⚠️  ПРОБЛЕМА: ${lockedWithoutTier.length} заблокированных постов без установленного тира!`)
      console.log('Эти посты видны всем подписчикам, независимо от уровня подписки:')
      for (const post of lockedWithoutTier) {
        console.log(`- "${post.title}" (ID: ${post.id})`)
      }
    }
    
  } catch (error) {
    console.error('Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkYourdadPosts() 