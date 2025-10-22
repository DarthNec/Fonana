# 👥 Follow Mobile All API

**Endpoint**: `/api/follow/mobile/all`  
**Дата**: 19.10.2025  
**Назначение**: Получить список всех создателей, на которых подписан пользователь (без JWT)

## 🎯 Особенности

- ✅ **Без JWT токена** - аутентификация на стороне клиента
- ✅ **Полная информация о создателях** - nickname, avatar, bio, stats
- ✅ **Счетчики** - количество постов, подписчиков, подписок
- ✅ **Статус подписки** - информация об активной подписке на создателя
- ✅ **Сортировка** - по дате подписки (новые первые)
- ✅ **Оптимизированные запросы** - использует `include` и параллельные запросы

## 📡 Endpoint

### GET - Получить всех подписок пользователя

**URL**: `GET /api/follow/mobile/all?userId=xxx`

**Query Parameters**:
- `userId` (string, required) - ID пользователя

**Success Response** (200):
```json
{
  "success": true,
  "creators": [
    {
      "id": "creator_1",
      "nickname": "jane_creator",
      "fullName": "Jane Doe",
      "bio": "Content creator & artist",
      "avatar": "https://...",
      "wallet": "7xKXtg2...",
      "solanaWallet": "7xKXtg2...",
      "isCreator": true,
      "isVerified": true,
      "followersCount": 1250,
      "followingCount": 45,
      "tierPricing": {
        "basic": 10,
        "premium": 25,
        "vip": 50
      },
      "createdAt": "2025-01-15T10:30:00.000Z",
      "postsCount": 87,
      "subscription": {
        "id": "sub_123",
        "plan": "premium",
        "validUntil": "2025-11-19T12:00:00.000Z"
      }
    },
    {
      "id": "creator_2",
      "nickname": "artist_mike",
      "fullName": "Mike Artist",
      "bio": "Digital art & NFTs",
      "avatar": "https://...",
      "wallet": "8yLYuh3...",
      "solanaWallet": "8yLYuh3...",
      "isCreator": true,
      "isVerified": false,
      "followersCount": 890,
      "followingCount": 120,
      "tierPricing": {
        "basic": 5,
        "premium": 15,
        "vip": 30
      },
      "createdAt": "2025-02-20T14:15:00.000Z",
      "postsCount": 156,
      "subscription": null
    }
  ],
  "count": 2
}
```

**Error Responses**:

```json
// 400 - Missing userId
{
  "error": "User ID is required"
}

// 404 - User not found
{
  "error": "User not found"
}

// 500 - Server error
{
  "error": "Failed to get followings",
  "details": "Error message"
}
```

## 📊 Response Structure

### Creator Object:

```typescript
interface Creator {
  // Основная информация
  id: string
  nickname: string | null
  fullName: string | null
  bio: string | null
  avatar: string | null
  
  // Кошельки
  wallet: string | null
  solanaWallet: string | null
  
  // Статусы
  isCreator: boolean
  isVerified: boolean
  
  // Счетчики
  followersCount: number
  followingCount: number
  postsCount: number        // Добавлено API
  
  // Ценообразование
  tierPricing: {
    basic?: number
    premium?: number
    vip?: number
  } | null
  
  // Timestamps
  createdAt: Date
  
  // Подписка пользователя на этого создателя
  subscription: {
    id: string
    plan: string          // "basic" | "premium" | "vip"
    validUntil: Date
  } | null
}
```

### Root Response:

```typescript
interface FollowAllResponse {
  success: true
  creators: Creator[]
  count: number           // Количество создателей
}
```

## 💡 Примеры использования

### JavaScript/TypeScript:

```typescript
// Получить всех подписок пользователя
async function getUserFollowings(userId: string) {
  const response = await fetch(
    `/api/follow/mobile/all?userId=${userId}`
  )
  
  const data = await response.json()
  
  if (data.success) {
    console.log(`User follows ${data.count} creators:`)
    
    data.creators.forEach(creator => {
      console.log(`- ${creator.nickname}:`, {
        followers: creator.followersCount,
        posts: creator.postsCount,
        hasSubscription: !!creator.subscription,
        subscriptionPlan: creator.subscription?.plan
      })
    })
    
    return data.creators
  } else {
    console.error('Failed to get followings:', data.error)
    throw new Error(data.error)
  }
}

// Использование
const creators = await getUserFollowings('user_123')

// Фильтрация по активной подписке
const subscribed = creators.filter(c => c.subscription !== null)
console.log(`Subscribed to ${subscribed.length} creators`)

// Фильтрация по verification
const verified = creators.filter(c => c.isVerified)
console.log(`Following ${verified.length} verified creators`)
```

### React Native:

```typescript
import { useState, useEffect } from 'react'
import { View, FlatList, Text, Image, TouchableOpacity } from 'react-native'

interface Creator {
  id: string
  nickname: string
  fullName: string
  avatar: string
  isVerified: boolean
  followersCount: number
  postsCount: number
  subscription: {
    plan: string
    validUntil: string
  } | null
}

function FollowingList({ userId }: { userId: string }) {
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    loadFollowings()
  }, [userId])
  
  async function loadFollowings() {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(
        `/api/follow/mobile/all?userId=${userId}`
      )
      
      const data = await response.json()
      
      if (data.success) {
        setCreators(data.creators)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to load followings')
    } finally {
      setLoading(false)
    }
  }
  
  function renderCreator({ item }: { item: Creator }) {
    return (
      <TouchableOpacity 
        style={styles.creatorCard}
        onPress={() => navigateToCreator(item.id)}
      >
        <Image 
          source={{ uri: item.avatar }} 
          style={styles.avatar}
        />
        
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.nickname}>{item.nickname}</Text>
            {item.isVerified && <Text>✓</Text>}
          </View>
          
          <Text style={styles.stats}>
            {item.followersCount.toLocaleString()} followers · {item.postsCount} posts
          </Text>
          
          {item.subscription && (
            <View style={styles.subscriptionBadge}>
              <Text style={styles.subscriptionText}>
                {item.subscription.plan.toUpperCase()} 💎
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    )
  }
  
  if (loading) {
    return <Text>Loading...</Text>
  }
  
  if (error) {
    return (
      <View>
        <Text>Error: {error}</Text>
        <TouchableOpacity onPress={loadFollowings}>
          <Text>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        Following {creators.length} creators
      </Text>
      
      <FlatList
        data={creators}
        renderItem={renderCreator}
        keyExtractor={item => item.id}
        refreshing={loading}
        onRefresh={loadFollowings}
      />
    </View>
  )
}
```

### Фильтрация и сортировка:

```typescript
// Получаем всех подписок
const response = await fetch(`/api/follow/mobile/all?userId=${userId}`)
const { creators } = await response.json()

// Только с активной подпиской
const withSubscription = creators.filter(c => c.subscription !== null)

// Только verified
const verifiedCreators = creators.filter(c => c.isVerified)

// Сортировка по популярности
const byPopularity = [...creators].sort(
  (a, b) => b.followersCount - a.followersCount
)

// Сортировка по активности (количество постов)
const byActivity = [...creators].sort(
  (a, b) => b.postsCount - a.postsCount
)

// Группировка по типу подписки
const grouped = {
  vip: creators.filter(c => c.subscription?.plan === 'vip'),
  premium: creators.filter(c => c.subscription?.plan === 'premium'),
  basic: creators.filter(c => c.subscription?.plan === 'basic'),
  free: creators.filter(c => !c.subscription)
}

console.log('Subscription breakdown:', {
  vip: grouped.vip.length,
  premium: grouped.premium.length,
  basic: grouped.basic.length,
  free: grouped.free.length
})
```

### Статистика подписок:

```typescript
async function getFollowingStats(userId: string) {
  const response = await fetch(`/api/follow/mobile/all?userId=${userId}`)
  const { creators } = await response.json()
  
  const stats = {
    total: creators.length,
    verified: creators.filter(c => c.isVerified).length,
    withSubscription: creators.filter(c => c.subscription).length,
    
    // По планам
    vipSubs: creators.filter(c => c.subscription?.plan === 'vip').length,
    premiumSubs: creators.filter(c => c.subscription?.plan === 'premium').length,
    basicSubs: creators.filter(c => c.subscription?.plan === 'basic').length,
    
    // Средние значения
    avgFollowers: Math.round(
      creators.reduce((sum, c) => sum + c.followersCount, 0) / creators.length
    ),
    avgPosts: Math.round(
      creators.reduce((sum, c) => sum + c.postsCount, 0) / creators.length
    ),
    
    // Суммарные
    totalPosts: creators.reduce((sum, c) => sum + c.postsCount, 0),
    totalFollowers: creators.reduce((sum, c) => sum + c.followersCount, 0)
  }
  
  return stats
}

// Использование
const stats = await getFollowingStats('user_123')
console.log('Following Stats:', {
  'Total creators': stats.total,
  'Verified creators': stats.verified,
  'Active subscriptions': stats.withSubscription,
  'Average followers per creator': stats.avgFollowers,
  'Average posts per creator': stats.avgPosts
})
```

## 🔍 Use Cases

### 1. Список подписок в профиле:

```typescript
function FollowingTab({ userId }) {
  const [creators, setCreators] = useState([])
  
  useEffect(() => {
    fetch(`/api/follow/mobile/all?userId=${userId}`)
      .then(r => r.json())
      .then(data => setCreators(data.creators))
  }, [userId])
  
  return (
    <View>
      {creators.map(creator => (
        <CreatorCard key={creator.id} creator={creator} />
      ))}
    </View>
  )
}
```

### 2. Dashboard с метриками:

```typescript
function FollowingDashboard({ userId }) {
  const [stats, setStats] = useState(null)
  
  useEffect(() => {
    async function loadStats() {
      const response = await fetch(`/api/follow/mobile/all?userId=${userId}`)
      const { creators } = await response.json()
      
      setStats({
        total: creators.length,
        subscribed: creators.filter(c => c.subscription).length,
        verified: creators.filter(c => c.isVerified).length,
        topCreator: creators.sort(
          (a, b) => b.followersCount - a.followersCount
        )[0]
      })
    }
    
    loadStats()
  }, [userId])
  
  return (
    <View>
      <Text>Following: {stats?.total}</Text>
      <Text>Subscribed: {stats?.subscribed}</Text>
      <Text>Verified: {stats?.verified}</Text>
      <Text>Top: {stats?.topCreator?.nickname}</Text>
    </View>
  )
}
```

### 3. Feed персонализация:

```typescript
// Получаем подписки для персонализации ленты
async function getPersonalizedFeed(userId: string) {
  // Получаем всех подписок
  const response = await fetch(`/api/follow/mobile/all?userId=${userId}`)
  const { creators } = await response.json()
  
  const creatorIds = creators.map(c => c.id)
  
  // Получаем посты только от подписок
  const postsResponse = await fetch('/api/posts/mobile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      creatorIds, // Фильтруем по подпискам
      limit: 20
    })
  })
  
  return await postsResponse.json()
}
```

### 4. Рекомендации:

```typescript
// Рекомендуем создателей на основе текущих подписок
async function getRecommendations(userId: string) {
  const response = await fetch(`/api/follow/mobile/all?userId=${userId}`)
  const { creators } = await response.json()
  
  // Находим похожих создателей
  const tags = creators.flatMap(c => c.tags || [])
  const uniqueTags = [...new Set(tags)]
  
  // Запрашиваем создателей с похожими тегами
  const recommendations = await fetch(
    `/api/creators/search?tags=${uniqueTags.join(',')}&exclude=${creators.map(c => c.id).join(',')}`
  )
  
  return await recommendations.json()
}
```

## 📊 База данных

### Таблица Follow:
```prisma
model Follow {
  id          String   @id @default(cuid())
  followerId  String
  followingId String
  createdAt   DateTime @default(now())
  
  follower    User @relation("UserFollows", fields: [followerId], references: [id])
  following   User @relation("UserFollowers", fields: [followingId], references: [id])
  
  @@unique([followerId, followingId])
}
```

### Таблица User (выбранные поля):
```prisma
model User {
  id              String   @id @default(cuid())
  nickname        String?  @unique
  fullName        String?
  bio             String?
  avatar          String?
  wallet          String?
  solanaWallet    String?
  isCreator       Boolean  @default(false)
  isVerified      Boolean  @default(false)
  followersCount  Int      @default(0)
  followingCount  Int      @default(0)
  tierPricing     Json?
  createdAt       DateTime @default(now())
  
  followers       Follow[] @relation("UserFollowers")
  following       Follow[] @relation("UserFollows")
  posts           Post[]
  subscriptions   Subscription[]
}
```

### Таблица Subscription:
```prisma
model Subscription {
  id         String   @id @default(cuid())
  userId     String
  creatorId  String
  plan       String   // "basic" | "premium" | "vip"
  isActive   Boolean
  validUntil DateTime
  
  user       User @relation("UserSubscriptions", fields: [userId], references: [id])
  creator    User @relation("CreatorSubscriptions", fields: [creatorId], references: [id])
  
  @@unique([userId, creatorId])
}
```

## 🔍 SQL Query (внутренний)

Endpoint использует следующие Prisma запросы:

```typescript
// 1. Получаем подписки с информацией о создателях
const follows = await prisma.follow.findMany({
  where: { followerId: userId },
  include: {
    following: {
      select: {
        id: true,
        nickname: true,
        fullName: true,
        bio: true,
        avatar: true,
        wallet: true,
        solanaWallet: true,
        isCreator: true,
        isVerified: true,
        followersCount: true,
        followingCount: true,
        tierPricing: true,
        createdAt: true
      }
    }
  },
  orderBy: { createdAt: 'desc' }
})

// 2. Для каждого создателя получаем статистику постов
const postsCount = await prisma.post.count({
  where: { creatorId: creator.id }
})

// 3. Проверяем активную подписку
const activeSubscription = await prisma.subscription.findFirst({
  where: {
    userId: userId,
    creatorId: creator.id,
    isActive: true,
    validUntil: { gte: new Date() }
  }
})
```

## ⚡ Performance

### Оптимизации:
1. **Один запрос для всех подписок** - используем `include` вместо отдельных запросов
2. **Параллельные запросы** - `Promise.all` для статистики каждого создателя
3. **Selective fields** - выбираем только нужные поля через `select`
4. **Сортировка на уровне БД** - `orderBy` выполняется в PostgreSQL

### Примерное время выполнения:
- **10 подписок**: ~150-200ms
- **50 подписок**: ~500-700ms
- **100 подписок**: ~1-1.5s

### Рекомендации:
- Для большого количества подписок (>100) рассмотрите пагинацию
- Кэшируйте результат на клиенте (5-10 минут)
- Используйте lazy loading для аватаров

## 🔄 Сравнение с другими endpoints

| Endpoint | Возвращает | Use Case |
|----------|-----------|----------|
| `/api/follow/mobile` GET | Проверка одной подписки | "Подписан ли user на creator?" |
| `/api/follow/mobile/all` GET | **Все подписки пользователя** | **"Список всех подписок"** |
| `/api/creators` GET | Все создатели | "Исследовать новых создателей" |

## 🐛 Error Handling

```typescript
async function getFollowings(userId: string) {
  try {
    const response = await fetch(
      `/api/follow/mobile/all?userId=${userId}`
    )
    
    if (!response.ok) {
      if (response.status === 400) {
        throw new Error('Invalid user ID')
      } else if (response.status === 404) {
        throw new Error('User not found')
      } else {
        throw new Error('Failed to load followings')
      }
    }
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error)
    }
    
    return data.creators
    
  } catch (error) {
    console.error('Error loading followings:', error)
    
    if (error instanceof TypeError) {
      // Network error
      showError('Network error. Check your connection.')
    } else {
      showError(error.message)
    }
    
    return []
  }
}
```

## 📱 Complete React Native Example

```typescript
import React, { useState, useEffect } from 'react'
import {
  View,
  FlatList,
  Text,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet
} from 'react-native'

interface Creator {
  id: string
  nickname: string
  fullName: string
  avatar: string
  bio: string
  isVerified: boolean
  followersCount: number
  postsCount: number
  subscription: {
    plan: string
    validUntil: string
  } | null
}

interface FollowingScreenProps {
  userId: string
  onCreatorPress: (creatorId: string) => void
}

export default function FollowingScreen({ 
  userId, 
  onCreatorPress 
}: FollowingScreenProps) {
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    loadFollowings()
  }, [userId])
  
  async function loadFollowings(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      
      setError(null)
      
      const response = await fetch(
        `/api/follow/mobile/all?userId=${userId}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to load followings')
      }
      
      const data = await response.json()
      
      if (data.success) {
        setCreators(data.creators)
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }
  
  function renderCreator({ item }: { item: Creator }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => onCreatorPress(item.id)}
      >
        <Image
          source={{ uri: item.avatar || 'https://via.placeholder.com/60' }}
          style={styles.avatar}
        />
        
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.nickname}>
              {item.nickname || item.fullName}
            </Text>
            {item.isVerified && (
              <Text style={styles.verified}>✓</Text>
            )}
          </View>
          
          {item.bio && (
            <Text style={styles.bio} numberOfLines={1}>
              {item.bio}
            </Text>
          )}
          
          <Text style={styles.stats}>
            {item.followersCount.toLocaleString()} followers · {item.postsCount} posts
          </Text>
          
          {item.subscription && (
            <View style={styles.subscriptionBadge}>
              <Text style={styles.subscriptionText}>
                {item.subscription.plan.toUpperCase()} 💎
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    )
  }
  
  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }
  
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => loadFollowings()}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }
  
  if (creators.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>
          You're not following anyone yet
        </Text>
        <Text style={styles.emptySubtext}>
          Start following creators to see their content
        </Text>
      </View>
    )
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        Following {creators.length} creators
      </Text>
      
      <FlatList
        data={creators}
        renderItem={renderCreator}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadFollowings(true)}
          />
        }
        contentContainerStyle={styles.list}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  list: {
    padding: 16
  },
  card: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginBottom: 12
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30
  },
  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center'
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  nickname: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4
  },
  verified: {
    color: '#1DA1F2',
    fontSize: 16
  },
  bio: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  stats: {
    fontSize: 12,
    color: '#999'
  },
  subscriptionBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4
  },
  subscriptionText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000'
  },
  error: {
    fontSize: 16,
    color: '#f44',
    marginBottom: 16,
    textAlign: 'center'
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center'
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  }
})
```

## 📖 См. также

- `/app/api/follow/mobile/README.md` - Follow/Unfollow endpoints
- `/app/api/creators/route.ts` - All creators endpoint
- `docs/FOLLOW_MOBILE_API_SUMMARY.md` - Follow API summary


