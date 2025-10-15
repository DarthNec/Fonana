const { PrismaClient } = require('@prisma/client');

let prisma = null;

async function initPrisma() {
  try {
    prisma = new PrismaClient({
      log: ['error', 'warn'],
    });
    
    await prisma.$connect();
    console.log('✅ Prisma connected to database');
    return prisma;
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    throw error;
  }
}

function getPrisma() {
  if (!prisma) {
    console.warn('⚠️  Prisma not initialized yet');
    return null;
  }
  return prisma;
}

function isPrismaAvailable() {
  return prisma !== null;
}

module.exports = {
  initPrisma,
  getPrisma,
  isPrismaAvailable
};

