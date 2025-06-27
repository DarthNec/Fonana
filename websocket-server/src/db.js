const { PrismaClient } = require('../../node_modules/@prisma/client');

let prisma;

async function initPrisma() {
  try {
    prisma = new PrismaClient({
      log: ['error', 'warn'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });
    
    // Проверяем соединение
    await prisma.$connect();
    console.log('✅ Prisma connected to database');
    
    // Graceful shutdown
    process.on('beforeExit', async () => {
      await prisma.$disconnect();
    });
    
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    throw error;
  }
}

module.exports = {
  prisma,
  initPrisma
}; 