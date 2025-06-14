const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkRussianBio() {
  try {
    console.log('🔍 Checking users with Russian bio...\n')
    
    // Find users with Russian bio pattern
    const usersWithRussianBio = await prisma.user.findMany({
      where: {
        OR: [
          { bio: { contains: 'Я Web3 контент создатель' } },
          { bio: { contains: 'создаю уникальный контент' } },
          { bio: { contains: 'контент создатель' } },
          { bio: { contains: 'создатель' } }
        ]
      },
      select: {
        id: true,
        nickname: true,
        bio: true,
        createdAt: true
      }
    })
    
    console.log(`Found ${usersWithRussianBio.length} users with Russian bio:\n`)
    
    usersWithRussianBio.forEach(user => {
      console.log(`👤 ${user.nickname}`)
      console.log(`   Bio: ${user.bio}`)
      console.log(`   Created: ${user.createdAt.toLocaleDateString()}\n`)
    })
    
    // Check default bio pattern
    console.log('📝 Checking for default bio pattern...')
    const defaultBioPattern = 'Я Web3 контент создатель, создаю уникальный контент на платформе Fonana'
    
    const usersWithDefaultBio = await prisma.user.findMany({
      where: { bio: defaultBioPattern },
      select: { id: true, nickname: true }
    })
    
    if (usersWithDefaultBio.length > 0) {
      console.log(`\n⚠️  Found ${usersWithDefaultBio.length} users with default Russian bio`)
      console.log('These users need bio update to English')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkRussianBio() 