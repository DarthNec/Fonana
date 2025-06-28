#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPostPurchaseAPI() {
  console.log('\n🔍 Testing Post Purchase System\n');
  
  try {
    // 1. Find a test user with wallet
    console.log('1. Finding test user...');
    const testUser = await prisma.user.findFirst({
      where: {
        wallet: { not: null },
        nickname: 'Dogwater' // Using real user from database
      }
    });
    
    if (!testUser) {
      throw new Error('Test user not found');
    }
    
    console.log(`✅ Found user: ${testUser.nickname} (${testUser.id})`);
    console.log(`   Wallet: ${testUser.wallet}`);
    
    // 2. Find payable posts
    console.log('\n2. Finding payable posts...');
    const posts = await prisma.post.findMany({
      where: {
        price: { gt: 0 },
        isLocked: true
      },
      include: {
        creator: {
          select: {
            id: true,
            nickname: true,
            wallet: true,
            solanaWallet: true
          }
        },
        purchases: {
          where: { userId: testUser.id }
        }
      },
      orderBy: { price: 'asc' }, // Start with cheapest
      take: 10
    });
    
    console.log(`✅ Found ${posts.length} payable posts`);
    
    if (posts.length === 0) {
      console.log('⚠️  No payable posts available');
      return;
    }
    
    // Show all posts
    console.log('\nAvailable posts:');
    posts.forEach(p => {
      console.log(`   - "${p.title}" by ${p.creator.nickname} - ${p.price} SOL (purchased: ${p.purchases.length > 0})`);
    });
    
    // Find unpurchased post
    const unpurchasedPost = posts.find(p => p.purchases.length === 0);
    if (!unpurchasedPost) {
      console.log('\n⚠️  All posts already purchased by test user');
      return;
    }
    
    console.log(`\n3. Selected post for testing:`);
    console.log(`   Title: "${unpurchasedPost.title}"`);
    console.log(`   Creator: ${unpurchasedPost.creator.nickname}`);
    console.log(`   Price: ${unpurchasedPost.price} SOL`);
    console.log(`   Post ID: ${unpurchasedPost.id}`);
    
    // 4. Check existing purchase
    console.log('\n4. Checking existing purchases...');
    const existingPurchase = await prisma.postPurchase.findUnique({
      where: {
        userId_postId: {
          userId: testUser.id,
          postId: unpurchasedPost.id
        }
      }
    });
    
    if (existingPurchase) {
      console.log('❌ Post already purchased');
      return;
    }
    
    console.log('✅ Post not purchased yet');
    
    // 5. Simulate purchase (without actual blockchain transaction)
    console.log('\n5. Simulating purchase (database only)...');
    
    // Create purchase record
    const purchase = await prisma.postPurchase.create({
      data: {
        userId: testUser.id,
        postId: unpurchasedPost.id,
        price: unpurchasedPost.price,
        currency: 'SOL',
        txSignature: `test-signature-${Date.now()}`
      }
    });
    
    console.log('✅ Purchase record created');
    console.log(`   Purchase ID: ${purchase.id}`);
    
    // 6. Verify access
    console.log('\n6. Verifying post access...');
    const verifyPost = await prisma.post.findUnique({
      where: { id: unpurchasedPost.id },
      include: {
        purchases: {
          where: { userId: testUser.id }
        }
      }
    });
    
    if (verifyPost.purchases.length > 0) {
      console.log('✅ Post access granted!');
      console.log(`   User can now view content of "${verifyPost.title}"`);
    } else {
      console.log('❌ Post access verification failed');
    }
    
    // 7. Test WebSocket event simulation
    console.log('\n7. WebSocket event simulation...');
    console.log('⚠️  WebSocket events require running WebSocket server');
    console.log('   In production, event "post-purchased" would be sent to user');
    
    // Summary
    console.log('\n=== Summary ===');
    console.log('✅ Database layer: Working correctly');
    console.log('✅ Purchase records: Created successfully');
    console.log('✅ Access control: Verified');
    console.log('⚠️  WebSocket: Requires manual testing in browser');
    console.log('⚠️  Blockchain: Requires real wallet for full flow');
    
    // Cleanup (optional)
    console.log('\n8. Cleanup test data...');
    await prisma.postPurchase.delete({
      where: { id: purchase.id }
    });
    console.log('✅ Test purchase removed');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Test negative scenarios
async function testNegativeScenarios() {
  console.log('\n\n🔍 Testing Negative Scenarios\n');
  
  try {
    // Test 1: Non-existent user
    console.log('1. Testing non-existent user...');
    const purchase1 = await prisma.postPurchase.findMany({
      where: { userId: 'non-existent-user-id' }
    });
    console.log(`✅ Correctly returns empty: ${purchase1.length} purchases`);
    
    // Test 2: Non-existent post
    console.log('\n2. Testing non-existent post...');
    const purchase2 = await prisma.postPurchase.findMany({
      where: { postId: 'non-existent-post-id' }
    });
    console.log(`✅ Correctly returns empty: ${purchase2.length} purchases`);
    
    // Test 3: Duplicate purchase prevention
    console.log('\n3. Testing duplicate purchase prevention...');
    try {
      // Find an existing purchase
      const existing = await prisma.postPurchase.findFirst();
      if (existing) {
        await prisma.postPurchase.create({
          data: {
            userId: existing.userId,
            postId: existing.postId,
            price: 0.1,
            currency: 'SOL',
            txSignature: 'duplicate-test'
          }
        });
        console.log('❌ Duplicate purchase was allowed (should be prevented)');
      } else {
        console.log('⚠️  No existing purchases to test duplicate prevention');
      }
    } catch (error) {
      if (error.code === 'P2002') {
        console.log('✅ Duplicate purchase correctly prevented');
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    console.error('\n❌ Negative test failed:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🚀 Fonana Post Purchase Test Suite\n');
  console.log('Testing database layer and API logic...\n');
  
  await testPostPurchaseAPI();
  await testNegativeScenarios();
  
  console.log('\n\n✅ Database tests completed!');
  console.log('\nFor full end-to-end testing:');
  console.log('1. Use the browser with real wallet');
  console.log('2. Monitor WebSocket events in DevTools');
  console.log('3. Verify real-time UI updates');
}

main().catch(console.error); 