# Migration: Add availableGenerationCount to users

## Дата: 27 октября 2025

## Описание

Добавлено новое поле `availableGenerationCount` в таблицу `users` для отслеживания доступного количества генераций AI контента для пользователя.

## Изменения в схеме

### Новое поле в модели User

```prisma
availableGenerationCount Int @default(3)
```

### SQL миграция

```sql
ALTER TABLE "users" ADD COLUMN "availableGenerationCount" INTEGER NOT NULL DEFAULT 3;
```

## Параметры поля

- **Название**: `availableGenerationCount`
- **Тип**: `Int` (PostgreSQL: `INTEGER`)
- **Значение по умолчанию**: `3`
- **NOT NULL**: Да
- **Описание**: Количество доступных генераций AI контента (фото/видео) для пользователя

## Применение миграции

Выполните команду:

```bash
npx prisma migrate deploy
```

Или для dev окружения:

```bash
npx prisma migrate dev
```

## Откат миграции

Для отката выполните:

```sql
ALTER TABLE "users" DROP COLUMN "availableGenerationCount";
```

## Использование в коде

### Получение доступных генераций

```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { availableGenerationCount: true }
});

console.log(`Available generations: ${user.availableGenerationCount}`);
```

### Уменьшение счетчика при использовании

```typescript
// После успешной генерации AI контента
await prisma.user.update({
  where: { id: userId },
  data: {
    availableGenerationCount: {
      decrement: 1
    }
  }
});
```

### Проверка доступности генерации

```typescript
const user = await prisma.user.findUnique({
  where: { id: userId }
});

if (user.availableGenerationCount <= 0) {
  throw new Error('No generations available. Please purchase more.');
}

// Выполняем генерацию...
```

### Пополнение счетчика

```typescript
// При покупке дополнительных генераций
await prisma.user.update({
  where: { id: userId },
  data: {
    availableGenerationCount: {
      increment: 10 // добавляем 10 генераций
    }
  }
});
```

## API Integration

### GET /api/user - добавится в ответ

```typescript
{
  "user": {
    "id": "...",
    "availableGenerationCount": 3,
    // ... other fields
  }
}
```

### POST /api/sora/mobile - проверка перед генерацией

```typescript
// В начале route
const user = await prisma.user.findUnique({
  where: { id: userId }
});

if (user.availableGenerationCount <= 0) {
  return NextResponse.json(
    { error: 'No generations available' },
    { status: 403 }
  );
}

// После успешной генерации
await prisma.user.update({
  where: { id: userId },
  data: {
    availableGenerationCount: { decrement: 1 }
  }
});
```

## Влияние на систему

### Затронутые таблицы
- ✅ `users` - добавлена новая колонка

### Затронутые API endpoints (потенциально)
- `/api/user` - будет возвращать новое поле
- `/api/sora/mobile` - должен проверять и уменьшать счетчик
- `/api/createAI` - должен проверять и уменьшать счетчик

### Совместимость
- ✅ Обратная совместимость: Да (значение по умолчанию установлено)
- ✅ Breaking changes: Нет
- ✅ Существующие пользователи: Получат значение `3` автоматически

## Тестирование

После применения миграции проверьте:

1. ✅ Новые пользователи создаются с `availableGenerationCount = 3`
2. ✅ Существующие пользователи имеют `availableGenerationCount = 3`
3. ✅ Можно обновлять значение через API
4. ✅ Можно использовать `increment` и `decrement`

```sql
-- Проверка в БД
SELECT id, nickname, "availableGenerationCount" FROM users LIMIT 10;

-- Проверка значения по умолчанию у существующих пользователей
SELECT COUNT(*) as users_with_default_count 
FROM users 
WHERE "availableGenerationCount" = 3;
```

## Связанные файлы

- `prisma/schema.prisma` - обновлена модель User (строка 39)
- `prisma/migrations/20251027000000_add_available_generation_count_to_users/migration.sql` - SQL миграция

## Примечания

- Значение `3` выбрано как начальное количество бесплатных генераций для каждого пользователя
- В будущем можно добавить механизм пополнения через покупки или подписки
- Рекомендуется добавить логирование изменений счетчика для аналитики

