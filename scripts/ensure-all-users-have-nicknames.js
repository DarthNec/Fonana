const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function ensureAllUsersHaveNicknames() {
  console.log('Checking and updating user nicknames...\n')
  
  try {
    // Find all users without nicknames
    const usersWithoutNickname = await prisma.user.findMany({
      where: {
        OR: [
          { nickname: null },
          { nickname: '' }
        ]
      }
    })
    
    console.log(`Found ${usersWithoutNickname.length} users without nicknames`)
    
    if (usersWithoutNickname.length === 0) {
      console.log('All users have nicknames!')
      return
    }
    
    // Update each user
    for (const user of usersWithoutNickname) {
      // Generate nickname from wallet address - take first 8 chars after 0x
      const nickname = user.walletAddress.substring(0, 10).toLowerCase()
      
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { nickname }
        })
        console.log(`✓ Updated ${user.fullName || 'User'} - nickname: ${nickname}`)
      } catch (error) {
        console.error(`✗ Failed to update ${user.fullName || 'User'}: ${error.message}`)
      }
    }
    
    console.log('\nAll users now have nicknames!')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

ensureAllUsersHaveNicknames() 