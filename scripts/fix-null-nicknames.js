const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixNullNicknames() {
  console.log('🔍 Fixing users with null nicknames...\n')

  try {
    // Find users with null nicknames
    const usersWithNullNickname = await prisma.user.findMany({
      where: { nickname: null }
    })
    
    console.log(`Found ${usersWithNullNickname.length} users with null nickname`)
    
    for (const user of usersWithNullNickname) {
      // Generate nickname from wallet
      const nickname = 'user_' + user.wallet.slice(0, 8).toLowerCase()
      
      console.log(`Updating user ${user.id}: ${user.wallet.slice(0, 8)}... → ${nickname}`)
      
      await prisma.user.update({
        where: { id: user.id },
        data: { nickname }
      })
    }
    
    console.log('\n✅ All null nicknames fixed!')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
fixNullNicknames()
  .then(() => console.log('\nDone!'))
  .catch(console.error) 