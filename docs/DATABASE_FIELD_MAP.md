# DATABASE FIELD MAP: Детальная карта полей базы данных Fonana

## 🗄️ Обзор базы данных

### Статус документации:
**Документ**: Карта полей базы данных  
**Дата создания**: 21 октября 2025  
**Версия схемы**: Prisma 5.22.0  
**База данных**: PostgreSQL

---

## 📊 Статистика базы данных

- **Всего моделей**: 26
- **Всего полей**: 250+
- **Связей**: 60+
- **Индексов**: 40+
- **Enum типов**: 9

---

## 🏗️ Основные модели

### **1. User Model**
**Назначение**: Хранение информации о пользователях и создателях контента

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | String | @id @default(cuid()) | Уникальный идентификатор пользователя |
| `wallet` | String | @unique | Адрес кошелька (основной идентификатор) |
| `nickname` | String? | @unique | Псевдоним пользователя |
| `fullName` | String? | - | Полное имя пользователя |
| `bio` | String? | - | Биография пользователя |
| `avatar` | String? | - | URL аватара пользователя |
| `backgroundImage` | String? | - | URL фонового изображения |
| `website` | String? | - | Веб-сайт пользователя |
| `twitter` | String? | - | Twitter аккаунт |
| `telegram` | String? | - | Telegram аккаунт |
| `location` | String? | - | Местоположение пользователя |
| `createdAt` | DateTime | @default(now()) | Дата создания аккаунта |
| `updatedAt` | DateTime | @updatedAt | Дата последнего обновления |
| `isVerified` | Boolean | @default(false) | Статус верификации |
| `isCreator` | Boolean | @default(true) | Является ли создателем контента |
| `followersCount` | Int | @default(0) | Количество подписчиков |
| `followingCount` | Int | @default(0) | Количество подписок |
| `postsCount` | Int | @default(0) | Количество постов |
| `referrerId` | String? | - | ID реферера |
| `name` | String? | - | Альтернативное имя |
| `email` | String? | - | Email адрес |
| `solanaWallet` | String? | @map("solana_wallet") | Solana кошелек |
| `token` | String? | - | JWT токен для API |
| `tokenExpiresAt` | DateTime? | - | Срок действия токена |
| `referalCount` | Int | @default(0) | Количество рефералов |

**Связи**:
- `accounts` → Account[] (One-to-Many)
- `posts` → Post[] (One-to-Many)
- `follows` → Follow[] (One-to-Many, как follower)
- `followers` → Follow[] (One-to-Many, как following)
- `subscriptions` → Subscription[] (One-to-Many, как subscriber)
- `subscribers` → Subscription[] (One-to-Many, как creator)
- `conversationsFrom` → Conversation[] (One-to-Many)
- `conversationsTo` → Conversation[] (One-to-Many)
- `sentMessages` → Message[] (One-to-Many)
- `referrer` → User? (Many-to-One)
- `referrals` → User[] (One-to-Many)

---

### **2. Post Model**
**Назначение**: Хранение постов и контента создателей

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | String | @id @default(cuid()) | Уникальный идентификатор поста |
| `creatorId` | String | - | ID создателя поста |
| `title` | String | - | Заголовок поста |
| `content` | String | - | Содержимое поста |
| `type` | String | - | Тип поста (text, image, video, etc.) |
| `category` | String? | - | Категория поста |
| `thumbnail` | String? | - | URL превью изображения |
| `mediaUrl` | String? | - | URL медиа файла |
| `blurUrl` | String? | - | URL размытого превью для заблокированного контента |
| `isLocked` | Boolean | @default(false) | Заблокирован ли пост |
| `isPremium` | Boolean | @default(false) | Премиум ли пост |
| `price` | Float? | - | Цена поста |
| `currency` | String | @default("SOL") | Валюта цены |
| `imageAspectRatio` | Decimal? | - | Соотношение сторон изображения |
| `isSellable` | Boolean | @default(false) | Можно ли продавать пост |
| `minSubscriptionTier` | String? | - | Минимальный уровень подписки |
| `requestId` | String? | - | ID запроса для AI генерации |
| `error` | String? | - | Сообщение об ошибке AI генерации |
| `remixId` | String? | - | ID оригинального поста для ремикса |
| `likesCount` | Int | @default(0) | Количество лайков |
| `commentsCount` | Int | @default(0) | Количество комментариев |
| `viewsCount` | Int | @default(0) | Количество просмотров |
| `createdAt` | DateTime | @default(now()) | Дата создания |
| `updatedAt` | DateTime | @updatedAt | Дата обновления |

**Связи**:
- `creator` → User (Many-to-One)
- `comments` → Comment[] (One-to-Many)
- `likes` → Like[] (One-to-Many)
- `tags` → PostTag[] (One-to-Many)
- `purchases` → PostPurchase[] (One-to-Many)
- `auctionBids` → AuctionBid[] (One-to-Many)
- `auctionDeposits` → AuctionDeposit[] (One-to-Many)
- `auctionPayment` → AuctionPayment? (One-to-One)
- `flashSales` → FlashSale[] (One-to-Many)

**Индексы**:
- `@@index([requestId])` - Для поиска по AI запросам

---

### **3. Conversation Model**
**Назначение**: Хранение диалогов между пользователями

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | String | @id @default(cuid()) | Уникальный идентификатор диалога |
| `fromUserId` | String | - | ID пользователя, инициировавшего диалог |
| `toUserId` | String | - | ID пользователя-получателя |
| `lastMessageAt` | DateTime? | - | Время последнего сообщения |
| `createdAt` | DateTime | @default(now()) | Дата создания диалога |
| `updatedAt` | DateTime | @updatedAt | Дата обновления |

**Связи**:
- `fromUser` → User (Many-to-One)
- `toUser` → User (Many-to-One)
- `messages` → Message[] (One-to-Many)

**Ограничения**:
- `@@unique([fromUserId, toUserId])` - Уникальность диалога между пользователями
- `@@index([fromUserId])` - Индекс для поиска по отправителю
- `@@index([toUserId])` - Индекс для поиска по получателю

---

### **4. Message Model**
**Назначение**: Хранение сообщений в диалогах

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | String | @id @default(cuid()) | Уникальный идентификатор сообщения |
| `conversationId` | String | - | ID диалога |
| `senderId` | String | - | ID отправителя |
| `content` | String? | - | Текст сообщения |
| `mediaUrl` | String? | - | URL медиа файла |
| `mediaType` | String? | - | Тип медиа файла |
| `isPaid` | Boolean | @default(false) | Платное ли сообщение |
| `price` | Float? | - | Цена сообщения |
| `isRead` | Boolean | @default(false) | Прочитано ли сообщение |
| `isEdited` | Boolean | @default(false) | Редактировалось ли сообщение |
| `isDeleted` | Boolean | @default(false) | Удалено ли сообщение |
| `createdAt` | DateTime | @default(now()) | Дата создания |
| `metadata` | Json? | - | Дополнительные данные |

**Связи**:
- `conversation` → Conversation (Many-to-One)
- `sender` → User (Many-to-One)
- `purchases` → MessagePurchase[] (One-to-Many)

**Индексы**:
- `@@index([conversationId])` - Для поиска по диалогу
- `@@index([senderId])` - Для поиска по отправителю

---

### **5. Subscription Model**
**Назначение**: Хранение подписок пользователей на создателей

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | String | @id @default(cuid()) | Уникальный идентификатор подписки |
| `userId` | String | - | ID подписчика |
| `creatorId` | String | - | ID создателя |
| `plan` | String | - | План подписки (basic, premium, vip) |
| `price` | Float | - | Цена подписки |
| `currency` | String | @default("SOL") | Валюта |
| `subscribedAt` | DateTime | @default(now()) | Дата подписки |
| `validUntil` | DateTime | - | Дата окончания подписки |
| `isActive` | Boolean | @default(true) | Активна ли подписка |
| `txSignature` | String? | - | Подпись транзакции |
| `paymentStatus` | PaymentStatus | @default(PENDING) | Статус платежа |

**Связи**:
- `user` → User (Many-to-One)
- `creator` → User (Many-to-One)
- `transactions` → Transaction[] (One-to-Many)

**Ограничения**:
- `@@unique([userId, creatorId])` - Уникальность подписки

---

### **6. Transaction Model**
**Назначение**: Хранение всех транзакций в системе

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | String | @id @default(cuid()) | Уникальный идентификатор транзакции |
| `subscriptionId` | String? | - | ID подписки (если применимо) |
| `txSignature` | String | @unique | Подпись блокчейн транзакции |
| `fromWallet` | String | - | Кошелек отправителя |
| `toWallet` | String | - | Кошелек получателя |
| `amount` | Float | - | Сумма транзакции |
| `currency` | String | @default("SOL") | Валюта |
| `type` | TransactionType | - | Тип транзакции |
| `status` | TransactionStatus | @default(PENDING) | Статус транзакции |
| `platformFee` | Float? | - | Комиссия платформы |
| `referrerFee` | Float? | - | Комиссия реферера |
| `referrerWallet` | String? | - | Кошелек реферера |
| `metadata` | Json? | - | Дополнительные данные |
| `errorMessage` | String? | - | Сообщение об ошибке |
| `confirmedAt` | DateTime? | - | Время подтверждения |
| `createdAt` | DateTime | @default(now()) | Дата создания |
| `updatedAt` | DateTime | @updatedAt | Дата обновления |
| `postPurchaseId` | String? | @unique | ID покупки поста |
| `receiverId` | String? | - | ID получателя |
| `senderId` | String? | - | ID отправителя |

**Связи**:
- `subscription` → Subscription? (Many-to-One)
- `postPurchase` → PostPurchase? (One-to-One)

---

## 🔐 Аутентификация и сессии

### **7. Account Model**
**Назначение**: Аккаунты для аутентификации (NextAuth.js)

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | String | @id @default(cuid()) | Уникальный идентификатор |
| `userId` | String | @map("user_id") | ID пользователя |
| `type` | String | - | Тип аккаунта |
| `provider` | String | - | Провайдер аутентификации |
| `providerAccountId` | String | @map("provider_account_id") | ID аккаунта у провайдера |
| `refresh_token` | String? | - | Refresh токен |
| `access_token` | String? | - | Access токен |
| `expires_at` | Int? | - | Время истечения токена |
| `token_type` | String? | - | Тип токена |
| `scope` | String? | - | Область действия |
| `id_token` | String? | - | ID токен |
| `session_state` | String? | - | Состояние сессии |

**Связи**:
- `user` → User (Many-to-One)

**Ограничения**:
- `@@unique([provider, providerAccountId])` - Уникальность аккаунта у провайдера

### **8. Session Model**
**Назначение**: Сессии пользователей (NextAuth.js)

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | String | @id @default(cuid()) | Уникальный идентификатор |
| `sessionToken` | String | @unique @map("session_token") | Токен сессии |
| `userId` | String | @map("user_id") | ID пользователя |
| `expires` | DateTime | - | Время истечения сессии |

**Связи**:
- `user` → User (Many-to-One)

---

## ⚙️ Настройки пользователей

### **9. UserSettings Model**
**Назначение**: Настройки пользователей

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | String | @id @default(cuid()) | Уникальный идентификатор |
| `userId` | String | @unique | ID пользователя |
| `notifyComments` | Boolean | @default(true) | Уведомления о комментариях |
| `notifyLikes` | Boolean | @default(true) | Уведомления о лайках |
| `notifyNewPosts` | Boolean | @default(true) | Уведомления о новых постах |
| `notifySubscriptions` | Boolean | @default(true) | Уведомления о подписках |
| `showActivity` | Boolean | @default(true) | Показывать активность |
| `allowMessages` | Boolean | @default(true) | Разрешить сообщения |
| `showOnlineStatus` | Boolean | @default(true) | Показывать статус онлайн |
| `theme` | String | @default("dark") | Тема интерфейса |
| `createdAt` | DateTime | @default(now()) | Дата создания |
| `updatedAt` | DateTime | @updatedAt | Дата обновления |

**Связи**:
- `user` → User (One-to-One)

### **10. CreatorTierSettings Model**
**Назначение**: Настройки уровней подписки создателей

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | String | @id @default(cuid()) | Уникальный идентификатор |
| `creatorId` | String | @unique | ID создателя |
| `basicTier` | Json? | - | Настройки базового уровня |
| `premiumTier` | Json? | - | Настройки премиум уровня |
| `vipTier` | Json? | - | Настройки VIP уровня |
| `createdAt` | DateTime | @default(now()) | Дата создания |
| `updatedAt` | DateTime | @updatedAt | Дата обновления |

**Связи**:
- `creator` → User (One-to-One)

---

## 🔔 Уведомления

### **11. Notification Model**
**Назначение**: Уведомления пользователей

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | String | @id @default(cuid()) | Уникальный идентификатор |
| `userId` | String | - | ID пользователя |
| `type` | NotificationType | - | Тип уведомления |
| `title` | String | - | Заголовок уведомления |
| `message` | String | - | Сообщение уведомления |
| `isRead` | Boolean | @default(false) | Прочитано ли уведомление |
| `metadata` | Json? | - | Дополнительные данные |
| `createdAt` | DateTime | @default(now()) | Дата создания |

**Индексы**:
- `@@index([userId, isRead])` - Для поиска по пользователю и статусу

---

## 🏷️ Флеш-сейлы

### **12. FlashSale Model**
**Назначение**: Флеш-сейлы и скидки

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | String | @id @default(cuid()) | Уникальный идентификатор |
| `creatorId` | String? | - | ID создателя |
| `postId` | String? | - | ID поста |
| `subscriptionPlan` | String? | - | План подписки |
| `discount` | Float | - | Размер скидки |
| `maxRedemptions` | Int? | - | Максимальное количество использований |
| `usedCount` | Int | @default(0) | Количество использований |
| `startAt` | DateTime | @default(now()) | Время начала |
| `endAt` | DateTime | - | Время окончания |
| `isActive` | Boolean | @default(true) | Активен ли флеш-сейл |
| `createdAt` | DateTime | @default(now()) | Дата создания |
| `updatedAt` | DateTime | @updatedAt | Дата обновления |

**Связи**:
- `creator` → User? (Many-to-One)
- `post` → Post? (Many-to-One)
- `redemptions` → FlashSaleRedemption[] (One-to-Many)

**Индексы**:
- `@@index([creatorId, isActive])` - Для поиска по создателю и статусу
- `@@index([endAt, isActive])` - Для поиска по времени окончания

### **13. FlashSaleRedemption Model**
**Назначение**: Использования флеш-сейлов

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | String | @id @default(cuid()) | Уникальный идентификатор |
| `flashSaleId` | String | - | ID флеш-сейла |
| `userId` | String | - | ID пользователя |
| `originalPrice` | Float | - | Оригинальная цена |
| `discountAmount` | Float | - | Размер скидки |
| `finalPrice` | Float | - | Финальная цена |
| `redeemedAt` | DateTime | @default(now()) | Время использования |

**Связи**:
- `flashSale` → FlashSale (Many-to-One)
- `user` → User (Many-to-One)

**Ограничения**:
- `@@unique([flashSaleId, userId])` - Уникальность использования

---

## 🔗 Связующие модели

### **14. Follow Model**
**Назначение**: Связь подписок между пользователями

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | String | @id @default(cuid()) | Уникальный идентификатор |
| `followerId` | String | - | ID подписчика |
| `followingId` | String | - | ID того, на кого подписываются |
| `createdAt` | DateTime | @default(now()) | Дата подписки |

**Ограничения**:
- `@@unique([followerId, followingId])` - Уникальность подписки

### **15. Like Model**
**Назначение**: Лайки постов и комментариев

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | String | @id @default(cuid()) | Уникальный идентификатор |
| `userId` | String | - | ID пользователя |
| `postId` | String? | - | ID поста |
| `commentId` | String? | - | ID комментария |
| `createdAt` | DateTime | @default(now()) | Дата лайка |

**Ограничения**:
- `@@unique([userId, postId])` - Уникальность лайка поста
- `@@unique([userId, commentId])` - Уникальность лайка комментария

### **16. Comment Model**
**Назначение**: Комментарии к постам

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | String | @id @default(cuid()) | Уникальный идентификатор |
| `postId` | String | - | ID поста |
| `userId` | String | - | ID пользователя |
| `content` | String | - | Содержимое комментария |
| `isAnonymous` | Boolean | @default(false) | Анонимный ли комментарий |
| `likesCount` | Int | @default(0) | Количество лайков |
| `createdAt` | DateTime | @default(now()) | Дата создания |
| `updatedAt` | DateTime | @updatedAt | Дата обновления |
| `parentId` | String? | - | ID родительского комментария |

**Связи**:
- `parent` → Comment? (Many-to-One)
- `replies` → Comment[] (One-to-Many)

---

## 🏷️ Системные модели

### **17. Tag Model**
**Назначение**: Теги для постов

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | String | @id @default(cuid()) | Уникальный идентификатор |
| `name` | String | @unique | Название тега |

### **18. PostTag Model**
**Назначение**: Связь постов и тегов

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `postId` | String | - | ID поста |
| `tagId` | String | - | ID тега |

**Ограничения**:
- `@@id([postId, tagId])` - Составной первичный ключ

---

## 💰 Платежные модели

### **19. PostPurchase Model**
**Назначение**: Покупки постов

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | String | @id @default(cuid()) | Уникальный идентификатор |
| `postId` | String | - | ID поста |
| `userId` | String | - | ID покупателя |
| `price` | Float | - | Цена покупки |
| `currency` | String | @default("SOL") | Валюта |
| `txSignature` | String? | - | Подпись транзакции |
| `purchasedAt` | DateTime | @default(now()) | Дата покупки |
| `paymentStatus` | PaymentStatus | @default(PENDING) | Статус платежа |
| `platformFee` | Float? | - | Комиссия платформы |
| `referrerFee` | Float? | - | Комиссия реферера |
| `creatorAmount` | Float? | - | Сумма для создателя |

**Ограничения**:
- `@@unique([userId, postId])` - Уникальность покупки

### **20. MessagePurchase Model**
**Назначение**: Покупки сообщений

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | String | @id @default(cuid()) | Уникальный идентификатор |
| `messageId` | String | - | ID сообщения |
| `userId` | String | - | ID покупателя |
| `amount` | Float | - | Сумма покупки |
| `txSignature` | String | - | Подпись транзакции |
| `createdAt` | DateTime | @default(now()) | Дата покупки |

**Ограничения**:
- `@@unique([messageId, userId])` - Уникальность покупки

---

## 🎯 Аукционные модели

### **21. AuctionDeposit Model**
**Назначение**: Депозиты для участия в аукционах

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | String | @id @default(cuid()) | Уникальный идентификатор |
| `postId` | String | - | ID поста |
| `userId` | String | - | ID пользователя |
| `amount` | Float | - | Сумма депозита |
| `txSignature` | String | - | Подпись транзакции |
| `status` | DepositStatus | @default(HELD) | Статус депозита |
| `createdAt` | DateTime | @default(now()) | Дата создания |
| `refundedAt` | DateTime? | - | Дата возврата |
| `refundTxSignature` | String? | - | Подпись возврата |
| `forfeitedAt` | DateTime? | - | Дата конфискации |

**Ограничения**:
- `@@unique([postId, userId])` - Уникальность депозита

### **22. AuctionBid Model**
**Назначение**: Ставки в аукционах

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | String | @id @default(cuid()) | Уникальный идентификатор |
| `postId` | String | - | ID поста |
| `userId` | String | - | ID пользователя |
| `amount` | Float | - | Сумма ставки |
| `isWinning` | Boolean | @default(false) | Выигрышная ли ставка |
| `createdAt` | DateTime | @default(now()) | Дата ставки |

**Индексы**:
- `@@index([postId, amount])` - Для поиска по посту и сумме
- `@@index([userId])` - Для поиска по пользователю

### **23. AuctionPayment Model**
**Назначение**: Платежи по аукционам

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | String | @id @default(cuid()) | Уникальный идентификатор |
| `postId` | String | @unique | ID поста |
| `userId` | String | - | ID покупателя |
| `amount` | Float | - | Сумма платежа |
| `txSignature` | String? | - | Подпись транзакции |
| `status` | AuctionPaymentStatus | @default(PENDING) | Статус платежа |
| `dueAt` | DateTime | - | Срок платежа |
| `paidAt` | DateTime? | - | Дата платежа |
| `sellerConfirmedAt` | DateTime? | - | Дата подтверждения продавцом |
| `createdAt` | DateTime | @default(now()) | Дата создания |

---

## 🏷️ Enum типы

### **TransactionType**
```prisma
enum TransactionType {
  SUBSCRIPTION      // Подписка
  PLATFORM_FEE      // Комиссия платформы
  REFERRER_FEE      // Комиссия реферера
  WITHDRAWAL        // Вывод средств
  REFUND            // Возврат
  POST_PURCHASE     // Покупка поста
  MESSAGE_PURCHASE  // Покупка сообщения
  TIP               // Чаевые
}
```

### **TransactionStatus**
```prisma
enum TransactionStatus {
  PENDING     // Ожидает
  CONFIRMED   // Подтверждено
  FAILED      // Неудачно
  EXPIRED     // Истекло
}
```

### **PaymentStatus**
```prisma
enum PaymentStatus {
  PENDING     // Ожидает
  PROCESSING  // Обрабатывается
  COMPLETED   // Завершено
  FAILED      // Неудачно
  REFUNDED    // Возвращено
}
```

### **NotificationType**
```prisma
enum NotificationType {
  LIKE_POST                    // Лайк поста
  LIKE_COMMENT                 // Лайк комментария
  COMMENT_POST                 // Комментарий к посту
  REPLY_COMMENT                // Ответ на комментарий
  NEW_SUBSCRIBER               // Новый подписчик
  POST_PURCHASE                // Покупка поста
  MESSAGE_PURCHASE             // Покупка сообщения
  SUBSCRIPTION_PURCHASE        // Покупка подписки
  TIP_RECEIVED                 // Получены чаевые
  POST_SALE                    // Продажа поста
  SYSTEM_ANNOUNCEMENT          // Системное объявление
  NEW_MESSAGE                  // Новое сообщение
  NEW_POST_FROM_SUBSCRIPTION   // Новый пост от подписки
}
```

---

## 📊 Индексы и производительность

### **Основные индексы**
- **Primary Keys**: Все модели используют CUID
- **Foreign Keys**: Индексы на все внешние ключи
- **Unique Constraints**: Уникальные ограничения на критичные поля
- **Search Fields**: Индексы на поля поиска (nickname, title, content)
- **Time Fields**: Индексы на временные поля (createdAt, updatedAt)
- **Status Fields**: Индексы на поля статусов

### **Оптимизация запросов**
- **Composite Indexes**: Составные индексы для сложных запросов
- **Partial Indexes**: Частичные индексы для фильтрации
- **Covering Indexes**: Покрывающие индексы для быстрого доступа

---

## 🔒 Безопасность и валидация

### **Ограничения целостности**
- **Foreign Key Constraints**: Все связи защищены внешними ключами
- **Cascade Deletes**: Каскадные удаления для связанных данных
- **Unique Constraints**: Уникальность критичных полей
- **Check Constraints**: Проверка значений полей

### **Валидация данных**
- **Type Safety**: Строгая типизация через Prisma
- **Required Fields**: Обязательные поля помечены как required
- **Default Values**: Значения по умолчанию для всех полей
- **Enum Validation**: Валидация через enum типы

---

## 📈 Масштабирование

### **Горизонтальное масштабирование**
- **Sharding Strategy**: Стратегия шардирования по userId
- **Read Replicas**: Реплики для чтения
- **Connection Pooling**: Пул соединений с БД

### **Вертикальное масштабирование**
- **Index Optimization**: Оптимизация индексов
- **Query Optimization**: Оптимизация запросов
- **Caching Strategy**: Стратегия кэширования

---

## 🤖 AI модели

### **26. AI_Creations Model**
**Назначение**: Хранение AI генераций (фото и видео)

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | String | @id @default(cuid()) | Уникальный идентификатор |
| `user_id` | String | - | ID пользователя |
| `type` | String | - | Тип контента ('photo' или 'video') |
| `createdAt` | DateTime | @default(now()) | Дата создания |
| `requestId` | String | - | ID запроса AI генерации |
| `model` | String | - | Модель AI ('sora2' или 'openAI') |
| `size` | String | - | Размер контента |
| `prompt` | String | @default("") | Промпт для генерации |
| `status` | String | @default("pending") | Статус генерации |

**Индексы**:
- `@@index([user_id])` - Для поиска по пользователю
- `@@index([requestId])` - Для поиска по запросу

---

## 🎫 Система поддержки

### **24. SupportTicket Model**
**Назначение**: Тикеты поддержки пользователей

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | String | @id @default(cuid()) | Уникальный идентификатор |
| `userId` | String | - | ID пользователя |
| `userWallet` | String | - | Кошелек пользователя |
| `username` | String | - | Имя пользователя |
| `subject` | String | - | Тема тикета |
| `description` | String | - | Описание проблемы |
| `images` | String[] | - | Массив URL изображений |
| `status` | SupportTicketStatus | @default(OPEN) | Статус тикета |
| `createdAt` | DateTime | @default(now()) | Дата создания |
| `updatedAt` | DateTime | @updatedAt | Дата обновления |

**Связи**:
- `user` → User (Many-to-One)
- `responses` → SupportTicketResponse[] (One-to-Many)

**Индексы**:
- `@@index([userId])` - Для поиска по пользователю
- `@@index([status])` - Для поиска по статусу
- `@@index([createdAt])` - Для поиска по дате

### **25. SupportTicketResponse Model**
**Назначение**: Ответы на тикеты поддержки

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | String | @id @default(cuid()) | Уникальный идентификатор |
| `ticketId` | String | - | ID тикета |
| `adminId` | String | - | ID администратора |
| `adminWallet` | String | - | Кошелек администратора |
| `adminUsername` | String | - | Имя администратора |
| `message` | String | - | Сообщение ответа |
| `isAdminResponse` | Boolean | @default(true) | Ответ администратора |
| `createdAt` | DateTime | @default(now()) | Дата создания |

**Связи**:
- `ticket` → SupportTicket (Many-to-One)

**Индексы**:
- `@@index([ticketId])` - Для поиска по тикету
- `@@index([adminId])` - Для поиска по администратору
- `@@index([createdAt])` - Для поиска по дате

---

## 🏷️ Дополнительные Enum типы

### **SellType**
```prisma
enum SellType {
  FIXED_PRICE    // Фиксированная цена
  AUCTION        // Аукцион
}
```

### **AuctionStatus**
```prisma
enum AuctionStatus {
  SCHEDULED      // Запланирован
  ACTIVE         // Активен
  PAUSED         // Приостановлен
  COMPLETED      // Завершен
  CANCELLED      // Отменен
}
```

### **SupportTicketStatus**
```prisma
enum SupportTicketStatus {
  OPEN           // Открыт
  IN_PROGRESS    // В работе
  RESOLVED       // Решен
  CLOSED         // Закрыт
}
```

---

<div align="center">
  <strong>🗄️ Field Map завершен!</strong><br>
  <em>Полная карта полей базы данных</em>
</div>
