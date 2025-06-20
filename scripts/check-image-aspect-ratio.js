const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkImageAspectRatio() {
  try {
    // Получаем все посты с imageAspectRatio
    const postsWithRatio = await prisma.post.findMany({
      where: { 
        imageAspectRatio: { not: null },
        type: 'image'
      },
      select: { 
        id: true, 
        title: true, 
        imageAspectRatio: true,
        mediaUrl: true,
        creatorId: true
      }
    });

    console.log(`\n📸 Found ${postsWithRatio.length} posts with imageAspectRatio:`);
    
    const counts = {
      vertical: 0,
      square: 0,
      horizontal: 0
    };

    postsWithRatio.forEach(post => {
      console.log(`\n- Post: "${post.title}" (ID: ${post.id})`);
      console.log(`  AspectRatio: ${post.imageAspectRatio}`);
      console.log(`  Media URL: ${post.mediaUrl}`);
      
      if (counts[post.imageAspectRatio] !== undefined) {
        counts[post.imageAspectRatio]++;
      }
    });

    console.log('\n📊 Statistics:');
    console.log(`  Vertical (3:4): ${counts.vertical} posts`);
    console.log(`  Square (1:1): ${counts.square} posts`);
    console.log(`  Horizontal (16:9): ${counts.horizontal} posts`);

    // Получаем недавние посты без aspectRatio
    const recentPostsWithoutRatio = await prisma.post.findMany({
      where: { 
        imageAspectRatio: null,
        type: 'image'
      },
      select: { 
        id: true, 
        title: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    if (recentPostsWithoutRatio.length > 0) {
      console.log('\n⚠️  Recent image posts without aspectRatio:');
      recentPostsWithoutRatio.forEach(post => {
        console.log(`- "${post.title}" (created: ${post.createdAt.toLocaleString()})`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkImageAspectRatio();
