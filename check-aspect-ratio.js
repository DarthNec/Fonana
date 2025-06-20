const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAspectRatio() {
  try {
    const posts = await prisma.post.findMany({
      where: { imageAspectRatio: { not: null } },
      select: { id: true, title: true, imageAspectRatio: true },
      take: 5
    });
    console.log('Posts with aspectRatio:', posts.length);
    posts.forEach(post => {
      console.log(`- ${post.title}: ${post.imageAspectRatio}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAspectRatio();
