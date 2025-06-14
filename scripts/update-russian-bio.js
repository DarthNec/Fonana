const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function updateRussianBio() {
  try {
    console.log('🔄 Updating Russian bio to English...\n')
    
    // Common Russian bio patterns
    const russianPatterns = [
      'Я Web3 контент создатель, создаю уникальный контент на платформе Fonana',
      'Я создаю уникальный контент',
      'Создаю NFT искусство и делюсь опытом в Web3',
      'Эксперт по DeFi, трейдинг и аналитика',
      'Коллекционер и создатель уникальных NFT'
    ]
    
    // Find all users with Russian bio
    const usersToUpdate = await prisma.user.findMany({
      where: {
        OR: russianPatterns.map(pattern => ({
          bio: { contains: pattern }
        }))
      }
    })
    
    console.log(`Found ${usersToUpdate.length} users with Russian bio to update\n`)
    
    // Update each user
    for (const user of usersToUpdate) {
      let newBio = user.bio
      
      // Replace known patterns
      if (user.bio === 'Я Web3 контент создатель, создаю уникальный контент на платформе Fonana') {
        newBio = 'I am a Web3 content creator, creating unique content on the Fonana platform'
      } else if (user.bio === 'Я создаю уникальный контент') {
        newBio = 'I create unique content'
      } else if (user.bio === 'Создаю NFT искусство и делюсь опытом в Web3') {
        newBio = 'Creating NFT art and sharing Web3 experience'
      } else if (user.bio === 'Эксперт по DeFi, трейдинг и аналитика') {
        newBio = 'DeFi expert, trading and analytics'
      } else if (user.bio === 'Коллекционер и создатель уникальных NFT') {
        newBio = 'Collector and creator of unique NFTs'
      } else if (user.bio?.includes('создатель')) {
        // Generic replacement for any bio containing "creator"
        newBio = 'Web3 content creator on Fonana platform'
      }
      
      if (newBio !== user.bio) {
        await prisma.user.update({
          where: { id: user.id },
          data: { bio: newBio }
        })
        
        console.log(`✅ Updated ${user.nickname}`)
        console.log(`   Old: ${user.bio}`)
        console.log(`   New: ${newBio}\n`)
      }
    }
    
    // Also update the default bio for new users by checking empty bio users
    const emptyBioUsers = await prisma.user.findMany({
      where: { 
        OR: [
          { bio: null },
          { bio: '' }
        ]
      },
      select: { id: true, nickname: true }
    })
    
    if (emptyBioUsers.length > 0) {
      console.log(`\n📝 Found ${emptyBioUsers.length} users with empty bio`)
      console.log('These users will get default English bio when they update their profile')
    }
    
    console.log('\n✅ Bio update complete!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateRussianBio() 