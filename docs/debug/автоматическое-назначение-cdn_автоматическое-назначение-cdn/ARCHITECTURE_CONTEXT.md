# 🏗️ ARCHITECTURE CONTEXT: Автоматическое назначение CDN аватаров

## 📅 Дата: 18.02.2026
## 🎯 Задача: Документация изменений в app/api для автоматического назначения аватаров
## 👤 M7 Session: `task_автоматическое-назначение-cdn_8225`

---

## 📐 ЧТО БУДЕТ ИЗМЕНЕНО В BACKEND (app/api)

### 🎯 КРАТКАЯ СВОДКА ДЛЯ ПОНИМАНИЯ

**Что делаем:**
Добавляем автоматическое назначение CDN аватара при создании ЛЮБОГО нового пользователя.

**Где меняем:**
5 файлов в `app/api/` + 1 новая утилита + 1 миграция БД

**Суть изменений:**
Перед созданием пользователя вызываем `getNextAvatar()` → получаем URL → подставляем в `avatar` поле.

---

## 📁 ФАЙЛЫ КОТОРЫЕ БУДУТ ИЗМЕНЕНЫ

### ✅ **1. Новый файл: `lib/utils/avatarAssigner.ts`**

**Создаем новую утилиту для управления аватарами**

```typescript
// lib/utils/avatarAssigner.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const AVATAR_CONFIG = {
  cdnBasePath: 'https://fonanastorage.b-cdn.net/avatars/default/',
  totalAvatars: 250,
  filePattern: 'female-portrait-{number}.jpg'
}

/**
 * Получить URL следующего доступного аватара
 * Автоматически увеличивает счетчик и возвращает уникальный аватар
 * Когда все 250 аватаров использованы - начинает с начала (циклически)
 */
export async function getNextAvatar(): Promise<string> {
  try {
    // 1. Атомарно увеличить счетчик (защита от race condition)
    const result = await prisma.$executeRaw`
      INSERT INTO avatar_counter (id, counter, total_avatars) 
      VALUES (1, 1, ${AVATAR_CONFIG.totalAvatars})
      ON CONFLICT (id) 
      DO UPDATE SET 
        counter = avatar_counter.counter + 1,
        updated_at = NOW()
      RETURNING counter
    `
    
    // 2. Получить новый счетчик
    const counter = await prisma.avatarCounter.findUnique({
      where: { id: 1 }
    })
    
    if (!counter) {
      throw new Error('Avatar counter not found')
    }
    
    // 3. Вычислить индекс аватара (циклически: 1-250)
    const avatarIndex = ((counter.counter - 1) % AVATAR_CONFIG.totalAvatars) + 1
    
    // 4. Сформировать URL
    const paddedNumber = String(avatarIndex).padStart(3, '0')
    const avatarUrl = `${AVATAR_CONFIG.cdnBasePath}${AVATAR_CONFIG.filePattern.replace('{number}', paddedNumber)}`
    
    console.log(`[AVATAR ASSIGNER] Assigned avatar #${avatarIndex} (total used: ${counter.counter})`)
    
    return avatarUrl
    
  } catch (error) {
    console.error('[AVATAR ASSIGNER] Error:', error)
    
    // Fallback: если что-то пошло не так - вернуть первый аватар
    return `${AVATAR_CONFIG.cdnBasePath}female-portrait-001.jpg`
  }
}

/**
 * Получить статистику использования аватаров
 */
export async function getAvatarStats() {
  const counter = await prisma.avatarCounter.findUnique({
    where: { id: 1 }
  })
  
  if (!counter) {
    return {
      used: 0,
      total: AVATAR_CONFIG.totalAvatars,
      available: AVATAR_CONFIG.totalAvatars,
      cyclesCompleted: 0
    }
  }
  
  return {
    used: counter.counter,
    total: AVATAR_CONFIG.totalAvatars,
    available: AVATAR_CONFIG.totalAvatars - (counter.counter % AVATAR_CONFIG.totalAvatars),
    cyclesCompleted: Math.floor(counter.counter / AVATAR_CONFIG.totalAvatars)
  }
}
```

---

### ✅ **2. Изменяемый файл: `app/api/user/route.ts` (POST метод)**

**Где:** Строка ~709 (функция POST)

**Было:**
```typescript
const newUser = await createOrUpdateUser(wallet, {
  nickname: uniqueUsername,
  fullName: uniqueUsername,
  bio: undefined
}, referrerNickname)
```

**Станет:**
```typescript
// Получаем следующий доступный аватар
const avatarUrl = await getNextAvatar()

const newUser = await createOrUpdateUser(wallet, {
  nickname: uniqueUsername,
  fullName: uniqueUsername,
  bio: undefined,
  avatar: avatarUrl  // ← ДОБАВИЛИ
}, referrerNickname)
```

**Также добавить импорт в начало файла:**
```typescript
import { getNextAvatar } from '@/lib/utils/avatarAssigner'
```

---

### ✅ **3. Изменяемый файл: `app/api/user/route.ts` (GET метод)**

**Где:** Строка ~550 (функция GET, создание пользователя)

**Было:**
```typescript
user = await prisma.user.create({
  data: {
    wallet: wallet!,
    nickname: uniqueUsername,
    referalCount: 0,
    fullName: uniqueUsername,
    name: uniqueUsername,
    solanaWallet: wallet!
  },
  include: {
    _count: {
      select: {
        posts: true,
        followers: true,
        follows: true,
      },
    },
  },
})
```

**Станет:**
```typescript
// Получаем следующий доступный аватар
const avatarUrl = await getNextAvatar()

user = await prisma.user.create({
  data: {
    wallet: wallet!,
    nickname: uniqueUsername,
    referalCount: 0,
    fullName: uniqueUsername,
    name: uniqueUsername,
    solanaWallet: wallet!,
    avatar: avatarUrl  // ← ДОБАВИЛИ
  },
  include: {
    _count: {
      select: {
        posts: true,
        followers: true,
        follows: true,
      },
    },
  },
})
```

---

### ✅ **4. Изменяемый файл: `app/api/auth/token/route.ts` (GET метод)**

**Где:** Строка ~85 (функция GET, создание пользователя)

**Было:**
```typescript
user = await prisma.user.create({
  data: {
    wallet,
    nickname: `user_${wallet.slice(0, 8).toLowerCase()}`,
    solanaWallet: wallet
  }
})
```

**Станет:**
```typescript
// Получаем следующий доступный аватар
const avatarUrl = await getNextAvatar()

user = await prisma.user.create({
  data: {
    wallet,
    nickname: `user_${wallet.slice(0, 8).toLowerCase()}`,
    solanaWallet: wallet,
    avatar: avatarUrl  // ← ДОБАВИЛИ
  }
})
```

**Также добавить импорт:**
```typescript
import { getNextAvatar } from '@/lib/utils/avatarAssigner'
```

---

### ✅ **5. Изменяемый файл: `app/api/auth/guest/route.ts` (POST метод)**

**Где:** Строка ~184 (функция POST, создание гостя)

**Было:**
```typescript
const user = await prisma.user.create({
  data: {
    telegramId: deviceId,
    nickname: nickname,
    fullName: `Guest ${nickname}`,
    avatar: null,  // ← Было null
    wallet: fakeWallet,
    solanaWallet: null,
    isCreator: true,
    isVerified: false,
  }
})
```

**Станет:**
```typescript
// Получаем следующий доступный аватар
const avatarUrl = await getNextAvatar()

const user = await prisma.user.create({
  data: {
    telegramId: deviceId,
    nickname: nickname,
    fullName: `Guest ${nickname}`,
    avatar: avatarUrl,  // ← ИЗМЕНИЛИ
    wallet: fakeWallet,
    solanaWallet: null,
    isCreator: true,
    isVerified: false,
  }
})
```

**Также добавить импорт:**
```typescript
import { getNextAvatar } from '@/lib/utils/avatarAssigner'
```

---

### ✅ **6. Изменяемый файл: `app/api/auth/telegram/route.ts` (POST метод)**

**Где:** Строка ~159 (функция POST, создание через Telegram)

**Было:**
```typescript
user = await prisma.user.create({
  data: {
    telegramId: authData.id.toString(),
    nickname: nickname,
    fullName: `${authData.first_name} ${authData.last_name || ''}`.trim(),
    avatar: authData.photo_url || null,  // ← Из Telegram или null
    wallet: fakeWallet,
    solanaWallet: null,
    isCreator: true,
    isVerified: false,
  }
})
```

**Станет:**
```typescript
// Получаем CDN аватар как fallback если нет фото из Telegram
const avatarUrl = authData.photo_url || await getNextAvatar()

user = await prisma.user.create({
  data: {
    telegramId: authData.id.toString(),
    nickname: nickname,
    fullName: `${authData.first_name} ${authData.last_name || ''}`.trim(),
    avatar: avatarUrl,  // ← Фото из Telegram ИЛИ CDN аватар
    wallet: fakeWallet,
    solanaWallet: null,
    isCreator: true,
    isVerified: false,
  }
})
```

**Также добавить импорт:**
```typescript
import { getNextAvatar } from '@/lib/utils/avatarAssigner'
```

---

### ✅ **7. Новая миграция БД: `prisma/migrations/XXXXXX_add_avatar_counter/migration.sql`**

**Создаем новую таблицу для хранения счетчика**

```sql
-- CreateTable
CREATE TABLE "avatar_counter" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "counter" INTEGER NOT NULL DEFAULT 148,
    "total_avatars" INTEGER NOT NULL DEFAULT 250,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avatar_counter_pkey" PRIMARY KEY ("id")
);

-- Инициализируем счетчик (148 аватаров уже использовано)
INSERT INTO "avatar_counter" (id, counter, total_avatars) 
VALUES (1, 148, 250);
```

**Также обновить schema.prisma:**
```prisma
// prisma/schema.prisma
model AvatarCounter {
  id            Int      @id @default(autoincrement())
  counter       Int      @default(148)
  totalAvatars  Int      @default(250) @map("total_avatars")
  updatedAt     DateTime @default(now()) @updatedAt @map("updated_at")

  @@map("avatar_counter")
}
```

---

## 📊 СВОДНАЯ ТАБЛИЦА ИЗМЕНЕНИЙ

| Файл | Тип изменения | Где именно | Что добавляем |
|------|---------------|------------|---------------|
| `lib/utils/avatarAssigner.ts` | ➕ Новый | - | Утилита для получения аватаров |
| `app/api/user/route.ts` (POST) | ✏️ Изменение | Строка ~709 | `avatar: await getNextAvatar()` |
| `app/api/user/route.ts` (GET) | ✏️ Изменение | Строка ~550 | `avatar: await getNextAvatar()` |
| `app/api/auth/token/route.ts` (GET) | ✏️ Изменение | Строка ~85 | `avatar: await getNextAvatar()` |
| `app/api/auth/guest/route.ts` (POST) | ✏️ Изменение | Строка ~184 | `avatar: await getNextAvatar()` |
| `app/api/auth/telegram/route.ts` (POST) | ✏️ Изменение | Строка ~159 | `avatar: authData.photo_url \|\| await getNextAvatar()` |
| `prisma/schema.prisma` | ➕ Новая модель | - | `model AvatarCounter` |
| `prisma/migrations/...` | ➕ Миграция | - | CREATE TABLE avatar_counter |

**Итого:** 8 файлов (1 новая утилита + 5 изменений API + 1 schema + 1 миграция)

---

## 🔄 КАК ЭТО РАБОТАЕТ

### Workflow при создании пользователя:

```
1. Пользователь регистрируется (wallet connect ИЛИ guest)
   ↓
2. Backend вызывает getNextAvatar()
   ↓
3. getNextAvatar() атомарно увеличивает counter в БД
   ↓
4. Вычисляется индекс: (counter - 1) % 250 + 1
   ↓
5. Формируется URL: https://fonanastorage.b-cdn.net/avatars/default/female-portrait-XXX.jpg
   ↓
6. URL подставляется в поле avatar при создании пользователя
   ↓
7. Пользователь создан с уникальным CDN аватаром ✅
```

### Пример:

- **Текущий counter:** 148
- **Новый пользователь:** counter становится 149
- **Вычисляем индекс:** (149 - 1) % 250 + 1 = 149
- **URL:** `https://fonanastorage.b-cdn.net/avatars/default/female-portrait-149.jpg`

### Когда counter достигнет 250:

- **Counter:** 250
- **Индекс:** (250 - 1) % 250 + 1 = 250 ✅
- **Следующий:** counter 251
- **Индекс:** (251 - 1) % 250 + 1 = 1 ✅ (начинает заново!)

---

## 🛡️ ЗАЩИТА ОТ RACE CONDITIONS

### Проблема:
Если 2 пользователя регистрируются одновременно, они могут получить одинаковый counter.

### Решение:
Используем `ON CONFLICT DO UPDATE` в PostgreSQL:

```sql
INSERT INTO avatar_counter (id, counter, total_avatars) 
VALUES (1, 1, 250)
ON CONFLICT (id) 
DO UPDATE SET 
  counter = avatar_counter.counter + 1,
  updated_at = NOW()
RETURNING counter
```

**Это атомарная операция** - PostgreSQL гарантирует что два concurrent запроса получат разные значения counter.

---

## 📊 СТАТИСТИКА И МОНИТОРИНГ

### Получить статистику:

```typescript
import { getAvatarStats } from '@/lib/utils/avatarAssigner'

const stats = await getAvatarStats()
console.log(stats)
// {
//   used: 148,
//   total: 250,
//   available: 102,
//   cyclesCompleted: 0
// }
```

### SQL запрос для проверки:

```sql
SELECT * FROM avatar_counter WHERE id = 1;
-- counter = 148 (сколько раз назначали аватары)
-- total_avatars = 250
-- updated_at = последнее назначение
```

---

## 🎯 ИТОГОВАЯ ЛОГИКА

### Для Wallet Connect пользователей:
```typescript
// Всегда получают CDN аватар
avatar: await getNextAvatar()
```

### Для Guest пользователей:
```typescript
// Всегда получают CDN аватар
avatar: await getNextAvatar()
```

### Для Telegram пользователей:
```typescript
// Приоритет фото из Telegram, fallback на CDN
avatar: authData.photo_url || await getNextAvatar()
```

---

## ✅ CHECKLIST ДЛЯ РЕАЛИЗАЦИИ

- [ ] Создать `lib/utils/avatarAssigner.ts`
- [ ] Обновить `prisma/schema.prisma` (добавить модель AvatarCounter)
- [ ] Создать миграцию БД (`npx prisma migrate dev`)
- [ ] Изменить `app/api/user/route.ts` (POST) - добавить avatar
- [ ] Изменить `app/api/user/route.ts` (GET) - добавить avatar
- [ ] Изменить `app/api/auth/token/route.ts` (GET) - добавить avatar
- [ ] Изменить `app/api/auth/guest/route.ts` (POST) - добавить avatar
- [ ] Изменить `app/api/auth/telegram/route.ts` (POST) - fallback avatar
- [ ] Запустить миграцию на сервере
- [ ] Протестировать создание нового пользователя (wallet)
- [ ] Протестировать создание гостя
- [ ] Проверить что counter увеличивается
- [ ] Проверить что аватары уникальные

---

**Status:** ✅ COMPLETE  
**Next Phase:** SOLUTION_PLAN (детальный код)  
**Analyst:** Claude Opus 4.5 via M7 HEAVY methodology  
**Estimated Time:** 1-2 часа на реализацию
