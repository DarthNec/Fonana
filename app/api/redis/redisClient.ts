import Redis from 'ioredis'

// Создаем Redis клиент
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

// Функция для получения постов из Redis
export async function getRedisPosts(): Promise<any[]> {
  try {
    const postsData = await redis.get('posts')
    if (!postsData) {
      return []
    }
    return JSON.parse(postsData)
  } catch (error) {
    console.error('Error getting posts from Redis:', error)
    return []
  }
}

// Функция для получения пользователей из Redis
export async function getRedisUsers(): Promise<any[]> {
  try {
    const usersData = await redis.get('users')
    if (!usersData) {
      return []
    }
    return JSON.parse(usersData)
  } catch (error) {
    console.error('Error getting users from Redis:', error)
    return []
  }
}

export default redis


