require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testConnection() {
  console.log('Testing database connection...')
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET')
  
  try {
    // Простой запрос для проверки подключения
    const userCount = await prisma.user.count()
    console.log('✅ Database connected successfully!')
    console.log('   Total users:', userCount)
    
    // Проверим посты
    const postCount = await prisma.post.count()
    console.log('   Total posts:', postCount)
    
    // Проверим последние посты
    const recentPosts = await prisma.post.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        creator: {
          select: {
            nickname: true
          }
        }
      }
    })
    
    if (recentPosts.length > 0) {
      console.log('\nRecent posts:')
      recentPosts.forEach(post => {
        console.log(`   - "${post.title}" by ${post.creator?.nickname || 'Unknown'} (${post.createdAt.toISOString()})`)
      })
    }
    
    // Проверим состояние таблиц
    const tables = await prisma.$queryRaw`
      SELECT table_name, table_rows, data_length, index_length
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name NOT LIKE '_prisma_%'
      ORDER BY table_rows DESC
      LIMIT 10
    `
    
    console.log('\nTop tables by row count:')
    tables.forEach(table => {
      console.log(`   - ${table.table_name}: ${table.table_rows} rows`)
    })
    
  } catch (error) {
    console.error('❌ Database connection failed!')
    console.error('Error:', error.message)
    
    if (error.code === 'P1001') {
      console.error('\n⚠️  Cannot reach database server. Check if PostgreSQL is running.')
    } else if (error.code === 'P1002') {
      console.error('\n⚠️  Database server was reached but timed out.')
    } else if (error.code === 'P2002') {
      console.error('\n⚠️  Unique constraint failed.')
    }
    
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection().catch(console.error) 