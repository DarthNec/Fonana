# 🛠️ ПЛАН РЕШЕНИЯ - CREATE POST 405 ERROR

**ID маркировки**: [create_post_405_2025_017]  
**Дата создания**: 17.07.2025, 17:40 UTC  
**Приоритет**: 🔴 КРИТИЧЕСКИЙ

## 🎯 ЗАДАЧА
Исправить ошибку 405 Method Not Allowed при создании постов через API `/api/posts` и устранить связанные ошибки схемы Prisma.

## 🔍 АНАЛИЗ ПРОБЛЕМЫ

### ОСНОВНАЯ ПРОБЛЕМА
1. **API `/api/posts` не поддерживает POST метод** - только GET реализован
2. **getUserByWallet функция использует несуществующие поля** - `solanaWallet` не существует в БД
3. **Frontend готов к созданию постов**, но backend блокирует весь поток

### ОБНАРУЖЕННЫЕ ОШИБКИ PRISMA
```
Unknown argument `solanaWallet`. Available options are marked with ?.
Unknown argument `paymentStatus`. Available options are marked with ?.  
Unknown field `referrer` for include statement on model `User`. Available options are marked with ?.
```

## 📋 ПЛАН РЕШЕНИЯ

### ФАЗА 1: ИСПРАВЛЕНИЕ API POSTS [30 мин]
**Цель**: Добавить POST метод в `/api/posts/route.ts`

#### Задачи:
1. **Создать POST функцию** в app/api/posts/route.ts
2. **Использовать упрощенную схему** без сложных связей  
3. **Валидация данных** по реальной структуре БД
4. **Обработка медиа файлов** (thumbnail, mediaUrl)
5. **Автоинкремент postsCount** у пользователя

#### Входные данные (из frontend):
```json
{
  "userWallet": "string",
  "title": "string", 
  "content": "string",
  "type": "image|text|video",
  "category": "string",
  "tags": "array",
  "thumbnail": "string",
  "mediaUrl": "string", 
  "isLocked": "boolean",
  "accessType": "free|paid",
  "imageAspectRatio": "string",
  "isSellable": "boolean"
}
```

#### Выходные данные:
```json
{
  "success": true,
  "post": {
    "id": "string",
    "title": "string",
    "createdAt": "datetime",
    "creator": "object"
  }
}
```

### ФАЗА 2: ИСПРАВЛЕНИЕ ФУНКЦИИ getUserByWallet [15 мин]
**Цель**: Устранить ошибки Prisma в lib/db.ts

#### Задачи:
1. **Убрать поле `solanaWallet`** из поиска пользователя
2. **Использовать только `wallet`** поле для идентификации
3. **Тестировать поиск пользователя** перед созданием поста

### ФАЗА 3: ИСПРАВЛЕНИЕ СВЯЗАННЫХ API [20 мин]  
**Цель**: Устранить все Prisma ошибки в других endpoints

#### Задачи:
1. **Исправить `/api/user/route.ts`** - убрать `referrer` include
2. **Исправить `/api/subscriptions/check/route.ts`** - убрать `paymentStatus` фильтр
3. **Проверить все API endpoints** на совместимость с реальной схемой БД

### ФАЗА 4: ТЕСТИРОВАНИЕ И ВАЛИДАЦИЯ [15 мин]
**Цель**: Убедиться что создание постов работает end-to-end

#### Задачи:
1. **Тестирование через curl** - POST запрос к `/api/posts`
2. **Тестирование через frontend** - модалка создания поста
3. **Проверка в БД** - новый пост появляется
4. **Проверка счетчиков** - postsCount увеличивается
5. **Проверка отображения** - пост показывается в feed/creators

## 🔧 ТЕХНИЧЕСКИЕ ДЕТАЛИ

### POST /api/posts СТРУКТУРА
```typescript
export async function POST(request: NextRequest) {
  try {
    // 1. Валидация входных данных
    // 2. Поиск пользователя по wallet (только wallet поле)
    // 3. Создание поста в БД
    // 4. Инкремент postsCount
    // 5. Возврат созданного поста
  } catch (error) {
    // Обработка ошибок
  }
}
```

### ОБЯЗАТЕЛЬНЫЕ ПОЛЯ ДЛЯ СОЗДАНИЯ ПОСТА
- `userWallet` (string) - кошелек создателя
- `type` (string) - тип поста: "text", "image", "video"
- Для type !== "text": `mediaUrl` ИЛИ `thumbnail`

### ОПЦИОНАЛЬНЫЕ ПОЛЯ
- `title`, `content`, `category`, `tags[]`
- `isLocked`, `isPremium`, `price`, `currency`
- `imageAspectRatio`, `isSellable`

## 🎯 КРИТЕРИИ УСПЕХА

### ✅ ТЕХНИЧЕСКИЕ КРИТЕРИИ
1. **POST /api/posts возвращает 201 Created**
2. **Нет Prisma ошибок в логах**
3. **Пост появляется в БД** с корректными данными
4. **postsCount увеличивается** у пользователя
5. **Медиа файлы корректно сохранены**

### ✅ UX КРИТЕРИИ  
1. **Модалка создания поста работает** без ошибок
2. **Созданный пост отображается** в feed
3. **Счетчики обновляются** на страницах креаторов
4. **Время создания < 3 секунд**

## ⚠️ РИСКИ И МИТИГАЦИЯ

### РИСК 1: Несовместимость с медиа файлами
**Митигация**: Тестировать с существующими файлами из `/media/posts/`

### РИСК 2: Нарушение связей в БД
**Митигация**: Использовать только проверенные поля из реальной схемы

### РИСК 3: Регрессия в других API
**Митигация**: Тестировать /api/creators и /api/posts GET после изменений

## 📊 ВРЕМЕЙН
- **Фаза 1**: 30 мин - Создание POST API
- **Фаза 2**: 15 мин - Исправление getUserByWallet  
- **Фаза 3**: 20 мин - Исправление связанных API
- **Фаза 4**: 15 мин - Тестирование
- **ИТОГО**: 80 минут (1.33 часа)

## 🔄 ОТКАТ В СЛУЧАЕ ПРОБЛЕМ
1. **Сохранить backup** текущих API файлов
2. **Документировать изменения** для быстрого отката
3. **Тестировать на отдельной ветке** перед merge 