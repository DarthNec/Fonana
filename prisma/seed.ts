import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Начинаем заполнение базы данных...')

  // Создаем тестовых авторов
  const creators = [
    {
      wallet: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      nickname: 'artcreator',
      fullName: 'Артём Художник',
      bio: '🎨 Цифровой художник и NFT энтузиаст. Создаю уникальные произведения искусства на блокчейне Solana.',
      isCreator: true,
      isVerified: true,
      followersCount: 1250,
      postsCount: 87
    },
    {
      wallet: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      nickname: 'musicvibes',
      fullName: 'Музыкальные Вибрации',
      bio: '🎵 Продюсер электронной музыки. Эксклюзивные треки и биты для подписчиков.',
      isCreator: true,
      isVerified: false,
      followersCount: 856,
      postsCount: 124
    },
    {
      wallet: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
      nickname: 'cryptotrader',
      fullName: 'Крипто Трейдер Pro',
      bio: '📈 Профессиональный трейдер с 7-летним опытом. Делюсь сигналами и обучаю торговле.',
      isCreator: true,
      isVerified: true,
      followersCount: 3420,
      postsCount: 234
    },
    {
      wallet: '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy',
      nickname: 'fitnessqueen',
      fullName: 'Фитнес Королева',
      bio: '💪 Персональный тренер и нутрициолог. Индивидуальные программы тренировок и питания.',
      isCreator: true,
      isVerified: true,
      followersCount: 2890,
      postsCount: 156
    },
    {
      wallet: '5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw',
      nickname: 'defiexpert',
      fullName: 'DeFi Эксперт',
      bio: '🚀 Аналитик DeFi протоколов. Обзоры новых проектов и стратегии фарминга.',
      isCreator: true,
      isVerified: false,
      followersCount: 1567,
      postsCount: 98
    },
    {
      wallet: '5HNpg2XsvTKMmDraQj3reub2mvKT9FPABgrqKMt5ArUHSxYN',
      nickname: 'gamerultimate',
      fullName: 'Игровой Мастер',
      bio: '🎮 Профессиональный геймер и стример. Гайды, обзоры и эксклюзивный игровой контент.',
      isCreator: true,
      isVerified: true,
      followersCount: 4250,
      postsCount: 312
    }
  ]

  // Создаем пользователей
  for (const creator of creators) {
    const user = await prisma.user.upsert({
      where: { wallet: creator.wallet },
      update: {},
      create: creator
    })
    console.log(`✅ Создан автор: ${user.fullName}`)
  }

  // Создаем теги
  const tags = ['Art', 'Music', 'Gaming', 'Trading', 'DeFi', 'NFT', 'Fitness', 'Tech', 'Blockchain']
  
  for (const tagName of tags) {
    await prisma.tag.upsert({
      where: { name: tagName },
      update: {},
      create: { name: tagName }
    })
  }
  console.log(`✅ Создано ${tags.length} тегов`)

  // Создаем несколько постов для каждого автора
  const createdUsers = await prisma.user.findMany({ where: { isCreator: true } })
  
  for (const user of createdUsers) {
    // Создаем 3-5 постов для каждого автора
    const postCount = Math.floor(Math.random() * 3) + 3
    
    for (let i = 0; i < postCount; i++) {
      const post = await prisma.post.create({
        data: {
          creatorId: user.id,
          title: `Пост ${i + 1} от ${user.fullName}`,
          content: `Это эксклюзивный контент от ${user.fullName}. Подпишитесь, чтобы получить доступ ко всем материалам!`,
          type: ['text', 'image', 'video'][Math.floor(Math.random() * 3)],
          category: tags[Math.floor(Math.random() * tags.length)],
          isLocked: Math.random() > 0.5,
          isPremium: Math.random() > 0.7,
          likesCount: Math.floor(Math.random() * 100),
          viewsCount: Math.floor(Math.random() * 1000)
        }
      })
      
      // Добавляем 1-3 тега к посту
      const postTags = tags.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3) + 1)
      for (const tagName of postTags) {
        const tag = await prisma.tag.findUnique({ where: { name: tagName } })
        if (tag) {
          await prisma.postTag.create({
            data: {
              postId: post.id,
              tagId: tag.id
            }
          })
        }
      }
    }
  }

  console.log('✅ Посты и теги созданы')
  console.log('🎉 База данных успешно заполнена!')
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при заполнении базы данных:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 