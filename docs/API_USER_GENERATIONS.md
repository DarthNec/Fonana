# User Generations API

## 📋 Обзор

API для управления счетчиком доступных AI генераций пользователя. Позволяет получать текущее количество и обновлять его (устанавливать, увеличивать, уменьшать).

## 🎯 Endpoints

### 1. GET - Получить количество генераций

**`GET /api/user/generations?userWallet=xxx`**

Возвращает текущее количество доступных генераций для пользователя.

#### Query Parameters

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `userWallet` | string | ✅ Да | Адрес кошелька пользователя (wallet или solanaWallet) |

#### Примеры запросов

**JavaScript/Fetch:**
```javascript
const userWallet = 'E1iu9ZfNM7v6zQBX5EaLqHwPBMu8F6Vo7iv2hYbNCu6C';

const response = await fetch(`/api/user/generations?userWallet=${userWallet}`);
const data = await response.json();

console.log(`Available generations: ${data.availableGenerationCount}`);
```

**cURL:**
```bash
curl "http://localhost:3000/api/user/generations?userWallet=E1iu9ZfNM7v6zQBX5EaLqHwPBMu8F6Vo7iv2hYbNCu6C"
```

#### Ответы

**Успешный ответ (200 OK):**
```json
{
  "success": true,
  "availableGenerationCount": 3,
  "user": {
    "id": "clxxx...",
    "nickname": "john_doe",
    "wallet": "E1iu9ZfNM7v6zQBX5EaLqHwPBMu8F6Vo7iv2hYbNCu6C",
    "solanaWallet": "E1iu9ZfNM7v6zQBX5EaLqHwPBMu8F6Vo7iv2hYbNCu6C"
  }
}
```

**Ошибки:**

```json
// 400 - userWallet не указан
{
  "error": "userWallet is required"
}

// 400 - Невалидный формат кошелька
{
  "error": "Invalid wallet format"
}

// 404 - Пользователь не найден
{
  "error": "User not found"
}

// 500 - Внутренняя ошибка
{
  "error": "Failed to fetch generation count",
  "details": "Error message"
}
```

---

### 2. POST - Обновить количество генераций

**`POST /api/user/generations`**

Обновляет количество доступных генераций. Поддерживает три режима:
- **Установить** точное значение (`generationCount`)
- **Увеличить** на N (`increment`)
- **Уменьшить** на N (`decrement`)

#### Request Body

**Вариант 1: Установить точное значение**
```json
{
  "userWallet": "E1iu9ZfNM7v6zQBX5EaLqHwPBMu8F6Vo7iv2hYbNCu6C",
  "generationCount": 10
}
```

**Вариант 2: Увеличить на N**
```json
{
  "userWallet": "E1iu9ZfNM7v6zQBX5EaLqHwPBMu8F6Vo7iv2hYbNCu6C",
  "increment": 5
}
```

**Вариант 3: Уменьшить на N**
```json
{
  "userWallet": "E1iu9ZfNM7v6zQBX5EaLqHwPBMu8F6Vo7iv2hYbNCu6C",
  "decrement": 1
}
```

#### Параметры

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `userWallet` | string | ✅ Да | Адрес кошелька пользователя |
| `generationCount` | number | ⚠️ Один из трех | Установить точное значение (≥ 0) |
| `increment` | number | ⚠️ Один из трех | Увеличить на N (≥ 0) |
| `decrement` | number | ⚠️ Один из трех | Уменьшить на N (≥ 0, результат не может быть < 0) |

⚠️ **Важно**: Должен быть передан **только один** из параметров: `generationCount`, `increment` или `decrement`.

#### Примеры запросов

**JavaScript - Установить значение:**
```javascript
const response = await fetch('/api/user/generations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userWallet: 'E1iu9ZfNM7v6zQBX5EaLqHwPBMu8F6Vo7iv2hYbNCu6C',
    generationCount: 10
  })
});

const data = await response.json();
console.log('New count:', data.availableGenerationCount);
```

**JavaScript - Увеличить (после покупки):**
```javascript
// Пользователь купил 5 дополнительных генераций
const response = await fetch('/api/user/generations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userWallet: 'E1iu9ZfNM7v6zQBX5EaLqHwPBMu8F6Vo7iv2hYbNCu6C',
    increment: 5
  })
});

const data = await response.json();
console.log(`Added 5 generations. New total: ${data.availableGenerationCount}`);
```

**JavaScript - Уменьшить (после использования):**
```javascript
// Пользователь использовал 1 генерацию
const response = await fetch('/api/user/generations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userWallet: 'E1iu9ZfNM7v6zQBX5EaLqHwPBMu8F6Vo7iv2hYbNCu6C',
    decrement: 1
  })
});

const data = await response.json();
console.log(`Used 1 generation. Remaining: ${data.availableGenerationCount}`);
```

**cURL:**
```bash
# Установить значение
curl -X POST http://localhost:3000/api/user/generations \
  -H "Content-Type: application/json" \
  -d '{"userWallet":"E1iu9ZfNM7v6zQBX5EaLqHwPBMu8F6Vo7iv2hYbNCu6C","generationCount":10}'

# Увеличить
curl -X POST http://localhost:3000/api/user/generations \
  -H "Content-Type: application/json" \
  -d '{"userWallet":"E1iu9ZfNM7v6zQBX5EaLqHwPBMu8F6Vo7iv2hYbNCu6C","increment":5}'

# Уменьшить
curl -X POST http://localhost:3000/api/user/generations \
  -H "Content-Type: application/json" \
  -d '{"userWallet":"E1iu9ZfNM7v6zQBX5EaLqHwPBMu8F6Vo7iv2hYbNCu6C","decrement":1}'
```

#### Ответы

**Успешный ответ (200 OK):**
```json
{
  "success": true,
  "availableGenerationCount": 8,
  "previousCount": 3,
  "user": {
    "id": "clxxx...",
    "nickname": "john_doe",
    "wallet": "E1iu9ZfNM7v6zQBX5EaLqHwPBMu8F6Vo7iv2hYbNCu6C",
    "solanaWallet": "E1iu9ZfNM7v6zQBX5EaLqHwPBMu8F6Vo7iv2hYbNCu6C"
  },
  "operation": "increment"
}
```

**Ошибки:**

```json
// 400 - userWallet не указан
{
  "error": "userWallet is required"
}

// 400 - Нет параметра обновления
{
  "error": "generationCount, increment, or decrement is required"
}

// 400 - Передано несколько параметров
{
  "error": "Only one of generationCount, increment, or decrement should be provided"
}

// 400 - Отрицательное значение
{
  "error": "generationCount cannot be negative"
}

// 400 - Попытка уменьшить ниже нуля
{
  "error": "Cannot decrement below zero",
  "currentCount": 2,
  "requestedDecrement": 5
}

// 404 - Пользователь не найден
{
  "error": "User not found"
}

// 500 - Внутренняя ошибка
{
  "error": "Failed to update generation count",
  "details": "Error message"
}
```

---

## 🔄 Типичные сценарии использования

### Сценарий 1: Проверка перед генерацией AI контента

```typescript
// В начале API route для AI генерации
const checkGenerationsAvailable = async (userWallet: string): Promise<boolean> => {
  try {
    const response = await fetch(`/api/user/generations?userWallet=${userWallet}`);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Failed to check generations:', data.error);
      return false;
    }
    
    return data.availableGenerationCount > 0;
  } catch (error) {
    console.error('Error checking generations:', error);
    return false;
  }
};

// Использование
const hasGenerations = await checkGenerationsAvailable(userWallet);

if (!hasGenerations) {
  return NextResponse.json(
    { error: 'No generations available. Please purchase more.' },
    { status: 403 }
  );
}

// Продолжаем генерацию...
```

### Сценарий 2: Использование генерации

```typescript
// После успешной генерации AI контента
const useGeneration = async (userWallet: string): Promise<void> => {
  try {
    const response = await fetch('/api/user/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userWallet,
        decrement: 1
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to use generation');
    }
    
    console.log(`Generation used. Remaining: ${data.availableGenerationCount}`);
  } catch (error) {
    console.error('Error using generation:', error);
    throw error;
  }
};

// Использование
await useGeneration(userWallet);
```

### Сценарий 3: Покупка дополнительных генераций

```typescript
// После успешной оплаты
const addGenerations = async (
  userWallet: string, 
  count: number
): Promise<number> => {
  try {
    const response = await fetch('/api/user/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userWallet,
        increment: count
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to add generations');
    }
    
    console.log(`Added ${count} generations. New total: ${data.availableGenerationCount}`);
    return data.availableGenerationCount;
  } catch (error) {
    console.error('Error adding generations:', error);
    throw error;
  }
};

// Использование
await addGenerations(userWallet, 10); // Добавить 10 генераций
```

### Сценарий 4: React Hook для управления генерациями

```typescript
import { useState, useEffect } from 'react';

export function useGenerations(userWallet: string | null) {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCount = async () => {
    if (!userWallet) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/user/generations?userWallet=${userWallet}`);
      const data = await response.json();
      
      if (response.ok) {
        setCount(data.availableGenerationCount);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const useGeneration = async () => {
    if (!userWallet) return false;
    
    try {
      const response = await fetch('/api/user/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userWallet, decrement: 1 })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setCount(data.availableGenerationCount);
        return true;
      } else {
        setError(data.error);
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  const addGenerations = async (amount: number) => {
    if (!userWallet) return false;
    
    try {
      const response = await fetch('/api/user/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userWallet, increment: amount })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setCount(data.availableGenerationCount);
        return true;
      } else {
        setError(data.error);
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  useEffect(() => {
    fetchCount();
  }, [userWallet]);

  return {
    count,
    loading,
    error,
    useGeneration,
    addGenerations,
    refresh: fetchCount
  };
}

// Использование в компоненте
function GenerationCounter() {
  const { publicKey } = useWallet();
  const { count, loading, useGeneration } = useGenerations(
    publicKey?.toBase58() || null
  );

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <p>Available generations: {count ?? 0}</p>
      <button onClick={useGeneration}>Use Generation</button>
    </div>
  );
}
```

---

## 🔐 Безопасность

⚠️ **ВАЖНО**: Эти endpoints **НЕ требуют аутентификации**.

### Рекомендации по безопасности:

1. **Добавить аутентификацию** для production:
   ```typescript
   // Проверка JWT токена
   const token = request.headers.get('Authorization')?.replace('Bearer ', '');
   if (!token) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
   }
   ```

2. **Rate Limiting** - ограничить количество запросов

3. **Логирование** - отслеживать все изменения счетчика

4. **Валидация прав** - проверять, что пользователь изменяет только свой счетчик

---

## 📊 Логирование

API логирует все операции:

```
[API/user/generations] Starting GET request
[API/user/generations] Fetching user: E1iu9Zf...
[API/user/generations] User found: { id, nickname, availableGenerationCount }

[API/user/generations] Starting POST request
[API/user/generations] Current generation count: 3
[API/user/generations] Update params: { increment: 5 }
[API/user/generations] User updated successfully: { previousCount: 3, newCount: 8 }
```

---

## 🧪 Тестирование

```typescript
describe('User Generations API', () => {
  const testWallet = 'TEST_WALLET_ADDRESS';
  
  it('should get generation count', async () => {
    const res = await fetch(`/api/user/generations?userWallet=${testWallet}`);
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(typeof data.availableGenerationCount).toBe('number');
  });
  
  it('should set generation count', async () => {
    const res = await fetch('/api/user/generations', {
      method: 'POST',
      body: JSON.stringify({
        userWallet: testWallet,
        generationCount: 10
      })
    });
    const data = await res.json();
    
    expect(data.availableGenerationCount).toBe(10);
  });
  
  it('should increment generation count', async () => {
    const res = await fetch('/api/user/generations', {
      method: 'POST',
      body: JSON.stringify({
        userWallet: testWallet,
        increment: 5
      })
    });
    const data = await res.json();
    
    expect(data.availableGenerationCount).toBe(data.previousCount + 5);
  });
});
```

---

## 📝 Связанные файлы

- **API Route**: `app/api/user/generations/route.ts`
- **Prisma Schema**: `prisma/schema.prisma` (модель User, поле `availableGenerationCount`)
- **Migration**: `prisma/migrations/20251027000000_add_available_generation_count_to_users/`

---

**Дата создания**: 27 октября 2025  
**Версия API**: v1  
**Статус**: ✅ Готово к использованию

