# 📋 SOLUTION PLAN v1: Database Migration Implementation

**Дата**: 2025-01-16  
**Версия**: v1  
**Задача**: Импорт дампа Supabase в локальную PostgreSQL  
**Методология**: IDEAL_METHODOLOGY.md

## 🎯 Цель решения

Восстановить функциональность страниц `/feed` и `/creators` путем импорта данных из Supabase дампа и настройки корректной работы API endpoints.

## 🔍 Ключевые открытия

### 🔴 КРИТИЧЕСКАЯ ПРОБЛЕМА:
- **База данных ПУСТА**: Таблицы не созданы (`relation "users" does not exist`)
- **isCreator флаг**: Используется во ВСЕХ API endpoints для creators (обязательный)

### 📊 Анализ дампа:
- 10 пользователей без `isCreator` флага
- 10 постов без `content` поля  
- Отсутствуют комментарии, лайки, подписки

## 📝 Пошаговый план имплементации

### **ЭТАП 1: Подготовка базы данных** ⏱️ 5 мин
```bash
# 1.1 Применить миграции Prisma (создать таблицы)
npx prisma migrate deploy

# 1.2 Проверить создание таблиц
PGPASSWORD=postgres psql -h localhost -U postgres -d fonana_dev -c "\dt"

# 1.3 Создать backup точку
PGPASSWORD=postgres pg_dump -h localhost -U postgres fonana_dev > backup_empty_$(date +%Y%m%d_%H%M%S).sql
```

### **ЭТАП 2: Импорт данных** ⏱️ 3 мин
```bash
# 2.1 Импорт SQL дампа
PGPASSWORD=postgres psql -h localhost -U postgres -d fonana_dev -f import-sample-data.sql

# 2.2 Проверка импорта
PGPASSWORD=postgres psql -h localhost -U postgres -d fonana_dev -c "
SELECT COUNT(*) as users_imported FROM users;
SELECT COUNT(*) as posts_imported FROM posts;
SELECT nickname, wallet FROM users LIMIT 3;
"
```

### **ЭТАП 3: Критические исправления** ⏱️ 5 мин
```sql
-- 3.1 ОБЯЗАТЕЛЬНО: Установить isCreator=true для всех пользователей с постами
UPDATE users 
SET "isCreator" = true 
WHERE id IN (
  SELECT DISTINCT "creatorId" FROM posts WHERE "creatorId" IS NOT NULL
);

-- 3.2 Добавить базовый content для постов (если отсутствует)
UPDATE posts 
SET content = title || ' - Imported from Supabase'
WHERE content IS NULL OR content = '';

-- 3.3 Проверка результатов
SELECT nickname, "isCreator" FROM users WHERE "isCreator" = true;
SELECT title, content FROM posts LIMIT 3;
```

### **ЭТАП 4: Тестирование API** ⏱️ 5 мин
```bash
# 4.1 Тест API creators
curl "http://localhost:3000/api/creators" | jq '.creators | length'

# 4.2 Тест API posts  
curl "http://localhost:3000/api/posts" | jq '.posts | length'

# 4.3 Проверка ответов (должны быть данные, не пустые массивы)
```

### **ЭТАП 5: Тестирование Frontend** ⏱️ 10 мин
```typescript
// 5.1 Открыть браузер и проверить страницы:
http://localhost:3000/creators  // Должны быть пользователи
http://localhost:3000/feed      // Должны быть посты

// 5.2 Проверить отсутствие ошибок в консоли браузера
// 5.3 Проверить фильтрацию по категориям
```

## 🔧 Context7 проверки

### **Prisma ORM**:
- ✅ Версия 5.22.0 стабильна  
- ✅ PostgreSQL provider корректен
- ✅ Миграции применяются через `prisma migrate deploy`

### **PostgreSQL**:
- ✅ Локальная установка работает
- ✅ Connection string корректен
- ✅ Команды psql функционируют

## 🚀 Альтернативные подходы

### **Подход A: Прямой SQL импорт** ✅ ВЫБРАН
- **Плюсы**: Быстро, просто, надежно
- **Минусы**: Нет автоматизации для будущего
- **Риск**: Низкий

### **Подход B: Скрипт supabase-to-local.sh**
- **Плюсы**: Автоматизированный
- **Минусы**: Требует доступ к Supabase, сложнее debug
- **Риск**: Средний

### **Подход C: Создание seed скрипта**  
- **Плюсы**: Контролируемые тестовые данные
- **Минусы**: Много работы, не реальные данные
- **Риск**: Низкий, но много времени

## 📊 Метрики успеха

### **Quantifiable Goals**:
1. **Database**: 10 users + 10 posts импортированы ✅
2. **API Response Time**: `/api/creators` < 500ms ⏱️
3. **Frontend Loading**: Страницы загружаются без ошибок ✅
4. **Creator Detection**: isCreator=true для всех авторов ✅
5. **Zero Errors**: Консоль браузера без ошибок ✅

### **Success Criteria**:
- `/creators` показывает список пользователей (не "No creators")
- `/feed` показывает список постов (не "Loading posts...")  
- API возвращает данные (не пустые массивы)
- Фильтрация по категориям работает

## 🔄 Rollback Plan

Если что-то пойдет не так:
```bash
# Восстановление из backup
PGPASSWORD=postgres psql -h localhost -U postgres -d fonana_dev < backup_empty_TIMESTAMP.sql

# Альтернатива: пересоздание схемы
npx prisma migrate reset --force
```

## 📋 Следующие этапы

1. ✅ SOLUTION_PLAN.md v1 завершен
2. ⏳ Создать IMPACT_ANALYSIS.md v1  
3. ⏳ Проверить риски и конфликты
4. ⏳ Запустить итеративный цикл если нужно
5. ⏳ Получить одобрение на имплементацию

## 💡 Дополнительные улучшения (опционально)

После успешного импорта можно добавить:
- Тестовые комментарии и лайки
- Подписки между пользователями  
- Медиа файлы для постов
- Дополнительные категории и теги 