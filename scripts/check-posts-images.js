const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPostsImages() {
  try {
    console.log('🔍 Проверка изображений в постах...\n');
    
    // Получаем все посты с изображениями
    const posts = await prisma.post.findMany({
      where: {
        type: 'image'
      },
      select: {
        id: true,
        title: true,
        mediaUrl: true,
        content: true,
        thumbnail: true,
        createdAt: true,
        creator: {
          select: {
            nickname: true,
            fullName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`📊 Найдено постов с изображениями: ${posts.length}\n`);
    
    posts.forEach((post, index) => {
      console.log(`📝 Пост ${index + 1}:`);
      console.log(`   Заголовок: ${post.title}`);
      console.log(`   Автор: ${post.creator.nickname} (${post.creator.fullName || 'No name'})`);
      console.log(`   Дата: ${post.createdAt.toLocaleString()}`);
      
      // Проверяем какое поле используется для изображения
      if (post.mediaUrl) {
        console.log(`   mediaUrl: ${post.mediaUrl}`);
      }
      if (post.thumbnail) {
        console.log(`   thumbnail: ${post.thumbnail}`);
      }
      if (post.content) {
        console.log(`   content: ${post.content}`);
      }
      if (!post.mediaUrl && !post.thumbnail) {
        console.log(`   ⚠️  Нет URL изображения!`);
      }
      
      console.log('');
    });
    
    // Анализ путей
    console.log('📊 Анализ путей к изображениям:');
    const imagePaths = posts
      .map(p => p.mediaUrl || p.thumbnail)
      .filter(Boolean);
    
    const pathPatterns = {};
    imagePaths.forEach(path => {
      const pattern = path.startsWith('/') ? 'Относительный путь' : 'Полный URL';
      pathPatterns[pattern] = (pathPatterns[pattern] || 0) + 1;
      
      if (path.startsWith('/')) {
        const parts = path.split('/');
        console.log(`   ${path} → Директория: /${parts[1]}/${parts[2] || ''}`);
      }
    });
    
    console.log('\n📈 Статистика:');
    Object.entries(pathPatterns).forEach(([pattern, count]) => {
      console.log(`   ${pattern}: ${count}`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPostsImages(); 