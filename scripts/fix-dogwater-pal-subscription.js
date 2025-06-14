const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixSubscription() {
  try {
    // Find users
    const dogwater = await prisma.user.findFirst({
      where: { nickname: 'Dogwater' }
    })
    
    const pal = await prisma.user.findFirst({
      where: { nickname: 'Pal' }
    })
    
    if (!dogwater || !pal) {
      console.log('❌ One or both users not found')
      console.log('Dogwater:', dogwater ? 'found' : 'NOT FOUND')
      console.log('Pal:', pal ? 'found' : 'NOT FOUND')
      return
    }
    
    console.log('✅ Found users:')
    console.log('- Dogwater:', dogwater.nickname, `(${dogwater.id})`)
    console.log('- Pal:', pal.nickname, `(${pal.id})`)
    
    // Check existing subscription
    const existingSub = await prisma.subscription.findFirst({
      where: {
        userId: dogwater.id,
        creatorId: pal.id
      }
    })
    
    if (existingSub) {
      console.log('\n📋 Existing subscription found:')
      console.log('- ID:', existingSub.id)
      console.log('- Plan:', existingSub.plan)
      console.log('- Active:', existingSub.isActive)
      console.log('- Valid until:', existingSub.validUntil)
      console.log('- Is expired:', new Date(existingSub.validUntil) < new Date())
      
      // Fix it
      const updated = await prisma.subscription.update({
        where: { id: existingSub.id },
        data: {
          isActive: true,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      })
      
      console.log('\n✅ Updated subscription:')
      console.log('- Active:', updated.isActive)
      console.log('- Valid until:', updated.validUntil)
    } else {
      console.log('\n❌ No subscription found, creating new one...')
      
      const newSub = await prisma.subscription.create({
        data: {
          userId: dogwater.id,
          creatorId: pal.id,
          plan: 'Premium',
          price: 0.15,
          currency: 'SOL',
          isActive: true,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      })
      
      console.log('\n✅ Created new subscription:')
      console.log('- ID:', newSub.id)
      console.log('- Plan:', newSub.plan)
      console.log('- Valid until:', newSub.validUntil)
    }
    
    // Verify Pal has locked posts
    const lockedPosts = await prisma.post.findMany({
      where: {
        creatorId: pal.id,
        isLocked: true
      },
      select: {
        id: true,
        title: true,
        isLocked: true
      }
    })
    
    console.log('\n📝 Pal\'s locked posts:', lockedPosts.length)
    lockedPosts.forEach(post => {
      console.log(`- "${post.title}"`)
    })
    
    console.log('\n✅ All done! Dogwater should now have access to Pal\'s subscriber-only posts.')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixSubscription() 