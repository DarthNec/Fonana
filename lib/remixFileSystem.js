const fs = require('fs')
const path = require('path')

const REMIX_DIR = path.join(process.cwd(), 'app', 'remixes')

/**
 * Получить путь к файлу ремикса
 */
function getRemixFilePath(containerId) {
  return path.join(REMIX_DIR, `${containerId}.json`)
}

/**
 * Создать или обновить файл ремикса
 */
async function saveRemixToFile(containerId, post) {
  try {
    // Убедимся, что директория существует
    if (!fs.existsSync(REMIX_DIR)) {
      fs.mkdirSync(REMIX_DIR, { recursive: true })
    }

    const filePath = getRemixFilePath(containerId)
    let remixData

    // Проверяем, существует ли файл
    if (fs.existsSync(filePath)) {
      // Читаем существующий файл
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      remixData = JSON.parse(fileContent)
      
      // Проверяем, есть ли уже такой пост
      const existingPostIndex = remixData.posts.findIndex(p => p.id === post.id)
      
      if (existingPostIndex >= 0) {
        // Обновляем существующий пост
        remixData.posts[existingPostIndex] = post
        console.log(`[RemixFS] Updated existing post in ${containerId}.json`)
      } else {
        // Добавляем новый пост
        remixData.posts.push(post)
        console.log(`[RemixFS] Added new post to ${containerId}.json`)
      }
      
      remixData.updatedAt = new Date().toISOString()
    } else {
      // Создаем новый файл
      remixData = {
        containerId,
        posts: [post],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      console.log(`[RemixFS] Created new remix file ${containerId}.json`)
    }

    // Сортируем посты по дате создания (новые первыми)
    remixData.posts.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    // Записываем файл
    fs.writeFileSync(filePath, JSON.stringify(remixData, null, 2), 'utf-8')
    
    console.log(`[RemixFS] ✅ Successfully saved remix file:`, {
      containerId,
      postsCount: remixData.posts.length,
      path: filePath
    })
    
    return true
  } catch (error) {
    console.error(`[RemixFS] ❌ Error saving remix file:`, error)
    return false
  }
}

/**
 * Получить данные ремикса из файла
 */
async function getRemixFromFile(containerId) {
  try {
    const filePath = getRemixFilePath(containerId)
    
    if (!fs.existsSync(filePath)) {
      console.log(`[RemixFS] File not found: ${containerId}.json`)
      return null
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const remixData = JSON.parse(fileContent)
    
    console.log(`[RemixFS] ✅ Successfully loaded remix file:`, {
      containerId,
      postsCount: remixData.posts.length
    })
    
    return remixData
  } catch (error) {
    console.error(`[RemixFS] ❌ Error reading remix file:`, error)
    return null
  }
}

/**
 * Удалить пост из ремикса
 */
async function deletePostFromRemix(containerId, postId) {
  try {
    const filePath = getRemixFilePath(containerId)
    
    if (!fs.existsSync(filePath)) {
      console.log(`[RemixFS] File not found: ${containerId}.json`)
      return false
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const remixData = JSON.parse(fileContent)
    
    // Фильтруем посты
    const filteredPosts = remixData.posts.filter(p => p.id !== postId)
    
    if (filteredPosts.length === remixData.posts.length) {
      console.log(`[RemixFS] Post ${postId} not found in ${containerId}.json`)
      return false
    }

    remixData.posts = filteredPosts
    remixData.updatedAt = new Date().toISOString()

    // Если постов не осталось, удаляем файл
    if (remixData.posts.length === 0) {
      fs.unlinkSync(filePath)
      console.log(`[RemixFS] ✅ Deleted empty remix file: ${containerId}.json`)
    } else {
      // Обновляем файл
      fs.writeFileSync(filePath, JSON.stringify(remixData, null, 2), 'utf-8')
      console.log(`[RemixFS] ✅ Removed post from remix file:`, {
        containerId,
        postId,
        remainingPosts: remixData.posts.length
      })
    }
    
    return true
  } catch (error) {
    console.error(`[RemixFS] ❌ Error deleting post from remix:`, error)
    return false
  }
}

/**
 * Получить список всех ремиксов
 */
async function getAllRemixes() {
  try {
    if (!fs.existsSync(REMIX_DIR)) {
      return []
    }

    const files = fs.readdirSync(REMIX_DIR)
    const remixFiles = files.filter(f => f.endsWith('.json'))
    const containerIds = remixFiles.map(f => f.replace('.json', ''))
    
    console.log(`[RemixFS] Found ${containerIds.length} remix files`)
    return containerIds
  } catch (error) {
    console.error(`[RemixFS] ❌ Error listing remix files:`, error)
    return []
  }
}

/**
 * Обновить статус поста в ремиксе (например, после завершения генерации)
 */
async function updatePostInRemix(containerId, postId, updates) {
  try {
    const filePath = getRemixFilePath(containerId)
    
    if (!fs.existsSync(filePath)) {
      console.log(`[RemixFS] File not found: ${containerId}.json`)
      return false
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const remixData = JSON.parse(fileContent)
    
    // Находим и обновляем пост
    const postIndex = remixData.posts.findIndex(p => p.id === postId)
    
    if (postIndex < 0) {
      console.log(`[RemixFS] Post ${postId} not found in ${containerId}.json`)
      return false
    }

    // Применяем обновления
    remixData.posts[postIndex] = {
      ...remixData.posts[postIndex],
      ...updates
    }
    
    remixData.updatedAt = new Date().toISOString()

    // Записываем файл
    fs.writeFileSync(filePath, JSON.stringify(remixData, null, 2), 'utf-8')
    
    console.log(`[RemixFS] ✅ Updated post in remix file:`, {
      containerId,
      postId,
      updates: Object.keys(updates)
    })
    
    return true
  } catch (error) {
    console.error(`[RemixFS] ❌ Error updating post in remix:`, error)
    return false
  }
}

module.exports = {
  saveRemixToFile,
  getRemixFromFile,
  deletePostFromRemix,
  getAllRemixes,
  updatePostInRemix
}

