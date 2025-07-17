const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function transferData() {
  console.log('🚀 Начинаем перенос данных...');
  
  try {
    await prisma.$connect();
    console.log('✅ Подключение к локальной базе успешно');

    // Проверяем подключение
    const userCount = await prisma.user.count();
    const postCount = await prisma.post.count();
    
    console.log(`📊 Текущее состояние:`);
    console.log(`👥 Пользователей: ${userCount}`);
    console.log(`📝 Постов: ${postCount}`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

transferData(); 