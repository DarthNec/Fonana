const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const users = await prisma.user.findMany({
    where: {
      backgroundImage: { not: null }
    },
    select: {
      nickname: true,
      fullName: true,
      backgroundImage: true
    }
  });
  
  console.log('Users with background images:', users.length);
  console.log('\nDetails:');
  users.forEach(user => {
    console.log(`- ${user.nickname} (${user.fullName}): ${user.backgroundImage}`);
  });
  
  await prisma.$disconnect();
})(); 