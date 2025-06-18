// Test script for case-insensitive username lookup
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testCaseInsensitive() {
  try {
    console.log('Testing case-insensitive username lookup...\n')
    
    // Test usernames to check
    const testUsernames = ['Dogwater', 'dogwater', 'DOGWATER', 'DoGwAtEr']
    
    for (const username of testUsernames) {
      console.log(`\nSearching for username: "${username}"`)
      
      const user = await prisma.user.findFirst({
        where: {
          nickname: {
            equals: username,
            mode: 'insensitive'
          }
        },
        select: {
          id: true,
          nickname: true,
          fullName: true,
          wallet: true
        }
      })
      
      if (user) {
        console.log(`✓ Found user:`)
        console.log(`  - ID: ${user.id}`)
        console.log(`  - Nickname: ${user.nickname}`)
        console.log(`  - Full Name: ${user.fullName || 'N/A'}`)
        console.log(`  - Wallet: ${user.wallet?.substring(0, 8)}...`)
      } else {
        console.log(`✗ User not found`)
      }
    }
    
    // Test duplicate prevention
    console.log('\n\nTesting duplicate prevention...')
    const existingUser = await prisma.user.findFirst({
      where: { nickname: { not: null } },
      select: { nickname: true }
    })
    
    if (existingUser) {
      console.log(`\nTrying to find duplicates of "${existingUser.nickname}" with different cases:`)
      
      const variations = [
        existingUser.nickname.toLowerCase(),
        existingUser.nickname.toUpperCase(),
        existingUser.nickname.charAt(0).toUpperCase() + existingUser.nickname.slice(1).toLowerCase()
      ]
      
      for (const variation of variations) {
        const duplicate = await prisma.user.findFirst({
          where: {
            nickname: {
              equals: variation,
              mode: 'insensitive'
            }
          },
          select: { id: true, nickname: true }
        })
        
        console.log(`  "${variation}" -> ${duplicate ? `Found (ID: ${duplicate.id}, actual: "${duplicate.nickname}")` : 'Not found'}`)
      }
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testCaseInsensitive() 