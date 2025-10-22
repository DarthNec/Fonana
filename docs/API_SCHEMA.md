# API SCHEMA: Полная схема API endpoints проекта Fonana

## 🔌 Обзор API

### Статус документации:
**Документ**: Схема API endpoints  
**Дата создания**: 21 октября 2025  
**Версия API**: v1.0  
**База**: Next.js API Routes

---

## 📊 Статистика API

- **Всего endpoints**: 69
- **Mobile endpoints**: 15+
- **Admin endpoints**: 5+
- **Webhook endpoints**: 2+
- **Аутентификация**: JWT Bearer Token

---

## 🔐 Аутентификация

### **JWT Token Authentication**
```http
Authorization: Bearer <jwt_token>
```

### **Token Structure**
```json
{
  "userId": "string",
  "wallet": "string",
  "exp": "number"
}
```

---

## 📱 Основные API Endpoints

### **1. Posts API**

#### **GET /api/posts**
**Описание**: Получение списка постов с проверкой доступа по тирам

**Query Parameters**:
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `userWallet` | string | Нет | Кошелек пользователя для проверки доступа |
| `creatorId` | string | Нет | ID создателя для фильтрации |
| `page` | number | Нет | Номер страницы (по умолчанию: 1) |
| `limit` | number | Нет | Количество постов на странице (по умолчанию: 20) |
| `category` | string | Нет | Категория постов |

**Response**:
```json
{
  "posts": [
    {
      "id": "string",
      "creatorId": "string",
      "title": "string",
      "content": "string",
      "type": "string",
      "category": "string",
      "thumbnail": "string",
      "mediaUrl": "string",
      "blurUrl": "string",
      "isLocked": "boolean",
      "isPremium": "boolean",
      "price": "number",
      "currency": "string",
      "likesCount": "number",
      "commentsCount": "number",
      "viewsCount": "number",
      "createdAt": "string",
      "updatedAt": "string",
      "creator": {
        "id": "string",
        "nickname": "string",
        "avatar": "string"
      }
    }
  ],
  "totalCount": "number",
  "hasMore": "boolean"
}
```

#### **POST /api/posts**
**Описание**: Создание нового поста

**Request Body**:
```json
{
  "title": "string",
  "content": "string",
  "type": "string",
  "category": "string",
  "thumbnail": "string",
  "mediaUrl": "string",
  "isLocked": "boolean",
  "isPremium": "boolean",
  "price": "number",
  "currency": "string",
  "minSubscriptionTier": "string"
}
```

**Response**:
```json
{
  "success": "boolean",
  "post": {
    "id": "string",
    "title": "string",
    "content": "string",
    "createdAt": "string"
  }
}
```

#### **GET /api/posts/[id]**
**Описание**: Получение конкретного поста

**Path Parameters**:
| Параметр | Тип | Описание |
|----------|-----|----------|
| `id` | string | ID поста |

**Response**:
```json
{
  "post": {
    "id": "string",
    "creatorId": "string",
    "title": "string",
    "content": "string",
    "type": "string",
    "mediaUrl": "string",
    "isLocked": "boolean",
    "isPremium": "boolean",
    "price": "number",
    "likesCount": "number",
    "commentsCount": "number",
    "viewsCount": "number",
    "createdAt": "string",
    "creator": {
      "id": "string",
      "nickname": "string",
      "avatar": "string",
      "isVerified": "boolean"
    }
  }
}
```

#### **POST /api/posts/[id]/like**
**Описание**: Лайк/анлайк поста

**Path Parameters**:
| Параметр | Тип | Описание |
|----------|-----|----------|
| `id` | string | ID поста |

**Request Body**:
```json
{
  "userId": "string"
}
```

**Response**:
```json
{
  "success": "boolean",
  "liked": "boolean",
  "likesCount": "number"
}
```

#### **POST /api/posts/[id]/buy**
**Описание**: Покупка поста

**Path Parameters**:
| Параметр | Тип | Описание |
|----------|-----|----------|
| `id` | string | ID поста |

**Request Body**:
```json
{
  "userId": "string",
  "txSignature": "string"
}
```

**Response**:
```json
{
  "success": "boolean",
  "purchase": {
    "id": "string",
    "postId": "string",
    "userId": "string",
    "price": "number",
    "purchasedAt": "string"
  }
}
```

---

### **2. Creators API**

#### **GET /api/creators**
**Описание**: Получение списка создателей

**Response**:
```json
{
  "creators": [
    {
      "id": "string",
      "wallet": "string",
      "nickname": "string",
      "fullName": "string",
      "bio": "string",
      "avatar": "string",
      "backgroundImage": "string",
      "postsCount": "number",
      "followersCount": "number",
      "createdAt": "string",
      "isVerified": "boolean",
      "website": "string",
      "twitter": "string",
      "telegram": "string",
      "location": "string"
    }
  ],
  "totalCount": "number"
}
```

#### **GET /api/creators/[id]**
**Описание**: Получение информации о конкретном создателе

**Path Parameters**:
| Параметр | Тип | Описание |
|----------|-----|----------|
| `id` | string | ID создателя |

**Response**:
```json
{
  "creator": {
    "id": "string",
    "wallet": "string",
    "nickname": "string",
    "fullName": "string",
    "bio": "string",
    "avatar": "string",
    "backgroundImage": "string",
    "postsCount": "number",
    "followersCount": "number",
    "followingCount": "number",
    "createdAt": "string",
    "isVerified": "boolean",
    "website": "string",
    "twitter": "string",
    "telegram": "string",
    "location": "string"
  }
}
```

#### **GET /api/creators/analytics**
**Описание**: Получение аналитики создателя

**Query Parameters**:
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `creatorId` | string | Да | ID создателя |

**Response**:
```json
{
  "analytics": {
    "totalPosts": "number",
    "totalLikes": "number",
    "totalComments": "number",
    "totalViews": "number",
    "totalEarnings": "number",
    "subscribersCount": "number",
    "postsThisMonth": "number",
    "earningsThisMonth": "number"
  }
}
```

---

### **3. Conversations API**

#### **GET /api/conversations**
**Описание**: Получение списка диалогов пользователя

**Headers**:
```http
Authorization: Bearer <jwt_token>
```

**Response**:
```json
{
  "conversations": [
    {
      "id": "string",
      "fromUserId": "string",
      "toUserId": "string",
      "lastMessageAt": "string",
      "createdAt": "string",
      "fromUser": {
        "id": "string",
        "nickname": "string",
        "avatar": "string"
      },
      "toUser": {
        "id": "string",
        "nickname": "string",
        "avatar": "string"
      },
      "lastMessage": {
        "id": "string",
        "content": "string",
        "createdAt": "string",
        "senderId": "string"
      }
    }
  ]
}
```

#### **POST /api/conversations**
**Описание**: Создание нового диалога

**Headers**:
```http
Authorization: Bearer <jwt_token>
```

**Request Body**:
```json
{
  "toUserId": "string"
}
```

**Response**:
```json
{
  "success": "boolean",
  "conversation": {
    "id": "string",
    "fromUserId": "string",
    "toUserId": "string",
    "createdAt": "string"
  }
}
```

#### **GET /api/conversations/[id]/messages**
**Описание**: Получение сообщений диалога

**Path Parameters**:
| Параметр | Тип | Описание |
|----------|-----|----------|
| `id` | string | ID диалога |

**Query Parameters**:
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `page` | number | Нет | Номер страницы |
| `limit` | number | Нет | Количество сообщений |

**Response**:
```json
{
  "messages": [
    {
      "id": "string",
      "conversationId": "string",
      "senderId": "string",
      "content": "string",
      "mediaUrl": "string",
      "mediaType": "string",
      "isPaid": "boolean",
      "price": "number",
      "isRead": "boolean",
      "createdAt": "string",
      "sender": {
        "id": "string",
        "nickname": "string",
        "avatar": "string"
      }
    }
  ],
  "hasMore": "boolean"
}
```

#### **POST /api/conversations/[id]/messages**
**Описание**: Отправка сообщения в диалог

**Path Parameters**:
| Параметр | Тип | Описание |
|----------|-----|----------|
| `id` | string | ID диалога |

**Request Body**:
```json
{
  "content": "string",
  "mediaUrl": "string",
  "mediaType": "string",
  "isPaid": "boolean",
  "price": "number"
}
```

**Response**:
```json
{
  "success": "boolean",
  "message": {
    "id": "string",
    "conversationId": "string",
    "senderId": "string",
    "content": "string",
    "createdAt": "string"
  }
}
```

---

### **4. Subscriptions API**

#### **GET /api/subscriptions**
**Описание**: Получение подписок пользователя

**Query Parameters**:
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `userId` | string | Да | ID пользователя |

**Response**:
```json
{
  "subscriptions": [
    {
      "id": "string",
      "userId": "string",
      "creatorId": "string",
      "plan": "string",
      "price": "number",
      "currency": "string",
      "subscribedAt": "string",
      "validUntil": "string",
      "isActive": "boolean",
      "paymentStatus": "string",
      "creator": {
        "id": "string",
        "nickname": "string",
        "avatar": "string"
      }
    }
  ]
}
```

#### **POST /api/subscriptions**
**Описание**: Создание новой подписки

**Request Body**:
```json
{
  "userId": "string",
  "creatorId": "string",
  "plan": "string",
  "price": "number",
  "currency": "string",
  "validUntil": "string",
  "txSignature": "string"
}
```

**Response**:
```json
{
  "success": "boolean",
  "subscription": {
    "id": "string",
    "userId": "string",
    "creatorId": "string",
    "plan": "string",
    "price": "number",
    "subscribedAt": "string",
    "validUntil": "string",
    "isActive": "boolean"
  }
}
```

#### **GET /api/subscriptions/check**
**Описание**: Проверка статуса подписки

**Query Parameters**:
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `userId` | string | Да | ID пользователя |
| `creatorId` | string | Да | ID создателя |

**Response**:
```json
{
  "hasActiveSubscription": "boolean",
  "subscription": {
    "id": "string",
    "plan": "string",
    "validUntil": "string",
    "isActive": "boolean"
  }
}
```

---

### **5. Follow API**

#### **GET /api/follow**
**Описание**: Получение подписок пользователя

**Query Parameters**:
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `userId` | string | Да | ID пользователя |

**Response**:
```json
{
  "follows": [
    {
      "id": "string",
      "followerId": "string",
      "followingId": "string",
      "createdAt": "string",
      "following": {
        "id": "string",
        "nickname": "string",
        "avatar": "string",
        "isVerified": "boolean"
      }
    }
  ]
}
```

#### **POST /api/follow**
**Описание**: Подписка/отписка от пользователя

**Request Body**:
```json
{
  "followerId": "string",
  "followingId": "string",
  "action": "follow" | "unfollow"
}
```

**Response**:
```json
{
  "success": "boolean",
  "action": "follow" | "unfollow",
  "followersCount": "number"
}
```

---

### **6. User API**

#### **GET /api/user**
**Описание**: Получение информации о пользователе

**Query Parameters**:
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `wallet` | string | Да | Кошелек пользователя |

**Response**:
```json
{
  "user": {
    "id": "string",
    "wallet": "string",
    "nickname": "string",
    "fullName": "string",
    "bio": "string",
    "avatar": "string",
    "backgroundImage": "string",
    "website": "string",
    "twitter": "string",
    "telegram": "string",
    "location": "string",
    "createdAt": "string",
    "isVerified": "boolean",
    "isCreator": "boolean",
    "followersCount": "number",
    "followingCount": "number",
    "postsCount": "number"
  }
}
```

#### **PUT /api/user**
**Описание**: Обновление информации о пользователе

**Request Body**:
```json
{
  "nickname": "string",
  "fullName": "string",
  "bio": "string",
  "website": "string",
  "twitter": "string",
  "telegram": "string",
  "location": "string"
}
```

**Response**:
```json
{
  "success": "boolean",
  "user": {
    "id": "string",
    "nickname": "string",
    "fullName": "string",
    "bio": "string",
    "updatedAt": "string"
  }
}
```

#### **GET /api/user/notifications**
**Описание**: Получение уведомлений пользователя

**Query Parameters**:
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `userId` | string | Да | ID пользователя |
| `page` | number | Нет | Номер страницы |
| `limit` | number | Нет | Количество уведомлений |

**Response**:
```json
{
  "notifications": [
    {
      "id": "string",
      "userId": "string",
      "type": "string",
      "title": "string",
      "message": "string",
      "isRead": "boolean",
      "metadata": "object",
      "createdAt": "string"
    }
  ],
  "hasMore": "boolean"
}
```

---

## 📱 Mobile API Endpoints

### **1. Mobile Conversations**

#### **GET /api/conversations/mobile**
**Описание**: Мобильная версия API диалогов

**Headers**:
```http
Authorization: Bearer <jwt_token>
```

**Response**:
```json
{
  "conversations": [
    {
      "id": "string",
      "fromUserId": "string",
      "toUserId": "string",
      "lastMessageAt": "string",
      "fromUser": {
        "id": "string",
        "nickname": "string",
        "avatar": "string"
      },
      "toUser": {
        "id": "string",
        "nickname": "string",
        "avatar": "string"
      }
    }
  ]
}
```

#### **GET /api/conversations/[id]/messages/mobile**
**Описание**: Мобильная версия API сообщений

**Path Parameters**:
| Параметр | Тип | Описание |
|----------|-----|----------|
| `id` | string | ID диалога |

**Response**:
```json
{
  "messages": [
    {
      "id": "string",
      "senderId": "string",
      "content": "string",
      "mediaUrl": "string",
      "isPaid": "boolean",
      "price": "number",
      "isRead": "boolean",
      "createdAt": "string"
    }
  ]
}
```

### **2. Mobile Follow**

#### **GET /api/follow/mobile**
**Описание**: Мобильная версия API подписок

**Query Parameters**:
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `userId` | string | Да | ID пользователя |

**Response**:
```json
{
  "follows": [
    {
      "id": "string",
      "followingId": "string",
      "createdAt": "string",
      "following": {
        "id": "string",
        "nickname": "string",
        "avatar": "string"
      }
    }
  ]
}
```

#### **GET /api/follow/mobile/all**
**Описание**: Получение всех подписок пользователя

**Query Parameters**:
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `userId` | string | Да | ID пользователя |

**Response**:
```json
{
  "follows": [
    {
      "id": "string",
      "followingId": "string",
      "createdAt": "string",
      "following": {
        "id": "string",
        "nickname": "string",
        "avatar": "string",
        "isVerified": "boolean",
        "followersCount": "number"
      }
    }
  ]
}
```

### **3. Mobile Subscriptions**

#### **GET /api/subscriptions/mobile**
**Описание**: Мобильная версия API подписок

**Query Parameters**:
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `userId` | string | Да | ID пользователя |

**Response**:
```json
{
  "subscriptions": [
    {
      "id": "string",
      "creatorId": "string",
      "plan": "string",
      "price": "number",
      "subscribedAt": "string",
      "validUntil": "string",
      "isActive": "boolean",
      "creator": {
        "id": "string",
        "nickname": "string",
        "avatar": "string"
      }
    }
  ]
}
```

### **4. Mobile Tips**

#### **POST /api/tips/mobile**
**Описание**: Отправка чаевых (мобильная версия)

**Request Body**:
```json
{
  "userId": "string",
  "creatorId": "string",
  "amount": "number",
  "currency": "string",
  "txSignature": "string"
}
```

**Response**:
```json
{
  "success": "boolean",
  "tip": {
    "id": "string",
    "userId": "string",
    "creatorId": "string",
    "amount": "number",
    "createdAt": "string"
  }
}
```

### **5. Mobile Post Purchase**

#### **POST /api/posts/[id]/buy/mobile**
**Описание**: Покупка поста (мобильная версия)

**Path Parameters**:
| Параметр | Тип | Описание |
|----------|-----|----------|
| `id` | string | ID поста |

**Request Body**:
```json
{
  "userId": "string",
  "txSignature": "string"
}
```

**Response**:
```json
{
  "success": "boolean",
  "purchase": {
    "id": "string",
    "postId": "string",
    "userId": "string",
    "price": "number",
    "purchasedAt": "string"
  }
}
```

---

## 🔧 Utility API Endpoints

### **1. Upload API**

#### **POST /api/upload**
**Описание**: Загрузка файлов

**Request Body**:
```form-data
file: File
type: string
```

**Response**:
```json
{
  "success": "boolean",
  "url": "string",
  "filename": "string"
}
```

#### **POST /api/upload/avatar**
**Описание**: Загрузка аватара

**Request Body**:
```form-data
file: File
userId: string
```

**Response**:
```json
{
  "success": "boolean",
  "avatarUrl": "string"
}
```

#### **POST /api/upload/background**
**Описание**: Загрузка фонового изображения

**Request Body**:
```form-data
file: File
userId: string
```

**Response**:
```json
{
  "success": "boolean",
  "backgroundUrl": "string"
}
```

### **2. Search API**

#### **GET /api/search**
**Описание**: Поиск по постам и пользователям

**Query Parameters**:
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `q` | string | Да | Поисковый запрос |
| `type` | string | Нет | Тип поиска (posts, users) |
| `page` | number | Нет | Номер страницы |

**Response**:
```json
{
  "results": [
    {
      "id": "string",
      "type": "post" | "user",
      "title": "string",
      "content": "string",
      "nickname": "string",
      "avatar": "string"
    }
  ],
  "totalCount": "number",
  "hasMore": "boolean"
}
```

#### **GET /api/search/autocomplete**
**Описание**: Автодополнение поиска

**Query Parameters**:
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `q` | string | Да | Поисковый запрос |

**Response**:
```json
{
  "suggestions": [
    {
      "id": "string",
      "text": "string",
      "type": "post" | "user"
    }
  ]
}
```

---

## 🔐 Admin API Endpoints

### **1. Admin Users**

#### **GET /api/admin/users**
**Описание**: Получение списка пользователей (админ)

**Headers**:
```http
Authorization: Bearer <admin_jwt_token>
```

**Response**:
```json
{
  "users": [
    {
      "id": "string",
      "wallet": "string",
      "nickname": "string",
      "email": "string",
      "createdAt": "string",
      "isVerified": "boolean",
      "isCreator": "boolean",
      "postsCount": "number",
      "followersCount": "number"
    }
  ],
  "totalCount": "number"
}
```

### **2. Admin Update Referrer**

#### **POST /api/admin/update-referrer**
**Описание**: Обновление реферера пользователя

**Request Body**:
```json
{
  "userId": "string",
  "referrerId": "string"
}
```

**Response**:
```json
{
  "success": "boolean",
  "message": "string"
}
```

---

## 🔗 Webhook Endpoints

### **1. OpenAI Webhook**

#### **POST /api/webhooks/openai**
**Описание**: Webhook для обработки результатов OpenAI

**Request Body**:
```json
{
  "requestId": "string",
  "status": "completed" | "failed",
  "result": "object",
  "error": "string"
}
```

**Response**:
```json
{
  "success": "boolean",
  "message": "string"
}
```

---

## 📊 Error Responses

### **Standard Error Format**
```json
{
  "error": "string",
  "message": "string",
  "details": "string",
  "code": "string"
}
```

### **HTTP Status Codes**
- **200**: Success
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **409**: Conflict
- **422**: Unprocessable Entity
- **500**: Internal Server Error

### **Common Error Codes**
- **INVALID_TOKEN**: Неверный JWT токен
- **USER_NOT_FOUND**: Пользователь не найден
- **POST_NOT_FOUND**: Пост не найден
- **INSUFFICIENT_PERMISSIONS**: Недостаточно прав
- **VALIDATION_ERROR**: Ошибка валидации
- **PAYMENT_FAILED**: Ошибка платежа

---

## 🔄 Rate Limiting

### **Rate Limits**
- **General API**: 100 requests/minute per IP
- **Upload API**: 10 requests/minute per user
- **Search API**: 50 requests/minute per user
- **Admin API**: 20 requests/minute per admin

### **Rate Limit Headers**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## 📈 API Versioning

### **Version Strategy**
- **Current Version**: v1.0
- **Version Header**: `API-Version: v1.0`
- **Backward Compatibility**: Maintained for 6 months
- **Deprecation Notice**: 3 months advance notice

### **Version Endpoints**
- **GET /api/version**: Получение версии API
- **Response**: `{"version": "1.0.0", "build": "2025.10.21"}`

---

<div align="center">
  <strong>🔌 API Schema завершен!</strong><br>
  <em>Полная схема всех API endpoints</em>
</div>
