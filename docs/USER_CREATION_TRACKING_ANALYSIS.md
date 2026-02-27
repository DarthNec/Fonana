# 📊 АНАЛИЗ: Места создания пользователей в Fonana

**Дата**: 19.02.2026  
**Цель**: Определить все точки создания пользователей для интеграции UTM tracking + Metrics + Telegram уведомлений

---

## 🎯 НАЙДЕНО 6 ОСНОВНЫХ ТОЧЕК СОЗДАНИЯ ПОЛЬЗОВАТЕЛЕЙ

---

### **1. ✅ GUEST AUTH (Гостевые пользователи)**
**Файл**: `app/api/auth/guest/route.ts`  
**Метод**: `POST`  
**Линии**: 233-244

#### **Текущая реализация**:
```typescript
// 7. Создаем пользователя в БД
const user = await prisma.user.create({
  data: {
    telegramId: deviceId,
    nickname: nickname,
    fullName: `Guest ${nickname}`,
    avatar: avatarUrl,
    wallet: fakeWallet, // FK_...
    solanaWallet: null,
    isCreator: true,
    isVerified: false,
  }
})
```

#### **Что уже есть**:
- ✅ **IP extraction** (line 96-100)
- ✅ **Geolocation** (lines 253-268)
- ✅ **Telegram notification** (lines 270-288)
- ✅ **Metrics save** (lines 313-334)

#### **Статус**: 🟢 **УЖЕ ГОТОВО!**

**Что нужно добавить**:
- ⏳ Получить `source` и `campaign` из localStorage
- ⏳ Передать в `prisma.metrics.create()` вместо `null`
- ⏳ Добавить в Telegram уведомление

---

### **2. ⚠️ WALLET AUTH (Подключение кошелька Solana)**
**Файл**: `app/api/user/route.ts`  
**Метод**: `POST`  
**Линии**: 719-724

#### **Текущая реализация**:
```typescript
const newUser = await createOrUpdateUser(wallet, {
  nickname: uniqueUsername,
  fullName: uniqueUsername,
  bio: undefined,
  avatar: avatarUrl
}, referrerNickname)
```

**Что использует**: `lib/db.ts` → `createOrUpdateUser()` (lines 90-97):
```typescript
return await prisma.user.create({
  data: {
    wallet,
    isCreator: true,
    referrerId,
    ...data,
  }
})
```

#### **Что есть**:
- ❌ Нет IP extraction
- ❌ Нет Geolocation
- ❌ Нет Telegram notification
- ❌ Нет Metrics save
- ✅ Referral tracking (есть)

#### **Статус**: 🔴 **ТРЕБУЕТ ДОРАБОТКИ**

**Что нужно добавить**:
1. IP extraction (`request.headers`)
2. Geolocation API call
3. Telegram notification (как в guest)
4. Metrics save (`prisma.metrics.create`)
5. UTM source/campaign из localStorage (через body)

---

### **3. ⚠️ TOKEN API (Fallback создание)**
**Файл**: `app/api/auth/token/route.ts`  
**Метод**: `GET` (lines 555-574) и `POST` (lines 228-240)

#### **GET method** (lines 555-574):
```typescript
user = await prisma.user.create({
  data: {
    wallet: wallet!,
    nickname: uniqueUsername,
    referalCount: 0,
    fullName: uniqueUsername,
    name: uniqueUsername,
    solanaWallet: wallet!,
    avatar: avatarUrl
  }
})
```

#### **POST method** (lines 228-240):
```typescript
user = await prisma.user.create({
  data: {
    wallet,
    nickname: `user_${wallet.slice(0, 8).toLowerCase()}`,
    solanaWallet: wallet
  }
})
```

#### **Что есть**:
- ❌ Нет IP extraction
- ❌ Нет Geolocation  
- ✅ Telegram notification (POST only, lines 242-250)
- ❌ Нет Metrics save
- ✅ Avatar assignment (GET only)

#### **Статус**: 🔴 **ТРЕБУЕТ ДОРАБОТКИ**

**Особенности**:
- GET method более полный (avatar, fullName)
- POST method минимальный (только wallet, nickname)
- Telegram уведомление ТОЛЬКО в POST

**Что нужно добавить**:
1. IP extraction в обоих методах
2. Geolocation API call
3. Telegram notification в GET method
4. Metrics save в обоих методах
5. UTM source/campaign

---

### **4. ✅ TELEGRAM AUTH**
**Файл**: `app/api/auth/telegram/route.ts`  
**Метод**: `POST`  
**Линии**: 164-175

#### **Текущая реализация**:
```typescript
user = await prisma.user.create({
  data: {
    telegramId: authData.id.toString(),
    nickname: nickname,
    fullName: `${authData.first_name} ${authData.last_name || ''}`.trim(),
    avatar: authData.photo_url || avatarUrl,
    wallet: fakeWallet, // TG_...
    solanaWallet: null,
    isCreator: true,
    isVerified: false,
  }
})
```

#### **Что есть**:
- ❌ Нет IP extraction
- ❌ Нет Geolocation
- ✅ Telegram notification (lines 183-198)
- ❌ Нет Metrics save
- ✅ Avatar (Telegram photo_url или CDN)

#### **Статус**: 🟡 **ЧАСТИЧНО ГОТОВО**

**Что нужно добавить**:
1. IP extraction
2. Geolocation API call
3. Metrics save
4. UTM source/campaign
5. Добавить location в Telegram уведомление

---

### **5. 🔵 PAYMENT PROCESSING (Создание при покупке)**
**Файл**: `app/api/posts/process-payment/route.ts`  
**Метод**: `POST`  
**Линии**: 122-132

#### **Текущая реализация**:
```typescript
user = await prisma.user.create({
  data: {
    solanaWallet: userId,
    wallet: userId,
    name: fullName,
    nickname,
    fullName,
    bio,
    isCreator: true
  }
})
```

#### **Что есть**:
- ❌ Нет IP extraction
- ❌ Нет Geolocation
- ❌ Нет Telegram notification
- ❌ Нет Metrics save
- ❌ Нет Avatar assignment

#### **Статус**: 🔴 **МИНИМАЛЬНАЯ РЕАЛИЗАЦИЯ**

**Особенности**:
- Создаётся автоматически при оплате поста
- Генерируется случайный nickname (generateRandomNickname)
- Используется только если пользователь НЕ найден

**Что нужно добавить**:
1. IP extraction
2. Geolocation
3. Telegram notification
4. Metrics save
5. Avatar assignment (`getNextAvatar()`)
6. UTM tracking

---

### **6. 🔵 SUBSCRIPTION PAYMENT (Аналогично payment)**
**Файл**: `app/api/subscriptions/process-payment/route.ts`  
**Метод**: `POST`

**Статус**: Не проверен подробно, но вероятно такая же логика как в `process-payment/route.ts`

---

## 📊 СРАВНИТЕЛЬНАЯ ТАБЛИЦА

| Точка создания | IP | Geo | Telegram | Metrics | Avatar | UTM | Статус |
|----------------|-----|-----|----------|---------|--------|-----|--------|
| **Guest Auth** | ✅ | ✅ | ✅ | ✅ | ✅ | ⏳ | 🟢 90% |
| **Wallet (POST)** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | 🔴 20% |
| **Token API (GET)** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | 🔴 20% |
| **Token API (POST)** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | 🔴 30% |
| **Telegram Auth** | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | 🟡 40% |
| **Payment Processing** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🔴 0% |

---

## 🎯 ПЛАН ДОРАБОТКИ

### **Priority 1: Критические точки входа**

#### **1.1 Wallet Auth (`app/api/user/route.ts` POST)**
**Важность**: 🔴 CRITICAL  
**Причина**: Основной способ входа через Solana кошелёк

**Что добавить**:
```typescript
// После создания user:
// 1. IP extraction
const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'

// 2. Geolocation
const location = await getLocationFromIP(ip)

// 3. UTM tracking (из body)
const source = body.source || 'None'
const campaign = body.campaign || 'None'

// 4. Metrics save
await prisma.metrics.create({
  data: {
    userId: newUser.id,
    nickname: newUser.nickname,
    deviceId: null,  // Wallet users don't have deviceId
    wallet: wallet,
    location: location,
    ip: ip,
    source: source,
    userAgent: request.headers.get('user-agent') || undefined,
  }
})

// 5. Telegram notification
const notificationMessage = 
  `💳 <b>Новый пользователь через Wallet!</b>\n` +
  `👤 Ник: <b>${newUser.nickname}</b>\n` +
  `💳 Wallet: <code>${wallet.slice(0, 8)}...${wallet.slice(-6)}</code>\n` +
  `📍 Локация: ${location}\n` +
  `🌐 IP: <code>${ip}</code>\n` +
  `🏷️ Source: ${source}\n` +
  `📅 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`

await sendTelegramNotification(notificationMessage)
```

---

#### **1.2 Token API (`app/api/auth/token/route.ts` GET + POST)**
**Важность**: 🟡 MEDIUM  
**Причина**: Fallback метод, используется редко

**Что добавить**: То же самое что в Wallet Auth

---

#### **1.3 Telegram Auth (`app/api/auth/telegram/route.ts`)**
**Важность**: 🟡 MEDIUM  
**Причина**: Вход через Telegram

**Что добавить**:
- IP extraction
- Geolocation
- Metrics save
- UTM tracking
- Обновить Telegram notification (добавить location, source)

---

### **Priority 2: Edge cases**

#### **2.1 Payment Processing (`app/api/posts/process-payment/route.ts`)**
**Важность**: 🔵 LOW  
**Причина**: Редкий случай (пользователь покупает пост без регистрации)

**Что добавить**: Полный tracking как в Wallet Auth

---

## 🔧 ТЕХНИЧЕСКИЕ ДЕТАЛИ

### **Общая функция для переиспользования**

Создать утилиту: `lib/utils/userTracking.ts`

```typescript
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

interface TrackingData {
  userId: string
  nickname: string
  deviceId?: string | null
  wallet: string
  request: NextRequest
  source?: string
  campaign?: string
}

export async function trackUserCreation(data: TrackingData) {
  try {
    // 1. IP extraction
    const ip = data.request.headers.get('x-forwarded-for')?.split(',')[0] 
      || data.request.headers.get('x-real-ip') 
      || 'unknown'
    
    // 2. Geolocation (с timeout)
    let location = '🌍 Unknown'
    try {
      const locationPromise = getLocationFromIP(ip)
      const timeoutPromise = new Promise<string>((resolve) => 
        setTimeout(() => resolve('🌍 Unknown (timeout)'), 3000)
      )
      location = await Promise.race([locationPromise, timeoutPromise])
    } catch (error) {
      console.error('[UserTracking] Geolocation failed:', error)
      location = '🌍 Unknown (error)'
    }
    
    // 3. Source & Campaign
    const source = data.source || 'None'
    const campaign = data.campaign || 'None'
    const sourceString = campaign !== 'None' 
      ? `${source}|campaign:${campaign}` 
      : source
    
    // 4. User Agent
    const userAgent = data.request.headers.get('user-agent') || undefined
    
    // 5. Save Metrics
    await prisma.metrics.create({
      data: {
        userId: data.userId,
        nickname: data.nickname,
        deviceId: data.deviceId || null,
        wallet: data.wallet,
        location: location,
        ip: ip,
        source: sourceString,
        userAgent: userAgent,
      }
    })
    
    console.log('[UserTracking] ✅ Metrics saved successfully')
    
    // 6. Return data for Telegram notification
    return {
      location,
      ip,
      source,
      campaign,
      userAgent
    }
    
  } catch (error) {
    console.error('[UserTracking] ⚠️ Failed to track user:', error)
    // Не бросаем exception - не блокируем создание пользователя
    return {
      location: '🌍 Unknown',
      ip: 'unknown',
      source: 'None',
      campaign: 'None',
      userAgent: undefined
    }
  }
}
```

### **Использование**:

```typescript
// В любом API роуте после создания user:
const trackingData = await trackUserCreation({
  userId: user.id,
  nickname: user.nickname,
  deviceId: deviceId,  // Опционально
  wallet: user.wallet,
  request: request,
  source: body.source,      // Из body
  campaign: body.campaign,  // Из body
})

// Затем отправить Telegram notification с trackingData
const notificationMessage = 
  `👤 <b>Новый пользователь!</b>\n` +
  `👤 Ник: <b>${user.nickname}</b>\n` +
  `💳 Wallet: <code>${user.wallet}</code>\n` +
  `📍 Локация: ${trackingData.location}\n` +
  `🌐 IP: <code>${trackingData.ip}</code>\n` +
  `🏷️ Source: ${trackingData.source}\n` +
  `📅 ${new Date().toLocaleString('ru-RU')}`

await sendTelegramNotification(notificationMessage)
```

---

## 📋 CHECKLIST ДЛЯ КАЖДОГО РОУТА

При добавлении tracking в роут, проверь:

- [ ] IP extraction (`x-forwarded-for`, `x-real-ip`)
- [ ] Geolocation call (с timeout 3 сек)
- [ ] UTM source & campaign (из body)
- [ ] User Agent extraction
- [ ] Metrics save (`prisma.metrics.create`)
- [ ] Telegram notification (с location, IP, source)
- [ ] Try-catch обёртка (не блокировать создание user)
- [ ] Console logging для debugging

---

## 🎯 РЕКОМЕНДАЦИИ

### **1. Приоритизация**:
1. ✅ **Guest Auth** — уже готово, только добавить UTM
2. 🔴 **Wallet Auth (POST)** — критично, основной flow
3. 🟡 **Telegram Auth** — средний приоритет
4. 🟡 **Token API** — низкий приоритет (fallback)
5. 🔵 **Payment Processing** — edge case

### **2. Централизация**:
- Создать `lib/utils/userTracking.ts` для переиспользования
- Вынести `getLocationFromIP` в отдельную утилиту
- Вынести `sendTelegramNotification` template в утилиту

### **3. Frontend интеграция**:
- В body POST запросов добавить:
  ```typescript
  {
    ...existingData,
    source: localStorage.getItem('fonana_source') || 'None',
    campaign: localStorage.getItem('fonana_campaign') || 'None',
  }
  ```

### **4. Testing**:
- Протестировать каждый роут отдельно
- Проверить что metrics сохраняются
- Проверить что Telegram уведомления приходят
- Проверить что пользователь создаётся даже если tracking упал

---

## ✅ SUMMARY

**Найдено**: 6 точек создания пользователей  
**Готово**: 1 (Guest Auth — 90%)  
**Требует доработки**: 5

**Критические**:
1. Wallet Auth POST (основной flow)
2. Telegram Auth
3. Token API GET/POST

**Некритические**:
4. Payment Processing (edge case)
5. Subscription Payment (edge case)

**Рекомендация**: 
1. Создать `lib/utils/userTracking.ts` (универсальная функция)
2. Добавить tracking в Wallet Auth POST (Priority 1)
3. Добавить tracking в Telegram Auth (Priority 2)
4. Доработать Guest Auth (добавить UTM) (Priority 3)
5. Остальные — по возможности

**Time Estimate**:
- Утилита `userTracking.ts`: 1 час
- Wallet Auth: 30 минут
- Telegram Auth: 30 минут
- Guest Auth (UTM): 15 минут
- Token API: 30 минут
- Payment Processing: 30 минут
- **Total**: ~3-4 часа

---

**Status**: ✅ Анализ завершён  
**Next Step**: Создание `lib/utils/userTracking.ts` и интеграция

