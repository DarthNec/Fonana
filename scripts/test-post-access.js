const fetch = require('node-fetch')

async function testPostAccess() {
  try {
    const dogwaterWallet = 'Agj8dxJCGD1Pw5YPqRvqZFDaNJhqJvRJc13hs9xQyktT'
    const postId = 'cmc1wba4q000yqoqhc48kf4b9' // Billionaire's Diary: Interchange Painting
    const apiUrl = 'http://localhost:3000' // Используем localhost на сервере
    
    console.log('🔍 Testing post access for Dogwater...\n')
    console.log('Post ID:', postId)
    console.log('User wallet:', dogwaterWallet)
    console.log('API URL:', apiUrl)
    
    // Запрос к API
    const response = await fetch(`${apiUrl}/api/posts?userWallet=${dogwaterWallet}`)
    const data = await response.json()
    
    // Найти конкретный пост
    const post = data.posts?.find(p => p.id === postId)
    
    if (!post) {
      console.log('❌ Post not found')
      console.log('Total posts loaded:', data.posts?.length || 0)
      // Показать первые несколько постов для отладки
      if (data.posts?.length > 0) {
        console.log('\nFirst few posts:')
        data.posts.slice(0, 3).forEach(p => {
          console.log(`- ${p.id}: ${p.title} by ${p.creator.username}`)
        })
      }
      return
    }
    
    console.log('\n📝 Post details:')
    console.log('Title:', post.title)
    console.log('Creator:', post.creator.username)
    console.log('Is locked:', post.isLocked)
    console.log('Required tier:', post.requiredTier)
    console.log('User tier:', post.userTier)
    console.log('Should hide content:', post.shouldHideContent)
    console.log('Is sellable:', post.isSellable)
    console.log('Sell type:', post.sellType)
    console.log('Price:', post.price)
    
    console.log('\n✅ Result:')
    if (post.shouldHideContent) {
      console.log('❌ Content is hidden (user sees lock)')
    } else {
      console.log('✅ Content is accessible!')
    }
    
    // Показать первые 100 символов контента, если доступен
    if (!post.shouldHideContent && post.content) {
      console.log('\nContent preview:', post.content.substring(0, 100) + '...')
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

// Проверка, запущен ли скрипт напрямую или импортирован
if (require.main === module) {
  testPostAccess()
}

module.exports = testPostAccess 