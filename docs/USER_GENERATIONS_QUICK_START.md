# 🚀 User Generations API - Quick Start

## ✅ Что это?

API для управления счетчиком AI генераций пользователя. Каждый пользователь получает **3 бесплатные генерации** при регистрации.

## 📁 Файлы

- **API**: `app/api/user/generations/route.ts`
- **Документация**: `docs/API_USER_GENERATIONS.md`
- **Миграция БД**: `prisma/migrations/20251027000000_add_available_generation_count_to_users/`

## 🎯 Основные операции

### 1️⃣ Получить количество генераций

```javascript
const response = await fetch(`/api/user/generations?userWallet=${wallet}`);
const { availableGenerationCount } = await response.json();

console.log(`Available: ${availableGenerationCount}`);
```

### 2️⃣ Использовать генерацию (уменьшить на 1)

```javascript
await fetch('/api/user/generations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userWallet: wallet,
    decrement: 1
  })
});
```

### 3️⃣ Добавить генерации (покупка)

```javascript
await fetch('/api/user/generations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userWallet: wallet,
    increment: 5 // добавить 5 генераций
  })
});
```

### 4️⃣ Установить точное значение

```javascript
await fetch('/api/user/generations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userWallet: wallet,
    generationCount: 10 // установить 10
  })
});
```

## 🔄 Интеграция в AI генерацию

### В `/api/sora/mobile/route.ts`:

```typescript
// 1. Проверяем доступные генерации
const checkResponse = await fetch(
  `/api/user/generations?userWallet=${userWallet}`
);
const { availableGenerationCount } = await checkResponse.json();

if (availableGenerationCount <= 0) {
  return NextResponse.json(
    { error: 'No generations available' },
    { status: 403 }
  );
}

// 2. Выполняем генерацию...
const soraResponse = await generateVideo(prompt);

// 3. Если успешно - уменьшаем счетчик
if (soraResponse.success) {
  await fetch('/api/user/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userWallet,
      decrement: 1
    })
  });
}
```

## 📱 React компонент

```typescript
function GenerationsDisplay() {
  const { publicKey } = useWallet();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!publicKey) return;
    
    fetch(`/api/user/generations?userWallet=${publicKey.toBase58()}`)
      .then(res => res.json())
      .then(data => setCount(data.availableGenerationCount));
  }, [publicKey]);

  return (
    <div className="flex items-center gap-2">
      <span>🎨 Generations:</span>
      <span className="font-bold">{count}</span>
    </div>
  );
}
```

## ⚠️ Важно

- ✅ По умолчанию: **3 генерации** для каждого пользователя
- ✅ Нельзя уйти в минус (защита встроена)
- ✅ Поддерживает оба типа кошельков: `wallet` и `solanaWallet`
- ⚠️ Без аутентификации (добавь JWT для production)

## 🗄️ Применение миграции

Не забудь применить миграцию БД:

```bash
npx prisma migrate deploy
```

Или для dev:

```bash
npx prisma migrate dev
```

## 📚 Полная документация

См. `docs/API_USER_GENERATIONS.md` для:
- Детального описания параметров
- Примеров для всех сценариев
- React hooks
- Рекомендаций по безопасности
- Тестирования

---

**Готово!** API работает и готов к использованию. 🎉

