const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndCleanUsers() {
  try {
    console.log('🔍 Проверка пользователей в базе данных...\n');
    
    // Получаем всех пользователей
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        nickname: true,
        fullName: true,
        wallet: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            follows: true,
            followers: true,
            comments: true,
            likes: true
          }
        }
      }
    });
    
    console.log(`📊 Всего пользователей: ${allUsers.length}\n`);
    
    // Реальные пользователи, которых нужно сохранить
    const realUsers = ['EasySloth', 'FloorDecor', 'CryptoBob', 'Dogwater', 'fonanadev'];
    
    // Разделяем на реальных и тех, кого нужно удалить
    const usersToKeep = [];
    const usersToDelete = [];
    
    allUsers.forEach(user => {
      const userInfo = {
        id: user.id,
        nickname: user.nickname,
        fullName: user.fullName,
        wallet: user.wallet,
        posts: user._count.posts,
        following: user._count.follows,
        followers: user._count.followers,
        comments: user._count.comments,
        likes: user._count.likes,
        createdAt: user.createdAt
      };
      
      if (realUsers.includes(user.nickname)) {
        usersToKeep.push(userInfo);
      } else {
        usersToDelete.push(userInfo);
      }
    });
    
    console.log('✅ Реальные пользователи (будут сохранены):');
    usersToKeep.forEach(user => {
      console.log(`   - ${user.nickname} (${user.fullName || 'No name'})`);
      console.log(`     ID: ${user.id}`);
      console.log(`     Wallet: ${user.wallet || 'Not connected'}`);
      console.log(`     Постов: ${user.posts}, Подписок: ${user.following}, Подписчиков: ${user.followers}`);
      console.log('');
    });
    
    console.log('\n❌ Пользователи для удаления:');
    usersToDelete.forEach(user => {
      console.log(`   - ${user.nickname} (${user.fullName || 'No name'})`);
      console.log(`     ID: ${user.id}`);
      console.log(`     Wallet: ${user.wallet || 'Not connected'}`);
      console.log(`     Постов: ${user.posts}, Подписок: ${user.following}, Подписчиков: ${user.followers}`);
      console.log('');
    });
    
    if (usersToDelete.length > 0) {
      console.log('\n🗑️  Хотите удалить этих пользователей? (yes/no)');
      
      // Для автоматического выполнения на сервере
      if (process.argv[2] === '--auto-yes') {
        console.log('   Автоматическое подтверждение...');
        
        for (const user of usersToDelete) {
          console.log(`\n   Удаляю ${user.nickname}...`);
          
          // Удаляем пользователя (каскадное удаление настроено в schema)
          await prisma.user.delete({
            where: { id: user.id }
          });
          
          console.log(`   ✅ ${user.nickname} удален`);
        }
        
        console.log('\n✅ Очистка завершена!');
      } else {
        console.log('   Для удаления запустите: node scripts/check-and-clean-users.js --auto-yes');
      }
    } else {
      console.log('\n✅ Нет пользователей для удаления!');
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndCleanUsers(); 