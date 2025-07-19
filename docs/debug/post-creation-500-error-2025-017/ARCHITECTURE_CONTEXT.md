# ARCHITECTURE_CONTEXT: Post Creation 500 Error Analysis
**ID**: [post_creation_500_error_2025_017]  
**Дата**: 17 января 2025  
**Время**: 14:25 UTC  

## 🔍 ОБНАРУЖЕННАЯ ПРОБЛЕМА

### Симптомы
- **Основной симптом**: POST запрос к `/api/posts` возвращает 500 Internal Server Error
- **Trigger**: Попытка создать пост с изображением через CreatePostModal
- **Frontend log**: "Failed to create post" после отправки данных с изображением
- **Server status**: 500 ошибка при обработке запроса

### Данные запроса от frontend
```json
{
  "userWallet": "5PJWbd52aontoqVh4MeDfF6XKzvwFvpYFVxtqaiZzFBD",
  "title": "",
  "content": "", 
  "type": "image",
  "category": "Art",
  "tags": [],
  "thumbnail": "/posts/images/thumb_46dfc2e43a9e77dbea23d5940f0ea380.webp",
  "mediaUrl": "/posts/images/46dfc2e43a9e77dbea23d5940f0ea380.JPG",
  "isLocked": false,
  "accessType": "free",
  "imageAspectRatio": "horizontal",  // ❌ ПРОБЛЕМА: строка вместо числа
  "isSellable": false
}
```

### Серверные логи (из консоли)
- **Ошибка #1**: `Unknown field 'referrer' for include statement on model User` в `/api/user/route.ts`
- **Ошибка #2**: `Unknown argument 'imageAspectRatio'` в `/api/posts/route.ts` (из предыдущих тестов)

## 🏗️ АРХИТЕКТУРНЫЙ АНАЛИЗ

### Корневые причины

#### 1. **Несоответствие типов данных imageAspectRatio**
- **Frontend отправляет**: `"horizontal"` (string)
- **Prisma схема ожидает**: DECIMAL(5,3) (number)
- **База данных**: поле `imageAspectRatio` типа DECIMAL

#### 2. **Проблема с полем referrer в User модели**
- **Prisma схема**: Добавлены поля `referrerId` и связи `referrer`/`referrals`
- **Prisma client**: Не перегенерировался полностью после изменений схемы
- **API код**: Использует `include: { referrer: ... }` которое не распознается

### Затронутые компоненты
1. **Frontend**: `CreatePostModal.tsx` - отправляет строковые значения аспекта
2. **Backend API**: `/api/posts/route.ts` - обрабатывает POST запросы на создание постов
3. **Backend API**: `/api/user/route.ts` - использует несуществующее поле referrer
4. **Prisma Schema**: `prisma/schema.prisma` - модель Post с DECIMAL полем
5. **Database**: PostgreSQL таблица posts с правильной структурой

### Системное воздействие
- **Критичность**: HIGH - блокирует создание постов с изображениями
- **Пользовательский опыт**: Полная недоступность функции создания медиа контента
- **Дополнительные эффекты**: Логи засоряются ошибками referrer field

## 🔧 ТЕХНИЧЕСКАЯ ДИАГНОСТИКА

### Проверенные компоненты
- ✅ **База данных**: поля `imageAspectRatio` и `isSellable` добавлены корректно
- ✅ **Prisma схема**: поля присутствуют в модели Post  
- ❌ **Prisma client**: может быть устаревший после изменений схемы
- ❌ **Frontend валидация**: отправляет строки вместо чисел для аспекта

### Несоответствия в данных
1. **imageAspectRatio mapping**:
   - Frontend: `"horizontal"` | `"vertical"` | `"square"`
   - Backend ожидает: число (например, 1.33, 0.75, 1.0)
   
2. **referrer field access**:
   - Code ожидает: `include: { referrer: { select: {...} } }`
   - Prisma возвращает: "Unknown field referrer"

### Логика обработки
- POST запрос проходит валидацию до уровня Prisma
- Ошибка возникает при попытке создать запись в БД через Prisma
- Prisma client не может интерпретировать полученные данные

## 📋 СЛЕДУЮЩИЕ ШАГИ АНАЛИЗА

### Необходимые проверки
1. **Проверить актуальность Prisma client** - возможно нужна регенерация
2. **Проанализировать маппинг аспектов** - как преобразовать строки в числа
3. **Исправить referrer field usage** - обновить API код или схему
4. **Протестировать с числовыми значениями** - подтвердить исправление

### Файлы для изучения
- `app/api/posts/route.ts` - логика создания постов
- `app/api/user/route.ts` - использование referrer field
- `components/CreatePostModal.tsx` - формирование данных запроса
- `prisma/schema.prisma` - структура моделей
- `lib/db.ts` - функции работы с БД

## 🎯 ОЖИДАЕМОЕ РЕШЕНИЕ

### Краткосрочное исправление
1. Исправить маппинг `imageAspectRatio` в CreatePostModal 
2. Убрать или исправить usage referrer field в API
3. Перегенерировать Prisma client
4. Протестировать создание поста с изображением

### Долгосрочная архитектура
1. Создать валидацию данных на уровне API
2. Добавить трансформацию строковых аспектов в числовые
3. Унифицировать обработку referrer логики
4. Добавить comprehensive error handling для Prisma ошибок

---
**Статус**: Готов к планированию решения  
**Следующий этап**: SOLUTION_PLAN.md 