const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

/**
 * Export Paid Posts Script
 * 
 * Экспортирует все платные посты из базы данных в JSON файл
 * 
 * Usage:
 * node export-paid-posts.js
 */

async function exportPaidPosts() {
  try {
    console.log('🔍 [Export] Fetching all paid posts from database...')
    
    // Получаем все платные посты (где price > 0 и не null)
    const paidPosts = await prisma.post.findMany({
      where: {
        price: {
          not: null,
          gt: 0  // Число, а не строка
        }
      },
      select: {
        id: true,
        content: true,
        mediaUrl: true,
        type: true,
        price: true,
        createdAt: true,
        updatedAt: true,
        creatorId: true,
        creator: {
          select: {
            id: true,
            nickname: true,
            wallet: true,
            fullName: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            purchases: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log(`✅ [Export] Found ${paidPosts.length} paid posts`)
    
    // ✅ Фильтруем посты - оставляем только с CDN URLs (исключаем локальные /media/... и пустые)
    const cdnPosts = paidPosts.filter(post => {
      // Исключаем посты без mediaUrl или с пустым mediaUrl
      if (!post.mediaUrl || post.mediaUrl.trim() === '') return false
      // Оставляем только CDN URLs
      return post.mediaUrl.startsWith('https://fonanastorage.b-cdn.net/')
    })
    
    const excludedCount = paidPosts.length - cdnPosts.length
    console.log(`🔍 [Export] Filtered out ${excludedCount} posts with local /media/ URLs`)
    console.log(`✅ [Export] ${cdnPosts.length} posts with CDN URLs remaining`)
    
    // Статистика
    const stats = {
      total: cdnPosts.length,
      excluded: excludedCount,
      byType: {},
      totalRevenue: 0,
      totalPurchases: 0,
      totalLikes: 0,
      totalComments: 0,
      exportedAt: new Date().toISOString()
    }
    
    cdnPosts.forEach(post => {
      // Подсчет по типам
      stats.byType[post.type] = (stats.byType[post.type] || 0) + 1
      
      // Общая статистика
      stats.totalRevenue += parseFloat(post.price || 0)
      stats.totalPurchases += post._count.purchases
      stats.totalLikes += post._count.likes
      stats.totalComments += post._count.comments
    })
    
    // Формируем итоговый объект
    const exportData = {
      meta: {
        exportedAt: stats.exportedAt,
        totalPosts: stats.total,
        databaseUrl: process.env.DATABASE_URL ? 'Connected' : 'Not configured'
      },
      statistics: stats,
      posts: cdnPosts
    }
    
    // Сохраняем в файл
    const outputPath = path.join(__dirname, 'paid_posts.json')
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf-8')
    
    console.log('\n📊 [Export] Statistics:')
    console.log(`   Total Paid Posts: ${stats.total}`)
    console.log(`   By Type:`)
    Object.entries(stats.byType).forEach(([type, count]) => {
      console.log(`      - ${type}: ${count}`)
    })
    console.log(`   Total Revenue: ${stats.totalRevenue.toFixed(2)} SOL`)
    console.log(`   Total Purchases: ${stats.totalPurchases}`)
    console.log(`   Total Likes: ${stats.totalLikes}`)
    console.log(`   Total Comments: ${stats.totalComments}`)
    console.log(`\n💾 [Export] Saved to: ${outputPath}`)
    console.log('✅ [Export] Export completed successfully!')
    
  } catch (error) {
    console.error('❌ [Export] Error exporting paid posts:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Запускаем экспорт
exportPaidPosts()
  .then(() => {
    console.log('\n🎉 [Export] Script finished')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 [Export] Script failed:', error)
    process.exit(1)
  })
