const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Создание тестовых пользователей...')
  
  // Создаем тестовых создателей
  const creators = await Promise.all([
    prisma.user.create({
      data: {
        wallet: 'TestWallet1234567890',
        nickname: 'cryptoartist',
        fullName: 'Анна Крипто',
        bio: 'Создаю NFT искусство и делюсь опытом в Web3',
        isCreator: true,
        isVerified: true
      }
    }),
    prisma.user.create({
      data: {
        wallet: 'TestWallet0987654321',
        nickname: 'defimaster',
        fullName: 'Максим DeFi',
        bio: 'Эксперт по DeFi, трейдинг и аналитика',
        isCreator: true,
        isVerified: false
      }
    }),
    prisma.user.create({
      data: {
        wallet: 'TestWallet1111111111',
        nickname: 'nftqueen',
        fullName: 'Мария NFT',
        bio: 'Коллекционер и создатель уникальных NFT',
        isCreator: true,
        isVerified: true
      }
    })
  ])
  
  console.log('Создано создателей:', creators.length)
  
  // Создаем посты для каждого создателя
  for (const creator of creators) {
    const posts = await Promise.all([
      prisma.post.create({
        data: {
          creatorId: creator.id,
          title: `Первый пост от ${creator.fullName}`,
          content: `Привет! Это мой первый пост на платформе Fonana. Рад быть частью этого сообщества!`,
          type: 'text',
          category: 'Blockchain',
          isLocked: false
        }
      }),
      prisma.post.create({
        data: {
          creatorId: creator.id,
          title: `Эксклюзивный контент от ${creator.nickname}`,
          content: `Это контент только для подписчиков. Здесь я делюсь своими секретами и инсайдами.`,
          type: 'text',
          category: 'Trading',
          isLocked: true,
          isPremium: false
        }
      }),
      prisma.post.create({
        data: {
          creatorId: creator.id,
          title: `VIP материалы ${creator.nickname}`,
          content: `Премиум контент для VIP подписчиков. Самые ценные материалы и эксклюзивный доступ.`,
          type: 'text',
          category: 'NFT',
          isLocked: true,
          isPremium: true
        }
      })
    ])
    
    console.log(`Создано ${posts.length} постов для ${creator.nickname}`)
  }
  
  console.log('Данные успешно добавлены!')
}

main()
  .catch((e) => {
    console.error('Ошибка:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 