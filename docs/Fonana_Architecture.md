# Fonana Architecture Documentation

## Обзор архитектуры

Fonana - это платформа для создания и монетизации контента на блокчейне Solana. Архитектура построена на Next.js с использованием WebSocket для real-time функций, JWT аутентификации и централизованного управления состоянием пользователя.

## Ключевые компоненты

### 1. UserContext - Центральное управление состоянием пользователя

#### Зависимости и инициализация
```typescript
// Основные зависимости
- useWallet() - Solana Wallet Adapter
  - publicKey: PublicKey | null
  - connected: boolean
  - wallet: Wallet | null

// Условия инициализации
- connected && publicKey → createOrGetUser()
- !connected → clearUserState()
```

#### Жизненный цикл UserContext

1. **Монтирование компонента**
   - Проверка кеша localStorage (TTL 7 дней)
   - Восстановление данных пользователя из кеша

2. **Подключение кошелька**
   - `connected && publicKey` → `createOrGetUser(publicKey.toString())`
   - API запрос к `/api/user` (POST)
   - Сохранение в кеш + состояние

3. **Отключение кошелька**
   - Очистка состояния: `user = null`
   - Очистка кеша localStorage
   - Сброс флагов: `isNewUser = false`

#### Кеширование данных
```typescript
// Структура кеша
localStorage.setItem('fonana_user_data', JSON.stringify(userData))
localStorage.setItem('fonana_user_wallet', wallet)
localStorage.setItem('fonana_user_timestamp', Date.now().toString())

// TTL проверка
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 дней
if (now - timestamp < CACHE_TTL) {
  return cached.user
}
```

#### Fallback логика
```typescript
// Глобальная функция для восстановления пользователя
window.__refreshUser = refreshUser

// Использование в компонентах
if (!user) {
  const cachedUser = getCachedUserData(wallet)
  if (cachedUser) {
    setUser(cachedUser)
    setTimeout(() => handleAction(), 100) // Рекурсивный вызов
  }
}
```

### 2. WebSocket Service - Real-time коммуникация

#### Аутентификация и подключение
```typescript
// JWT токен обязателен для всех подключений
const token = await getJWTToken()
const wsUrl = `wss://fonana.me/ws?token=${encodeURIComponent(token)}`

// Без токена - соединение закрывается с кодом 1008
if (!token) {
  ws.close(1008, 'Unauthorized')
  return
}
```

#### Подписки на каналы
```typescript
// Типы каналов
- notifications: `notifications_${userId}`
- feed: `feed_${userId}`
- creator: `creator_${creatorId}`
- post: `post_${postId}`

// Автоматическая переподписка при переподключении
wsService.on('connected', () => {
  subscribedChannels.forEach(channel => {
    sendSubscription(channel)
  })
})
```

#### Обработка событий
```typescript
// Основные события
- post_liked / post_unliked
- comment_added / comment_deleted
- post_created / post_deleted
- notification
- subscription_updated
- post_purchased
```

### 3. Система лайков - Многоуровневая валидация

#### Зависимости для лайков
```typescript
// Критические зависимости
- user?.id (обязательно)
- wallet.connected (обязательно)
- publicKey (обязательно)

// Fallback цепочка
1. user из UserContext
2. Кеш localStorage (TTL проверка)
3. API запрос /api/user?wallet=${publicKey}
4. Ошибка "Подключите кошелек"
```

#### Логика обработки лайков
```typescript
const handleLike = async () => {
  if (!user) {
    // Fallback логика
    const cachedUser = getCachedUserData(wallet)
    if (cachedUser) {
      setUser(cachedUser)
      setTimeout(() => handleLike(), 100) // Рекурсивный вызов
      return
    }
    toast.error('Пожалуйста, подключите кошелек')
    return
  }

  // API запрос
  const response = await fetch(`/api/posts/${postId}/like`, {
    method: 'POST',
    body: JSON.stringify({ userId: user.id })
  })

  // WebSocket уведомление
  await updatePostLikes(postId, newLikesCount, user.id)
}
```

#### WebSocket события лайков
```typescript
// Отправка события
wsService.emit('post_liked', {
  type: 'post_liked',
  postId,
  userId,
  likesCount
})

// Обработка в хуках
const handlePostLikedThrottled = throttle((event) => {
  batchUpdate(event.postId, {
    engagement: {
      likes: event.likesCount,
      isLiked: event.userId === user?.id
    }
  })
}, 500)
```

### 4. NotificationContext - Система уведомлений

#### Инициализация и подписка
```typescript
// Зависимости
- user?.id (обязательно)
- JWT токен для API запросов
- WebSocket подключение

// Подписка на канал
wsService.subscribeToNotifications(user.id)

// Обработчики событий
wsService.on('notification', handleNewNotification)
wsService.on('notification_read', handleNotificationRead)
wsService.on('notifications_cleared', handleNotificationsCleared)
```

#### Загрузка уведомлений
```typescript
const refreshNotifications = async () => {
  const token = await getJWTToken()
  
  const response = await fetch('/api/user/notifications', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  const data = await response.json()
  setNotifications(data.notifications)
  setUnreadCount(data.unreadCount)
}
```

#### Real-time обработка
```typescript
const handleNewNotification = (event) => {
  if (event.userId === user?.id) {
    setNotifications(prev => [event.notification, ...prev])
    setUnreadCount(prev => prev + 1)
    showNotificationToast(event.notification)
    playNotificationSound()
  }
}
```

### 5. Жизненный цикл от подключения кошелька до полной инициализации UI

#### Фаза 1: Подключение кошелька
```typescript
// 1. Пользователь подключает кошелек
wallet.connect() → connected = true, publicKey = PublicKey

// 2. UserContext реагирует на изменение
useEffect(() => {
  if (connected && publicKey) {
    createOrGetUser(publicKey.toString())
  }
}, [connected, publicKey])
```

#### Фаза 2: Создание/получение пользователя
```typescript
// 3. API запрос к /api/user
const response = await fetch('/api/user', {
  method: 'POST',
  body: JSON.stringify({ wallet, referrerFromClient })
})

// 4. Сохранение в состояние и кеш
setUser(data.user)
setCachedUserData(data.user, wallet)
```

#### Фаза 3: Инициализация WebSocket
```typescript
// 5. Получение JWT токена
const token = await getJWTToken()

// 6. Подключение к WebSocket
wsService.connect(`wss://fonana.me/ws?token=${token}`)

// 7. Подписка на каналы
wsService.subscribeToNotifications(user.id)
wsService.subscribeToFeed(user.id)
```

#### Фаза 4: Инициализация контекстов
```typescript
// 8. NotificationContext загружает уведомления
refreshNotifications()

// 9. CreatorContext инициализируется (если на странице создателя)
<CreatorDataProvider creatorId={creatorId}>

// 10. UI полностью готов к взаимодействию
```

## Критические точки и правила

### 1. Правила инициализации
- **НЕ инициировать действия** до загрузки `user?.id`
- **Всегда проверять** `wallet.connected && publicKey` перед API запросами
- **Использовать fallback логику** для восстановления из кеша
- **Рекурсивные вызовы** после восстановления пользователя

### 2. WebSocket правила
- **JWT токен обязателен** для всех подключений
- **Автоматическая переподписка** при переподключении
- **Throttling** для частых событий (лайки, комментарии)
- **Fallback на HTTP API** при недоступности WebSocket

### 3. Кеширование
- **TTL 7 дней** для пользовательских данных
- **Проверка актуальности** перед использованием
- **Автоматическая очистка** при отключении кошелька
- **Безопасная сериализация** JSON данных

### 4. Обработка ошибок
- **Graceful degradation** при недоступности сервисов
- **Retry логика** для критических операций
- **Пользовательские уведомления** о статусе операций
- **Логирование** всех ошибок для диагностики

## Состояния системы

### Состояние "wallet есть, user нет"
```typescript
// Причины
- Задержка API запроса
- Ошибка сети
- Проблемы с JWT токеном

// Решение
- Fallback на кеш localStorage
- Периодическая проверка (500ms до 5 секунд)
- Рекурсивные вызовы функций после восстановления
```

### Состояние "WebSocket отключен"
```typescript
// Причины
- Потеря сети
- Истечение JWT токена
- Проблемы сервера

// Решение
- Автоматическое переподключение
- Fallback на HTTP API
- Периодическое обновление данных
```

### Состояние "пропажа уведомлений"
```typescript
// Причины
- WebSocket не подключен
- Неправильная подписка на канал
- Ошибки в обработчиках событий

// Решение
- Проверка подключения перед отправкой
- Валидация подписок
- HTTP fallback для критических уведомлений
```

## Рекомендации по разработке

### 1. Новые компоненты
- **Всегда проверять** `user?.id` перед действиями
- **Использовать UserContext** вместо прямого доступа к localStorage
- **Добавлять fallback логику** для критических операций
- **Логировать** все состояния для диагностики

### 2. API интеграция
- **Передавать userId** в WebSocket события
- **Использовать JWT токены** для аутентификации
- **Обрабатывать ошибки** сети и сервера
- **Кешировать** часто используемые данные

### 3. Real-time функции
- **Throttle** частые события
- **Batch updates** для оптимизации производительности
- **Graceful degradation** при недоступности WebSocket
- **Пользовательская обратная связь** о статусе операций 