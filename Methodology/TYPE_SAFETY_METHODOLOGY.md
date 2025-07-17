# 🔒 МЕТОДОЛОГИЯ ТИПОБЕЗОПАСНОСТИ И ВЕРСИОННОЙ СОВМЕСТИМОСТИ

## 📋 НАЗНАЧЕНИЕ
Предотвращение систематических проблем несоответствия типов, версионных конфликтов и архитектурных расхождений на этапе имплементации.

---

## 🚨 ОБЯЗАТЕЛЬНЫЕ ПРОВЕРКИ ПЕРЕД ИМПЛЕМЕНТАЦИЕЙ

### 1️⃣ **ПРОВЕРКА ТИПОВ ДАННЫХ БД**
```bash
# Проверить реальный тип возвращаемых данных
psql -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'table_name';"

# Проверить формат decimal полей
curl -s "http://localhost:3000/api/[endpoint]" | jq '.price | type'
```

**Критические несоответствия:**
- `decimal` в PostgreSQL → `string` в JavaScript runtime
- `timestamp` в PostgreSQL → `Date` объект в Drizzle → требуется `.toISOString()`
- `jsonb` в PostgreSQL → требует JSON.parse/stringify

**Правило:** ВСЕГДА проверять runtime тип, не доверять схеме.

### 2️⃣ **ПРОВЕРКА ВЕРСИЙ ЗАВИСИМОСТЕЙ**
```bash
# Перед использованием API проверить версию
grep "@trpc/server" package.json
grep "@trpc/client" package.json

# Проверить breaking changes
npm view @trpc/server versions --json | jq '.[-5:]'
```

**Критические изменения:**
- tRPC v10+: `isLoading` → `isPending` в мутациях
- Next.js 14: строгая типизация `href` в Link
- Solana wallet-adapter: удалены `onConnect`, `onDisconnect`, `onError` пропсы

**Правило:** Проверять changelog перед использованием API библиотеки.

### 3️⃣ **ПРОВЕРКА СУЩЕСТВУЮЩИХ ТИПОВ**
```typescript
// Перед созданием нового типа
grep -r "interface.*Post" src/
grep -r "type.*Post" src/

// Проверить экспорты
grep -r "export.*Post" src/lib/schemas/
```

**Правило:** Использовать существующие типы, расширять через `extends` или `Omit/Pick`.

---

## 🔍 RUNTIME ПРОВЕРКИ

### **ОБЯЗАТЕЛЬНАЯ ПРОВЕРКА ДАННЫХ API**
```bash
# Шаг 1: Получить реальные данные
curl -s "http://localhost:3000/api/posts" | jq '.[0]' > sample.json

# Шаг 2: Проверить структуру
jq 'keys' sample.json

# Шаг 3: Проверить типы полей
jq '.price | type' sample.json
jq '.createdAt | type' sample.json
```

### **ПРОВЕРКА NULLABLE ПОЛЕЙ**
```typescript
// В коде проверять КАЖДОЕ поле которое может быть null
interface ApiResponse {
  user: {
    nickname: string | null  // НЕ string
    avatar: string | null    // НЕ string
  }
}

// Безопасное использование
const displayName = user.nickname || 'Anonymous'
const avatarUrl = user.avatar || '/default-avatar.png'
```

---

## 📊 МАТРИЦА ТИПОВЫХ ПРЕОБРАЗОВАНИЙ

| БД Тип | Drizzle Return | TypeScript Тип | Преобразование |
|--------|----------------|----------------|----------------|
| decimal | string | number | `parseFloat()` или оставить string |
| timestamp | Date | string (ISO) | `.toISOString()` |
| jsonb | object/array | typed object | Zod parse |
| text[] | string[] | string[] | Прямое использование |
| boolean | boolean | boolean | Прямое использование |
| uuid | string | string | Прямое использование |

---

## 🛡️ ЗАЩИТНЫЕ ПАТТЕРНЫ

### **1. ВСЕГДА ПРИВОДИТЬ ТИПЫ НА ГРАНИЦАХ**
```typescript
// API endpoint
const [post] = await db.insert(posts).values({
  ...input,
  price: input.price?.toString(), // number → string
  tags: input.tags ? JSON.stringify(input.tags) : null, // array → JSON
}).returning()

// Frontend получение
const price = parseFloat(post.price) // string → number
const tags = post.tags ? JSON.parse(post.tags) : [] // JSON → array
```

### **2. ЗАЩИТА ОТ NULL**
```typescript
// ❌ НЕПРАВИЛЬНО
alt={user.nickname}

// ✅ ПРАВИЛЬНО
alt={user.nickname || 'User'}

// ❌ НЕПРАВИЛЬНО
{user.nickname[0].toUpperCase()}

// ✅ ПРАВИЛЬНО
{user.nickname?.[0]?.toUpperCase() || '?'}
```

### **3. ВЕРСИОННАЯ СОВМЕСТИМОСТЬ**
```typescript
// Проверка версии tRPC
const isPending = 'isPending' in mutation ? mutation.isPending : mutation.isLoading

// Безопасное использование Next.js Link
<Link href={path as any}>
```

---

## 🔄 ПРОЦЕСС ВАЛИДАЦИИ ТИПОВ

### **ПЕРЕД КАЖДЫМ API ВЫЗОВОМ:**
1. Проверить схему Zod
2. Проверить реальный response
3. Сравнить типы
4. Добавить преобразования

### **ПЕРЕД ИСПОЛЬЗОВАНИЕМ ДАННЫХ:**
1. Проверить на null/undefined
2. Проверить тип (string vs number)
3. Добавить fallback значения
4. Логировать несоответствия

---

## 🚫 АНТИПАТТЕРНЫ

### **НЕ ДЕЛАТЬ:**
```typescript
// ❌ Предполагать тип без проверки
const price: number = post.price

// ❌ Игнорировать nullable
<img alt={user.nickname} />

// ❌ Использовать any для обхода
setData(response as any)

// ❌ Смешивать версии API
mutation.isLoading // в tRPC 11+
```

### **ДЕЛАТЬ:**
```typescript
// ✅ Явное преобразование
const price = typeof post.price === 'string' ? parseFloat(post.price) : post.price

// ✅ Защита от null
<img alt={user.nickname || 'User'} />

// ✅ Типизированное приведение
setData(response as CommentData[])

// ✅ Версионно-безопасный код
mutation.isPending
```

---

## 📋 ЧЕКЛИСТ ТИПОБЕЗОПАСНОСТИ

### **Перед написанием кода:**
- [ ] Проверить тип в БД через psql
- [ ] Проверить runtime тип через curl
- [ ] Найти существующие типы через grep
- [ ] Проверить версию библиотеки
- [ ] Прочитать changelog на breaking changes

### **При написании кода:**
- [ ] Добавить преобразования на границах
- [ ] Защитить от null значений
- [ ] Использовать строгие типы (не any)
- [ ] Добавить runtime проверки
- [ ] Логировать типовые несоответствия

### **После написания кода:**
- [ ] Проверить сборку TypeScript
- [ ] Проверить runtime в браузере
- [ ] Убедиться в отсутствии any
- [ ] Проверить обработку edge cases
- [ ] Запустить с реальными данными

---

## 🎯 КРИТИЧЕСКИЕ ТОЧКИ ПРОВЕРКИ

### **1. СХЕМА БД → DRIZZLE**
- decimal поля (price, amount)
- timestamp поля (createdAt, updatedAt)
- json поля (metadata, tags)
- nullable foreign keys

### **2. API → FRONTEND**
- Формат дат (Date vs string)
- Числовые поля (number vs string)
- Массивы (array vs JSON string)
- Вложенные объекты (relations)

### **3. БИБЛИОТЕКИ**
- tRPC query/mutation API
- Next.js компоненты
- Wallet adapter hooks
- Zod схемы валидации

---

**🔴 ГЛАВНОЕ ПРАВИЛО: Не доверять типам - проверять данные!** 