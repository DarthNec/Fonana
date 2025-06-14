const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkSubscription() {
  try {
    // Find Dogwater
    const dogwater = await prisma.user.findFirst({
      where: { nickname: 'Dogwater' }
    })
    
    // Find Pal
    const pal = await prisma.user.findFirst({
      where: { nickname: 'Pal' }
    })
    
    console.log('Dogwater:', dogwater ? `${dogwater.nickname} (${dogwater.id})` : 'NOT FOUND')
    console.log('Pal:', pal ? `${pal.nickname} (${pal.id})` : 'NOT FOUND')
    
    if (!dogwater || !pal) {
      console.log('One or both users not found')
      return
    }
    
    // Check subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: dogwater.id,
        creatorId: pal.id
      }
    })
    
    if (subscription) {
      console.log('\nSubscription found:')
      console.log('- ID:', subscription.id)
      console.log('- Plan:', subscription.plan)
      console.log('- Price:', subscription.price, subscription.currency)
      console.log('- Active:', subscription.isActive)
      console.log('- Subscribed:', subscription.subscribedAt)
      console.log('- Valid until:', subscription.validUntil)
      console.log('- Is expired:', new Date(subscription.validUntil) < new Date())
      
      // Check if needs reactivation
      if (!subscription.isActive || new Date(subscription.validUntil) < new Date()) {
        console.log('\n⚠️  SUBSCRIPTION IS NOT ACTIVE OR EXPIRED!')
        
        // Fix it
        const updated = await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            isActive: true,
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
          }
        })
        console.log('✅ Fixed subscription - now active until:', updated.validUntil)
      } else {
        console.log('\n✅ Subscription is active and valid')
      }
    } else {
      console.log('\n❌ No subscription found from Dogwater to Pal')
    }
    
    // Check Pal's posts
    const palPosts = await prisma.post.findMany({
      where: {
        creatorId: pal.id,
        isLocked: true
      },
      select: {
        id: true,
        title: true,
        isLocked: true,
        isPremium: true
      }
    })
    
    console.log('\nPal\'s locked posts:', palPosts.length)
    palPosts.forEach(post => {
      console.log(`- "${post.title}" (ID: ${post.id})`)
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSubscription() 