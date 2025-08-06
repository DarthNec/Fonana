const { PrismaClient } = require('@prisma/client');

async function addTokenFields() {
  const prisma = new PrismaClient();

  try {
    console.log('Connecting to database...');

    // Выполняем SQL запросы по отдельности
    await prisma.$executeRaw`ALTER TABLE users ADD COLUMN IF NOT EXISTS token TEXT`;
    await prisma.$executeRaw`ALTER TABLE users ADD COLUMN IF NOT EXISTS "tokenExpiresAt" TIMESTAMP`;
    console.log('✅ Added token fields to users table');

    // Создаем индексы по отдельности
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_users_token ON users(token)`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_users_token_expires ON users("tokenExpiresAt")`;
    console.log('✅ Created indexes for token fields');

    // Добавляем комментарии по отдельности
    await prisma.$executeRaw`COMMENT ON COLUMN users.token IS 'JWT token for API authentication'`;
    await prisma.$executeRaw`COMMENT ON COLUMN users."tokenExpiresAt" IS 'Token expiration date'`;
    console.log('✅ Added comments to token fields');

    console.log('🎉 Token fields successfully added to database!');

  } catch (error) {
    console.error('❌ Error adding token fields:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTokenFields(); 