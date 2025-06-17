const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testSellablePosts() {
  try {
    console.log('🚀 Testing sellable posts...')
    
    // Находим или создаем тестового пользователя
    let testUser = await prisma.user.findFirst({
      where: {
        OR: [
          { nickname: 'Dogwater' },
          { nickname: 'TestCreator' }
        ]
      }
    })

    if (!testUser) {
      // Находим любого пользователя
      testUser = await prisma.user.findFirst()
      
      if (!testUser) {
        console.log('❌ No users found in database')
        console.log('📝 Creating test user...')
        
        testUser = await prisma.user.create({
          data: {
            wallet: 'TestWallet' + Date.now(),
            solanaWallet: 'TestWallet' + Date.now(),
            nickname: 'TestCreator',
            fullName: 'Test Creator',
            bio: 'Test creator for sellable posts',
            isCreator: true
          }
        })
      }
    }

    console.log(`✅ Using user: ${testUser.nickname || testUser.wallet} (${testUser.id})`)

    // Проверяем, есть ли уже продаваемые посты
    const existingSellablePosts = await prisma.post.count({
      where: {
        creatorId: testUser.id,
        isSellable: true
      }
    })

    if (existingSellablePosts > 0) {
      console.log(`ℹ️  User already has ${existingSellablePosts} sellable posts`)
    }

    // Создаем пост с фиксированной ценой
    const fixedPricePost = await prisma.post.create({
      data: {
        creatorId: testUser.id,
        title: '🎨 Эксклюзивная NFT коллекция',
        content: 'Уникальная коллекция цифрового искусства. Только один покупатель получит право владения этим произведением!',
        type: 'image',
        category: 'Art',
        thumbnail: '/posts/images/nft-collection.jpg',
        mediaUrl: '/posts/images/nft-collection.jpg',
        isLocked: false,
        isSellable: true,
        sellType: 'FIXED_PRICE',
        price: 5.0,
        currency: 'SOL',
        auctionStatus: 'DRAFT'
      }
    })

    console.log(`✅ Created fixed price post: "${fixedPricePost.title}" (${fixedPricePost.id})`)

    // Создаем аукционный пост
    const auctionPost = await prisma.post.create({
      data: {
        creatorId: testUser.id,
        title: '🏆 Редкий игровой предмет',
        content: 'Легендарный меч из популярной игры. Аукцион продлится 24 часа!',
        type: 'image',
        category: 'Gaming',
        thumbnail: '/posts/images/legendary-sword.jpg',
        mediaUrl: '/posts/images/legendary-sword.jpg',
        isLocked: false,
        isSellable: true,
        sellType: 'AUCTION',
        price: 0, // Для аукциона цена не устанавливается напрямую
        auctionStartPrice: 1.0,
        auctionStepPrice: 0.5,
        auctionDepositAmount: 0.01,
        auctionStartAt: new Date(),
        auctionEndAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // +24 часа
        currency: 'SOL',
        auctionStatus: 'ACTIVE'
      }
    })

    console.log(`✅ Created auction post: "${auctionPost.title}" (${auctionPost.id})`)
    console.log(`   - Start price: ${auctionPost.auctionStartPrice} SOL`)
    console.log(`   - Step price: ${auctionPost.auctionStepPrice} SOL`)
    console.log(`   - Ends at: ${auctionPost.auctionEndAt}`)

    // Создаем проданный пост для демонстрации
    const buyer = await prisma.user.findFirst({
      where: {
        NOT: { id: testUser.id }
      }
    })

    if (buyer) {
      const soldPost = await prisma.post.create({
        data: {
          creatorId: testUser.id,
          title: '✅ Коллекционная карточка (ПРОДАНО)',
          content: 'Эта редкая карточка уже нашла своего владельца!',
          type: 'image',
          category: 'NFT',
          thumbnail: '/posts/images/collectible-card.jpg',
          mediaUrl: '/posts/images/collectible-card.jpg',
          isLocked: false,
          isSellable: true,
          sellType: 'FIXED_PRICE',
          price: 3.0,
          currency: 'SOL',
          auctionStatus: 'SOLD',
          soldAt: new Date(),
          soldToId: buyer.id,
          soldPrice: 3.0
        }
      })

      console.log(`✅ Created sold post: "${soldPost.title}" (${soldPost.id})`)
      console.log(`   - Sold to: ${buyer.nickname || buyer.wallet}`)
      console.log(`   - Sold for: ${soldPost.soldPrice} SOL`)
    } else {
      console.log('ℹ️  No other users found for sold post demo')
    }

    console.log('\n✅ Test sellable posts created successfully!')
    console.log('👉 Check the feed at http://localhost:3001/feed to see the new sellable posts')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSellablePosts().catch(console.error) 