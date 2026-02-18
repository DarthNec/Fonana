# 🔍 DISCOVERY REPORT: Автоматическое назначение CDN аватаров

## 📅 Дата: 18.02.2026
## 🎯 Задача: Автоматическое назначение уникальных CDN аватаров при создании пользователей
## 👤 M7 Session: `task_автоматическое-назначение-cdn_8225`

---

## 📊 EXECUTIVE SUMMARY

**Проблема:** При регистрации новых пользователей им НЕ назначаются аватары автоматически. Пользователи получают `null` или генерируются DiceBear SVG.

**Текущее состояние:**
- ❌ Новые пользователи создаются без аватаров (`avatar: null`)
- ❌ Frontend использует DiceBear как fallback
- ✅ Есть 250 женских портретов на CDN (`https://fonanastorage.b-cdn.net/avatars/default/`)
- ✅ Уже использовано 148 аватаров (осталось 102)

**Цель:** Автоматически назначать уникальные CDN аватары при создании любого пользователя (wallet connect или guest).

---

## 🔍 PHASE 1: ТОЧКИ СОЗДАНИЯ ПОЛЬЗОВАТЕЛЕЙ

### 1.1 Найдено 5 точек входа

#### ✅ **1. POST /api/user** - Основная регистрация через кошелек
**Файл:** `app/api/user/route.ts` (строки 641-750)

**Код создания:**
```typescript
const newUser = await createOrUpdateUser(wallet, {
  nickname: uniqueUsername,
  fullName: uniqueUsername,
  bio: undefined
}, referrerNickname)
```

**Текущий аватар:** ❌ `undefined` (не устанавливается)

---

#### ✅ **2. GET /api/user** - Создание пользователя при проверке существования
**Файл:** `app/api/user/route.ts` (строки 550-568)

**Код создания:**
```typescript
user = await prisma.user.create({
  data: {
    wallet: wallet!,
    nickname: uniqueUsername,
    referalCount: 0,
    fullName: uniqueUsername,
    name: uniqueUsername,
    solanaWallet: wallet!
    // avatar: НЕ УСТАНАВЛИВАЕТСЯ!
  },
  //...
})
```

**Текущий аватар:** ❌ `undefined` (не устанавливается)

---

#### ✅ **3. GET /api/auth/token** - Создание через токен (wallet connect)
**Файл:** `app/api/auth/token/route.ts` (строки 85-91)

**Код создания:**
```typescript
user = await prisma.user.create({
  data: {
    wallet,
    nickname: `user_${wallet.slice(0, 8).toLowerCase()}`,
    solanaWallet: wallet
    // avatar: НЕ УСТАНАВЛИВАЕТСЯ!
  }
})
```

**Текущий аватар:** ❌ `undefined` (не устанавливается)

---

#### ✅ **4. POST /api/auth/guest** - Создание гостевых пользователей
**Файл:** `app/api/auth/guest/route.ts` (строки 184-195)

**Код создания:**
```typescript
const user = await prisma.user.create({
  data: {
    telegramId: deviceId,
    nickname: nickname,
    fullName: `Guest ${nickname}`,
    avatar: null,  // ❌ Явно устанавливается null
    wallet: fakeWallet,
    solanaWallet: null,
    isCreator: true,
    isVerified: false,
  }
})
```

**Текущий аватар:** ❌ `null`

---

#### ✅ **5. POST /api/auth/telegram** - Создание через Telegram
**Файл:** `app/api/auth/telegram/route.ts` (строки 159-170)

**Код создания:**
```typescript
user = await prisma.user.create({
  data: {
    telegramId: authData.id.toString(),
    nickname: nickname,
    fullName: `${authData.first_name} ${authData.last_name || ''}`.trim(),
    avatar: authData.photo_url || null,  // ⚠️ Использует фото из Telegram
    wallet: fakeWallet,
    solanaWallet: null,
    isCreator: true,
    isVerified: false,
  }
})
```

**Текущий аватар:** ⚠️ `authData.photo_url` (из Telegram) или `null`

---

## 📊 PHASE 2: СТАТИСТИКА

### 2.1 Сводка по точкам входа

| Точка входа | Файл | Тип пользователя | Текущий аватар | Требует изменений |
|-------------|------|------------------|----------------|-------------------|
| `POST /api/user` | user/route.ts:641 | Wallet Connect | ❌ undefined | ✅ ДА |
| `GET /api/user` | user/route.ts:550 | Wallet Connect | ❌ undefined | ✅ ДА |
| `GET /api/auth/token` | auth/token/route.ts:85 | Wallet Connect | ❌ undefined | ✅ ДА |
| `POST /api/auth/guest` | auth/guest/route.ts:184 | Guest | ❌ null | ✅ ДА |
| `POST /api/auth/telegram` | auth/telegram/route.ts:159 | Telegram | ⚠️ photo_url/null | ✅ ДА (fallback) |

**Итого:** 5 точек входа требуют изменений

---

## 🎯 PHASE 3: ТРЕБОВАНИЯ

### 3.1 Функциональные требования

**MUST HAVE:**
1. ✅ Автоматическое назначение CDN аватара при создании любого пользователя
2. ✅ Уникальность - не повторять аватары (пока есть неиспользованные)
3. ✅ Циклическое переиспользование когда все 250 аватаров использованы
4. ✅ Работать для wallet connect и guest пользователей
5. ✅ Отслеживать использованные аватары

**NICE TO HAVE:**
- 🔷 Статистика использования аватаров
- 🔷 API для получения следующего доступного аватара
- 🔷 Логирование назначений

### 3.2 Технические требования

**Архитектура:**
- ✅ Централизованная логика выбора аватара
- ✅ Хранение счетчика использованных аватаров в БД
- ✅ Атомарность операций (race condition safe)

**Производительность:**
- ✅ Минимальные изменения в существующем коде
- ✅ Не замедлять регистрацию пользователей
- ✅ Кэширование списка аватаров

---

## 💡 PHASE 4: ПРЕДЛАГАЕМОЕ РЕШЕНИЕ

### 4.1 Архитектурный подход

**Создать утилиту:** `lib/utils/avatarAssigner.ts`

**Основные компоненты:**

1. **Счетчик использованных аватаров** - хранить в БД или Redis
2. **Функция `getNextAvatar()`** - возвращает URL следующего доступного аватара
3. **Атомарность** - использовать БД транзакции или Redis INCR

### 4.2 Варианты хранения счетчика

#### **Вариант A: В таблице `users` (подсчет)**
```sql
SELECT COUNT(*) FROM users 
WHERE avatar LIKE 'https://fonanastorage.b-cdn.net/avatars/default/%'
```

**Плюсы:**
- ✅ Не требует новых таблиц
- ✅ Точный подсчет использованных

**Минусы:**
- ❌ Медленный при большом количестве пользователей
- ❌ Race condition возможен

---

#### **Вариант B: Новая таблица `avatar_counter`**
```sql
CREATE TABLE avatar_counter (
  id SERIAL PRIMARY KEY,
  counter INTEGER DEFAULT 0,
  total_avatars INTEGER DEFAULT 250,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Плюсы:**
- ✅ Быстрый доступ (одна строка)
- ✅ Можно использовать `UPDATE ... RETURNING` для атомарности
- ✅ Легко получить статистику

**Минусы:**
- ❌ Новая таблица

---

#### **Вариант C: Redis counter**
```typescript
const counter = await redis.incr('avatar:counter')
const avatarIndex = (counter - 1) % 250 + 1
```

**Плюсы:**
- ✅ Очень быстро
- ✅ Атомарность гарантирована
- ✅ Не нагружает PostgreSQL

**Минусы:**
- ❌ Требует Redis
- ❌ Нужно синхронизировать если Redis упадет

---

### 4.3 РЕКОМЕНДУЕМЫЙ ВАРИАНТ: **B + Fallback**

**Почему:**
- PostgreSQL уже используется
- Таблица простая (1 строка)
- Атомарность через `UPDATE ... RETURNING`
- Не требует дополнительных сервисов

**Fallback:** Если запись не существует - создать с counter=0

---

## 📝 PHASE 5: ПЛАН ИЗМЕНЕНИЙ

### 5.1 Файлы которые будут изменены

**Новые файлы:**
1. `lib/utils/avatarAssigner.ts` - Логика назначения аватаров
2. `prisma/migrations/XXXXXX_add_avatar_counter.sql` - Миграция БД

**Изменяемые файлы:**
3. `app/api/user/route.ts` (POST метод) - добавить назначение аватара
4. `app/api/user/route.ts` (GET метод) - добавить назначение аватара
5. `app/api/auth/token/route.ts` (GET метод) - добавить назначение аватара
6. `app/api/auth/guest/route.ts` (POST метод) - добавить назначение аватара
7. `app/api/auth/telegram/route.ts` (POST метод) - fallback если нет photo_url

---

### 5.2 Структура изменений

**Шаг 1: Создать миграцию БД**
```sql
-- prisma/migrations/XXXXXX_add_avatar_counter/migration.sql
CREATE TABLE avatar_counter (
  id SERIAL PRIMARY KEY,
  counter INTEGER DEFAULT 0,
  total_avatars INTEGER DEFAULT 250,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Инициализируем счетчик
INSERT INTO avatar_counter (counter, total_avatars) VALUES (148, 250);
```

**Шаг 2: Создать утилиту**
```typescript
// lib/utils/avatarAssigner.ts
export async function getNextAvatar(): Promise<string> {
  // 1. Атомарно увеличить counter
  // 2. Вычислить индекс: (counter % 250) + 1
  // 3. Вернуть URL: https://fonanastorage.b-cdn.net/avatars/default/female-portrait-XXX.jpg
}
```

**Шаг 3: Интегрировать в точки создания**
```typescript
// В каждом месте создания пользователя:
import { getNextAvatar } from '@/lib/utils/avatarAssigner'

const avatarUrl = await getNextAvatar()

const user = await prisma.user.create({
  data: {
    // ... остальные поля
    avatar: avatarUrl  // ← ДОБАВИТЬ
  }
})
```

---

## 🚦 PHASE 6: RED FLAGS И РИСКИ

### 🔴 CRITICAL RED FLAGS

**1. Race Condition при concurrent регистрациях**
- Проблема: Два пользователя могут получить один аватар
- ⚠️ **РИСК:** Нарушение уникальности
- ✅ **РЕШЕНИЕ:** Использовать `UPDATE ... RETURNING` для атомарности

**2. Counter может быть сброшен**
- Проблема: Если удалить запись из `avatar_counter`
- ⚠️ **РИСК:** Счетчик начнется с 0
- ✅ **РЕШЕНИЕ:** Fallback на подсчет из таблицы `users`

**3. Telegram пользователи уже имеют фото**
- Проблема: Перезапись фото из Telegram на CDN аватар
- ⚠️ **РИСК:** Пользователи потеряют свои фото
- ✅ **РЕШЕНИЕ:** Использовать CDN аватар только если `photo_url` отсутствует

### 🟡 MEDIUM RISKS

**4. Миграция существующих пользователей**
- Эта задача НЕ касается существующих (есть отдельный скрипт)
- ⚠️ **РИСК:** Путаница с двумя разными процессами
- ✅ **РЕШЕНИЕ:** Четко разделить: скрипт для старых, API для новых

**5. 250 аватаров может не хватить**
- При росте проекта > 250 пользователей/день
- ⚠️ **РИСК:** Быстрое переиспользование
- ✅ **РЕШЕНИЕ:** Циклическое переиспользование (уже в требованиях)

---

## 📊 PHASE 7: МЕТРИКИ УСПЕХА

### Как измерить успех:

**До изменений:**
```sql
SELECT COUNT(*) as total_users,
  COUNT(CASE WHEN avatar IS NULL THEN 1 END) as null_avatars,
  COUNT(CASE WHEN avatar LIKE 'https://fonanastorage.b-cdn.net%' THEN 1 END) as cdn_avatars
FROM users;
```

**После изменений:**
- ✅ 100% новых пользователей получают CDN аватар
- ✅ Нет дублирования аватаров (пока counter < 250)
- ✅ Циклическое переиспользование работает после 250

**Тестирование:**
1. Создать 5 новых пользователей (wallet connect)
2. Создать 5 гостей
3. Проверить что все получили уникальные аватары
4. Проверить что counter увеличился на 10

---

## 💡 PHASE 8: АЛЬТЕРНАТИВНЫЕ ПОДХОДЫ

### Подход 1: Рандомный выбор (НЕ рекомендуется)
```typescript
const randomIndex = Math.floor(Math.random() * 250) + 1
const avatarUrl = `https://fonanastorage.b-cdn.net/avatars/default/female-portrait-${randomIndex}.jpg`
```

**Минусы:**
- ❌ Высокая вероятность дублирования
- ❌ Невозможно отследить использованные
- ❌ Не соответствует требованиям

### Подход 2: UUID-based selection
```typescript
const hash = crypto.createHash('md5').update(userId).digest('hex')
const index = parseInt(hash.substring(0, 8), 16) % 250 + 1
```

**Минусы:**
- ❌ Все равно возможны дубликаты
- ❌ Детерминированный но не последовательный
- ❌ Не соответствует требованиям

### Подход 3: Последовательный счетчик (РЕКОМЕНДУЕТСЯ) ✅
**Именно то что мы предлагаем**

---

## 📋 СЛЕДУЮЩИЕ ШАГИ

1. ✅ **DISCOVERY ЗАВЕРШЕН** - все точки входа найдены
2. ⏭️ **ARCHITECTURE_CONTEXT** - детали реализации
3. ⏭️ **SOLUTION_PLAN** - пошаговый план с кодом
4. ⏭️ **IMPLEMENTATION** - внедрение изменений
5. ⏭️ **TESTING** - проверка всех сценариев

---

## 📊 DISCOVERY METRICS

- **Файлов проанализировано:** 5 (все API endpoints)
- **Точек создания найдено:** 5
- **Типов пользователей:** 3 (Wallet, Guest, Telegram)
- **Требуемых изменений:** 7 файлов (2 новых + 5 изменений)
- **Время на Discovery:** ~20 минут

---

**Status:** ✅ COMPLETE  
**Next Phase:** ARCHITECTURE_CONTEXT  
**Analyst:** Claude Opus 4.5 via M7 HEAVY methodology  
**Code Changes:** НЕТ (только анализ, как запрошено)
