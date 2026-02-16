## 📋 Содержание

1. [Общая схема работы](#общая-схема-работы)
2. [API Endpoint](#api-endpoint)
3. [Детальная последовательность действий](#детальная-последовательность-действий)
4. [LocalStorage / AsyncStorage данные](#localstorage--asyncstorage-данные)
5. [Код для React Native](#код-для-react-native)
6. [Обработка ошибок](#обработка-ошибок)
7. [Важные нюансы](#важные-нюансы)

---

## 🎯 Общая схема работы

### Цель
Создать гостевого пользователя без регистрации, с автоматическим сохранением сессии на устройстве для повторного входа.

### Принцип
1. **Первый вход**: Клиент **не отправляет** `deviceId` → Сервер создаёт нового пользователя
2. **Повторный вход**: Клиент **отправляет** `deviceId` → Сервер находит существующего пользователя

### Блок-схема

```
┌─────────────────────────────────────┐
│  User clicks "Continue as Guest"   │
└───────────┬─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│  Check AsyncStorage for deviceId    │
└───────────┬─────────────────────────┘
            │
       ┌────┴────┐
       │ Found?  │
       └────┬────┘
            │
   ┌────────┴────────┐
   │ YES             │ NO
   │                 │
   ▼                 ▼
┌─────────────┐   ┌─────────────┐
│ Send POST   │   │ Send POST   │
│ with        │   │ without     │
│ deviceId    │   │ deviceId    │
└──────┬──────┘   └──────┬──────┘
       │                 │
       └────────┬────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  Backend creates/finds user         │
│  Returns: token, deviceId, user     │
└───────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  Save to AsyncStorage:              │
│  - deviceId                         │
│  - fake_wallet                      │
│  - jwt_token                        │
│  - user_data                        │
└───────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  Navigate to main app               │
└─────────────────────────────────────┘
```

---

## 🔌 API Endpoint

### POST `/api/auth/guest`

**URL**: `https://your-server.com/api/auth/guest`  
**Method**: `POST`  
**Content-Type**: `application/json`

### Request Body

```typescript
{
  deviceId?: string  // Опционально! Отправляй если есть
}
```

**Примеры**:

**Первый вход (нет deviceId)**:
```json
{}
```
или
```json
{
  "deviceId": null
}
```

**Повторный вход (есть deviceId)**:
```json
{
  "deviceId": "device_a1b2c3d4e5f6..."
}
```

---

### Response Body

#### Success Response (200 OK)

```typescript
{
  success: boolean,           // true
  token: string,              // JWT токен (сохрани!)
  isGuest: boolean,           // true (маркер гостевого аккаунта)
  deviceId: string,           // Уникальный ID устройства (сохрани!)
  isNewUser: boolean,         // true = новый, false = возвращающийся
  user: {
    id: string,               // UUID пользователя
    nickname: string,         // Сгенерированный ник (HappyFox123)
    fullName: string,         // "Guest HappyFox123"
    avatar: string | null,    // null для гостей
    wallet: string            // FK_... адрес (сохрани!)
  }
}
```

**Пример ответа (новый пользователь)**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "isGuest": true,
  "deviceId": "device_a1b2c3d4e5f6789012345678",
  "isNewUser": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nickname": "HappyFox123",
    "fullName": "Guest HappyFox123",
    "avatar": null,
    "wallet": "FK_3kR8mN9vL2pQ5tY7uZ1wX4cB6dF"
  }
}
```

**Пример ответа (вернувшийся пользователь)**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "isGuest": true,
  "deviceId": "device_a1b2c3d4e5f6789012345678",
  "isNewUser": false,  // ← false!
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nickname": "HappyFox123",
    "fullName": "Guest HappyFox123",
    "avatar": null,
    "wallet": "FK_3kR8mN9vL2pQ5tY7uZ1wX4cB6dF"
  }
}
```

---

#### Error Response (500)

```json
{
  "success": false,
  "error": "Guest authentication failed",
  "details": "Error message here"
}
```

---

## 📝 Детальная последовательность действий

### ШАГ 1: Проверка deviceId в хранилище

```typescript
// React Native
import AsyncStorage from '@react-native-async-storage/async-storage';

let deviceId = await AsyncStorage.getItem('fonana_device_id');

console.log('[GUEST AUTH] Step 1: Check deviceId', deviceId ? 'Found' : 'Not found');
```

---

### ШАГ 2: Отправка запроса на сервер

```typescript
const response = await fetch('https://your-server.com/api/auth/guest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    deviceId: deviceId || undefined  // Отправь только если есть
  })
});

const data = await response.json();

if (!response.ok || !data.success) {
  throw new Error(data.error || 'Authentication failed');
}

console.log('[GUEST AUTH] Step 2: Server response', {
  isNewUser: data.isNewUser,
  nickname: data.user.nickname,
  deviceId: data.deviceId
});
```

---

### ШАГ 3: Сохранение данных в AsyncStorage

**КРИТИЧНО**: Сохрани все эти данные!

```typescript
// 1. Device ID (для повторного входа)
await AsyncStorage.setItem('fonana_device_id', data.deviceId);

// 2. Fake Wallet (идентификатор пользователя)
await AsyncStorage.setItem('fonana_user_wallet', data.user.wallet);

// 3. Маркер гостевой авторизации
await AsyncStorage.setItem('fonana_guest_auth', 'true');

// 4. JWT Token (для API запросов)
await AsyncStorage.setItem('fonana_jwt_token', JSON.stringify({
  token: data.token,
  expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 дней
  userId: data.user.id,
  wallet: data.user.wallet
}));

// 5. Данные пользователя
await AsyncStorage.setItem('fonana_user_data', JSON.stringify(data.user));

// 6. Флаг нового пользователя (для onboarding)
if (data.isNewUser) {
  await AsyncStorage.setItem('fonana_is_new_user', 'true');
} else {
  await AsyncStorage.removeItem('fonana_is_new_user');
}

console.log('[GUEST AUTH] Step 3: All data saved to AsyncStorage');
```

---

### ШАГ 4: Получение полных данных пользователя

```typescript
const userResponse = await fetch(
  `https://your-server.com/api/auth/token?wallet=${data.user.wallet}`
);

if (!userResponse.ok) {
  throw new Error('Failed to fetch user data');
}

const userData = await userResponse.json();

if (!userData.user) {
  throw new Error('No user data in response');
}

console.log('[GUEST AUTH] Step 4: Full user data fetched', {
  userId: userData.user.id,
  nickname: userData.user.nickname,
  isCreator: userData.user.isCreator
});
```

---

### ШАГ 5: Сохранение в глобальный стейт

```typescript
// Пример для Redux/Zustand/Context
dispatch(setUser(userData.user));

// Или в Context
setUser(userData.user);

console.log('[GUEST AUTH] Step 5: User saved to global state');
```

---

### ШАГ 6: Показ уведомления

```typescript
const welcomeMessage = data.isNewUser
  ? `Welcome, ${data.user.nickname}! 🎉`
  : `Welcome back, ${data.user.nickname}! 👋`;

// React Native Toast
Toast.show({
  type: 'success',
  text1: welcomeMessage,
  position: 'top',
  visibilityTime: 3000
});

console.log('[GUEST AUTH] Step 6: Welcome notification shown');
```

---

### ШАГ 7: Навигация

```typescript
// React Navigation
navigation.navigate('MainApp');

// Или
navigation.replace('Feed');

console.log('[GUEST AUTH] Step 7: Navigation complete');
```

---

## 💾 LocalStorage / AsyncStorage данные

### Что сохранять (ОБЯЗАТЕЛЬНО)

| Ключ | Тип | Описание | Пример значения |
|------|-----|----------|-----------------|
| `fonana_device_id` | string | Уникальный ID устройства | `"device_a1b2c3d4e5f6..."` |
| `fonana_user_wallet` | string | Fake wallet (FK_...) | `"FK_3kR8mN9vL2pQ5tY7uZ1wX4cB6dF"` |
| `fonana_guest_auth` | string | Маркер гостевой авторизации | `"true"` |
| `fonana_jwt_token` | JSON string | JWT токен с метаданными | См. ниже |
| `fonana_user_data` | JSON string | Данные пользователя | См. ниже |
| `fonana_is_new_user` | string | Флаг нового пользователя | `"true"` (если новый) |

---

### Структура `fonana_jwt_token`

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": 1739472000000,
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "wallet": "FK_3kR8mN9vL2pQ5tY7uZ1wX4cB6dF"
}
```

---

### Структура `fonana_user_data`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nickname": "HappyFox123",
  "fullName": "Guest HappyFox123",
  "avatar": null,
  "wallet": "FK_3kR8mN9vL2pQ5tY7uZ1wX4cB6dF",
  "isCreator": true,
  "isVerified": false
}
```

---

## 💻 Код для React Native

### Полная функция авторизации

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

const API_BASE_URL = 'https://your-server.com'; // ЗАМЕНИ!

interface GuestAuthResponse {
  success: boolean;
  token: string;
  isGuest: boolean;
  deviceId: string;
  isNewUser: boolean;
  user: {
    id: string;
    nickname: string;
    fullName: string;
    avatar: string | null;
    wallet: string;
  };
}

export async function guestLogin(
  navigation: any,
  setUser: (user: any) => void
): Promise<void> {
  try {
    console.log('🔓 [GUEST LOGIN] Starting guest authentication...');

    // ШАГ 1: Проверяем deviceId в AsyncStorage
    let deviceId = await AsyncStorage.getItem('fonana_device_id');
    
    if (deviceId) {
      console.log('🔓 [GUEST LOGIN] Found existing deviceId:', deviceId);
    } else {
      console.log('🔓 [GUEST LOGIN] No deviceId found, will create new user');
    }

    // ШАГ 2: Отправляем запрос на backend
    const response = await fetch(`${API_BASE_URL}/api/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: deviceId || undefined })
    });

    const data: GuestAuthResponse = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Guest authentication failed');
    }

    console.log('🔓 [GUEST LOGIN] Authentication successful:', {
      user: data.user.nickname,
      isNewUser: data.isNewUser,
      deviceId: data.deviceId
    });

    // ШАГ 3: СОХРАНЯЕМ ВСЕ ДАННЫЕ В ASYNCSTORAGE
    
    // 3.1 Device ID
    await AsyncStorage.setItem('fonana_device_id', data.deviceId);
    console.log('✅ Saved: fonana_device_id');

    // 3.2 Fake Wallet
    await AsyncStorage.setItem('fonana_user_wallet', data.user.wallet);
    console.log('✅ Saved: fonana_user_wallet');

    // 3.3 Guest Auth marker
    await AsyncStorage.setItem('fonana_guest_auth', 'true');
    console.log('✅ Saved: fonana_guest_auth');

    // 3.4 JWT Token
    const tokenData = {
      token: data.token,
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
      userId: data.user.id,
      wallet: data.user.wallet
    };
    await AsyncStorage.setItem('fonana_jwt_token', JSON.stringify(tokenData));
    console.log('✅ Saved: fonana_jwt_token');

    // 3.5 User Data
    await AsyncStorage.setItem('fonana_user_data', JSON.stringify(data.user));
    console.log('✅ Saved: fonana_user_data');

    // 3.6 New User Flag
    if (data.isNewUser) {
      await AsyncStorage.setItem('fonana_is_new_user', 'true');
      console.log('✅ Saved: fonana_is_new_user (new user)');
    } else {
      await AsyncStorage.removeItem('fonana_is_new_user');
      console.log('✅ Removed: fonana_is_new_user (returning user)');
    }

    // ШАГ 4: Получаем полные данные пользователя
    console.log('🔓 [GUEST LOGIN] Fetching full user data...');
    const userResponse = await fetch(
      `${API_BASE_URL}/api/auth/token?wallet=${data.user.wallet}`
    );

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user data');
    }

    const userData = await userResponse.json();

    if (!userData.user) {
      throw new Error('No user data in response');
    }

    console.log('🔓 [GUEST LOGIN] Full user data fetched:', {
      userId: userData.user.id,
      nickname: userData.user.nickname
    });

    // ШАГ 5: Сохраняем в глобальный state
    setUser(userData.user);
    console.log('✅ User saved to global state');

    // ШАГ 6: Показываем уведомление
    const welcomeMessage = data.isNewUser
      ? `Welcome, ${data.user.nickname}! 🎉`
      : `Welcome back, ${data.user.nickname}! 👋`;

    Toast.show({
      type: 'success',
      text1: welcomeMessage,
      position: 'top',
      visibilityTime: 3000
    });

    // ШАГ 7: Навигация
    console.log('🔓 [GUEST LOGIN] Navigating to main app...');
    navigation.replace('MainApp'); // или 'Feed'

  } catch (error) {
    console.error('🔓 [GUEST LOGIN] Error:', error);
    
    Toast.show({
      type: 'error',
      text1: 'Login Failed',
      text2: error instanceof Error ? error.message : 'Failed to log in as guest',
      position: 'top',
      visibilityTime: 4000
    });
    
    throw error; // Re-throw для обработки выше
  }
}
```

---

### Использование в компоненте

```typescript
import React, { useState } from 'react';
import { View, Button, ActivityIndicator } from 'react-native';
import { guestLogin } from './auth/guestLogin';

function LoginScreen({ navigation }) {
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useUserStore(); // Твой глобальный store

  const handleGuestLogin = async () => {
    setIsLoading(true);
    try {
      await guestLogin(navigation, setUser);
    } catch (error) {
      // Ошибка уже показана в Toast
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View>
      <Button 
        title={isLoading ? "Creating account..." : "Continue as Guest"}
        onPress={handleGuestLogin}
        disabled={isLoading}
      />
      {isLoading && <ActivityIndicator />}
    </View>
  );
}
```

---

## 🚨 Обработка ошибок

### Типы ошибок

| Ошибка | Причина | Решение |
|--------|---------|---------|
| `Network request failed` | Нет интернета | Показать retry кнопку |
| `Guest authentication failed` | Сервер недоступен | Попробовать позже |
| `Failed to fetch user data` | Проблема с `/api/auth/token` | Повторный запрос |
| `No user data in response` | Backend ошибка | Связаться с поддержкой |

---

### Код обработки ошибок

```typescript
try {
  await guestLogin(navigation, setUser);
} catch (error) {
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('Network')) {
      Toast.show({
        type: 'error',
        text1: 'No Internet',
        text2: 'Please check your connection',
        position: 'top'
      });
    }
    // Server errors
    else if (error.message.includes('authentication failed')) {
      Toast.show({
        type: 'error',
        text1: 'Server Error',
        text2: 'Please try again later',
        position: 'top'
      });
    }
    // Generic error
    else {
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: error.message,
        position: 'top'
      });
    }
  }
}
```

---

## ⚠️ Важные нюансы

### 1. Device ID - КРИТИЧЕСКИ ВАЖЕН

**БЕЗ сохранения `deviceId` каждый вход будет создавать НОВОГО пользователя!**

```typescript
// ❌ НЕПРАВИЛЬНО:
const deviceId = await AsyncStorage.getItem('fonana_device_id');
// Не сохраняем после получения с сервера

// ✅ ПРАВИЛЬНО:
const deviceId = await AsyncStorage.getItem('fonana_device_id');
// После получения с сервера:
await AsyncStorage.setItem('fonana_device_id', data.deviceId);
```

---

### 2. Fake Wallet (FK_...) - это НЕ настоящий кошелёк

**Fake wallet** используется как:
- Идентификатор гостевого пользователя
- Ключ для получения JWT токена
- Маркер того что это гость (префикс `FK_`)

**НЕ пытайся**:
- Отправлять транзакции с этого адреса
- Использовать как Solana PublicKey
- Показывать пользователю как "реальный кошелёк"

---

### 3. JWT Token обновление

JWT токен живёт **30 дней**. После истечения:

```typescript
// Проверка истечения
const tokenData = JSON.parse(await AsyncStorage.getItem('fonana_jwt_token'));

if (Date.now() > tokenData.expiresAt) {
  console.log('Token expired, need refresh');
  
  // Повторный запрос с wallet
  const response = await fetch(
    `${API_BASE_URL}/api/auth/token?wallet=${tokenData.wallet}`
  );
  // Получи новый token и сохрани
}
```

---

### 4. Новый vs Вернувшийся пользователь

**isNewUser** используй для:
- Показа onboarding экрана (если `true`)
- Различных welcome messages
- Аналитики (новый vs возвращающийся)

```typescript
if (data.isNewUser) {
  // Показать onboarding
  navigation.navigate('Onboarding');
} else {
  // Сразу на главную
  navigation.navigate('Feed');
}
```

---

### 5. Logout гостевого пользователя

**НЕ удаляй `deviceId`** при logout!

```typescript
// ❌ НЕПРАВИЛЬНО:
await AsyncStorage.clear(); // Удалит deviceId!

// ✅ ПРАВИЛЬНО:
const deviceId = await AsyncStorage.getItem('fonana_device_id');
await AsyncStorage.clear();
await AsyncStorage.setItem('fonana_device_id', deviceId); // Восстанавливаем
```

Или:

```typescript
// ✅ ПРАВИЛЬНО (селективная очистка):
await AsyncStorage.multiRemove([
  'fonana_jwt_token',
  'fonana_user_wallet',
  'fonana_guest_auth',
  'fonana_user_data',
  'fonana_is_new_user'
]);
// deviceId остаётся!
```

---

### 6. Миграция Guest → Real User

Когда гость подключает настоящий кошелёк:

```typescript
// 1. Сохрани старый wallet
const guestWallet = await AsyncStorage.getItem('fonana_user_wallet');

// 2. Отправь запрос на backend для migration
const response = await fetch(`${API_BASE_URL}/api/auth/migrate-guest`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    guestWallet: guestWallet,
    newWallet: 'REAL_SOLANA_ADDRESS'
  })
});

// 3. Обнови данные
const data = await response.json();
await AsyncStorage.setItem('fonana_user_wallet', data.newWallet);
await AsyncStorage.removeItem('fonana_guest_auth');
await AsyncStorage.removeItem('fonana_device_id'); // Теперь можно удалить
```

---

## 📊 Диаграмма потока данных

```
┌─────────────┐
│   Client    │
│ (React      │
│  Native)    │
└──────┬──────┘
       │
       │ 1. POST /api/auth/guest
       │    { deviceId?: string }
       ▼
┌─────────────────────────────────┐
│         Backend                 │
│  /api/auth/guest                │
│                                 │
│  IF deviceId provided:          │
│    - Search user in DB          │
│    - Return existing user       │
│  ELSE:                          │
│    - Generate new deviceId      │
│    - Generate nickname          │
│    - Generate FK_ wallet        │
│    - Create user in DB          │
│    - Send Telegram notification │
│    - Return new user            │
└──────┬──────────────────────────┘
       │
       │ 2. Response:
       │    { success, token, deviceId, user, isNewUser }
       ▼
┌─────────────┐
│   Client    │
│             │
│ 3. Save to  │
│ AsyncStorage│
│ - deviceId  │
│ - wallet    │
│ - token     │
│ - user_data │
└──────┬──────┘
       │
       │ 4. GET /api/auth/token?wallet=FK_...
       ▼
┌─────────────────────────────────┐
│         Backend                 │
│  /api/auth/token                │
│                                 │
│  - Find user by wallet          │
│  - Return full user data        │
└──────┬──────────────────────────┘
       │
       │ 5. Response:
       │    { user: {...}, token, isNewUser }
       ▼
┌─────────────┐
│   Client    │
│             │
│ 6. Update   │
│ global state│
│             │
│ 7. Navigate │
│ to main app │
└─────────────┘
```

---

## ✅ Checklist для интеграции

- [ ] Заменил `API_BASE_URL` на реальный URL сервера
- [ ] Установил `@react-native-async-storage/async-storage`
- [ ] Установил `react-native-toast-message` (или аналог)
- [ ] Реализовал функцию `guestLogin()`
- [ ] Добавил кнопку "Continue as Guest" в UI
- [ ] Сохраняю `deviceId` в AsyncStorage
- [ ] Сохраняю `fake_wallet` в AsyncStorage
- [ ] Сохраняю `jwt_token` в AsyncStorage
- [ ] Сохраняю `user_data` в AsyncStorage
- [ ] Показываю welcome notification (Toast)
- [ ] Навигирую на главный экран после успеха
- [ ] Обрабатываю ошибки сети
- [ ] Обрабатываю ошибки сервера
- [ ] НЕ удаляю `deviceId` при logout
- [ ] Показываю onboarding для `isNewUser === true`
- [ ] Тестировал первый вход (создание)
- [ ] Тестировал повторный вход (возврат)
- [ ] Тестировал logout и повторный вход

---

## 📞 Поддержка

Если что-то не работает:

1. Проверь консоль (логи `🔓 [GUEST LOGIN]`)
2. Проверь что `deviceId` сохраняется
3. Проверь что `API_BASE_URL` правильный
4. Проверь что backend запущен и доступен
5. Проверь Response от сервера (JSON format)

---

**Конец документации**  
**Версия**: 1.0  
**Last Updated**: 13.02.2026
