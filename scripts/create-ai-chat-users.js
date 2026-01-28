const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

// Путь к файлу со списком AI пользователей
const AI_USERS_FILE = path.join(__dirname, '..', 'ai-chat-users.json')

// Списки для генерации никнеймов
const adjectives = [
  'Cool', 'Happy', 'Lucky', 'Crazy', 'Swift', 'Bright', 'Dark', 'Wild', 
  'Chill', 'Epic', 'Mighty', 'Silent', 'Golden', 'Crystal', 'Shadow',
  'Neon', 'Cosmic', 'Digital', 'Cyber', 'Pixel', 'Quantum', 'Stellar',
  'Thunder', 'Fire', 'Ice', 'Storm', 'Night', 'Dream', 'Star', 'Moon'
]

const nouns = [
  'Wolf', 'Dragon', 'Phoenix', 'Tiger', 'Eagle', 'Panther', 'Falcon',
  'Shark', 'Lion', 'Bear', 'Hawk', 'Fox', 'Cobra', 'Viper', 'Raven',
  'Knight', 'Ninja', 'Wizard', 'Hunter', 'Warrior', 'Rider', 'Master',
  'King', 'Queen', 'Prince', 'Legend', 'Hero', 'Pilot', 'Racer', 'Gamer'
]

// Генерация рандомного Solana-подобного wallet адреса
function generateRandomWallet() {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  let wallet = ''
  for (let i = 0; i < 44; i++) {
    wallet += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return wallet
}

// Генерация уникального никнейма
function generateNickname(usedNicknames) {
  let nickname
  let attempts = 0
  
  do {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
    const noun = nouns[Math.floor(Math.random() * nouns.length)]
    const num = Math.floor(Math.random() * 999)
    nickname = `${adj}${noun}${num}`
    attempts++
  } while (usedNicknames.has(nickname.toLowerCase()) && attempts < 100)
  
  usedNicknames.add(nickname.toLowerCase())
  return nickname
}

// Генерация рандомного аватара (используем DiceBear API)
function generateAvatar(seed) {
  const styles = ['avataaars', 'bottts', 'pixel-art', 'adventurer', 'fun-emoji', 'lorelei']
  const style = styles[Math.floor(Math.random() * styles.length)]
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`
}

async function createAiChatUsers() {
  console.log('🤖 Creating 25 AI chat users...\n')
  
  const usedNicknames = new Set()
  const createdUsers = []
  
  try {
    // Получаем существующие никнеймы чтобы избежать дубликатов
    const existingUsers = await prisma.user.findMany({
      select: { nickname: true }
    })
    existingUsers.forEach(u => {
      if (u.nickname) usedNicknames.add(u.nickname.toLowerCase())
    })
    
    console.log(`📊 Found ${existingUsers.length} existing users\n`)
    
    for (let i = 0; i < 25; i++) {
      const nickname = generateNickname(usedNicknames)
      const wallet = generateRandomWallet()
      const avatar = generateAvatar(nickname)
      
      try {
        const user = await prisma.user.create({
          data: {
            wallet,
            nickname,
            fullName: nickname,
            avatar,
            isCreator: false,
            isVerified: false,
          }
        })
        
        createdUsers.push(user)
        console.log(`✅ ${i + 1}/25 Created: @${nickname}`)
        console.log(`   Wallet: ${wallet.substring(0, 8)}...${wallet.substring(wallet.length - 4)}`)
        console.log(`   Avatar: ${avatar.substring(0, 50)}...`)
        console.log('')
        
      } catch (error) {
        console.error(`❌ Failed to create user ${nickname}:`, error.message)
      }
    }
    
    console.log('\n' + '='.repeat(50))
    console.log(`🎉 Successfully created ${createdUsers.length} AI chat users!`)
    console.log('='.repeat(50))
    
    // Сохраняем пользователей в файл
    const usersForFile = createdUsers.map(user => ({
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      wallet: user.wallet
    }))
    
    // Если файл уже существует, добавляем к существующим
    let existingAiUsers = []
    if (fs.existsSync(AI_USERS_FILE)) {
      try {
        existingAiUsers = JSON.parse(fs.readFileSync(AI_USERS_FILE, 'utf8'))
      } catch (e) {
        console.log('⚠️ Could not read existing file, creating new one')
      }
    }
    
    const allAiUsers = [...existingAiUsers, ...usersForFile]
    fs.writeFileSync(AI_USERS_FILE, JSON.stringify(allAiUsers, null, 2))
    
    console.log(`\n💾 Saved ${createdUsers.length} users to: ${AI_USERS_FILE}`)
    console.log(`   Total AI users in file: ${allAiUsers.length}`)
    
    // Выводим список созданных пользователей
    console.log('\n📋 Created users summary:')
    createdUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. @${user.nickname} (ID: ${user.id})`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAiChatUsers()
