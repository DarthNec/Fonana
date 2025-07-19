# SOLUTION_PLAN: Post Creation 500 Error Fix
**ID**: [post_creation_500_error_2025_017]  
**Дата**: 17 января 2025  
**Время**: 14:30 UTC  

## 🎯 ЦЕЛЬ РЕШЕНИЯ
Восстановить функциональность создания постов с изображениями через CreatePostModal, устранив 500 Internal Server Error.

## 📊 ПЛАН ВЫПОЛНЕНИЯ

### **ФАЗА 1: Диагностика текущего состояния** (10 минут)
**Цель**: Подтвердить точную причину ошибки через логи и тестирование

#### Шаг 1.1: Проверка серверных логов
- Воспроизвести ошибку создания поста с изображением
- Получить полный stack trace из серверных логов
- Идентифицировать точную строку где происходит ошибка

#### Шаг 1.2: Анализ Prisma client статуса  
- Проверить текущее состояние Prisma client
- Сравнить схему с сгенерированным client
- Выявить несоответствия после последних изменений

#### Ожидаемые результаты:
- ✅ Полный stack trace ошибки 500
- ✅ Понимание состояния Prisma client
- ✅ Подтверждение проблемы с imageAspectRatio и referrer

---

### **ФАЗА 2: Исправление Prisma и схемы** (15 минут)
**Цель**: Устранить ошибки на уровне базы данных и схемы

#### Шаг 2.1: Регенерация Prisma client
```bash
npx prisma generate --force
```

#### Шаг 2.2: Исправление referrer field в API
- Найти все места использования `include: { referrer: ... }`
- Заменить на корректную структуру или убрать if not needed
- Проверить что Prisma client поддерживает referrer связи

#### Шаг 2.3: Валидация схемы
- Убедиться что все поля в схеме соответствуют БД
- Проверить типы данных в Post модели
- Подтвердить корректность referrer/referrals связей

#### Ожидаемые результаты:
- ✅ Обновленный Prisma client без ошибок
- ✅ Исправленные API endpoints без referrer ошибок  
- ✅ Валидная схема соответствующая БД

---

### **ФАЗА 3: Исправление imageAspectRatio mapping** (20 минут)
**Цель**: Создать корректное преобразование строковых аспектов в числовые

#### Шаг 3.1: Анализ CreatePostModal логики
- Найти где формируется `imageAspectRatio: "horizontal"`
- Понять логику определения aspect ratio по изображению
- Проверить возможные значения: horizontal, vertical, square

#### Шаг 3.2: Создание transformation функции
Создать mapping функцию:
```javascript
function mapAspectRatioToNumber(aspectRatio, imageFile) {
  const map = {
    'horizontal': 1.33, // 4:3 landscape
    'vertical': 0.75,   // 3:4 portrait  
    'square': 1.0       // 1:1 square
  };
  return map[aspectRatio] || 1.0;
}
```

#### Шаг 3.3: Интеграция в API
- Обновить `/api/posts/route.ts` для обработки строковых аспектов
- Добавить валидацию и трансформацию входящих данных
- Сохранить обратную совместимость с числовыми значениями

#### Ожидаемые результаты:
- ✅ Функция преобразования аспектов
- ✅ Обновленная API логика обработки
- ✅ Поддержка и строковых и числовых значений

---

### **ФАЗА 4: Тестирование и валидация** (15 минут)
**Цель**: Подтвердить исправление через comprehensive тестирование

#### Шаг 4.1: API тестирование через curl
```bash
# Тест с корректными данными
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{
    "userWallet": "5PJWbd52aontoqVh4MeDfF6XKzvwFvpYFVxtqaiZzFBD",
    "type": "image", 
    "category": "Art",
    "title": "Test Image Post",
    "content": "Testing image post creation",
    "imageAspectRatio": "horizontal",
    "mediaUrl": "/media/posts/test.jpg",
    "isSellable": false
  }'
```

#### Шаг 4.2: Frontend тестирование через Playwright
- Открыть CreatePostModal через браузер
- Загрузить реальное изображение
- Пройти полный flow создания поста
- Подтвердить успешное создание и отображение

#### Шаг 4.3: Проверка базы данных
- Убедиться что пост создался с корректными данными
- Проверить что imageAspectRatio сохранилось как DECIMAL
- Валидировать все остальные поля

#### Ожидаемые результаты:
- ✅ API возвращает 201 Created вместо 500 Error
- ✅ Frontend успешно создает посты с изображениями
- ✅ База данных содержит корректные данные

---

## ⚙️ ТЕХНИЧЕСКИЕ ДЕТАЛИ

### Файлы для изменения:
1. **`app/api/posts/route.ts`** - добавить imageAspectRatio mapping
2. **`app/api/user/route.ts`** - исправить referrer field usage  
3. **`prisma/schema.prisma`** - если нужны корректировки схемы
4. **Prisma client** - регенерация

### Функции для реализации:
```typescript
// В /api/posts/route.ts
function transformAspectRatio(value: string | number): number {
  if (typeof value === 'number') return value;
  
  const aspectMap: Record<string, number> = {
    'horizontal': 1.33,
    'vertical': 0.75, 
    'square': 1.0
  };
  
  return aspectMap[value] || 1.0;
}
```

### Валидация данных:
```typescript
// Валидация входящих данных
function validatePostData(data: any) {
  return {
    ...data,
    imageAspectRatio: data.imageAspectRatio ? 
      transformAspectRatio(data.imageAspectRatio) : null
  };
}
```

## 🔧 RISK ASSESSMENT

### Низкий риск:
- ✅ Изменения ограничены API слоем
- ✅ База данных не изменяется
- ✅ Frontend остается unchanged

### Средний риск:
- ⚠️ Prisma client regeneration может затронуть другие компоненты
- ⚠️ Изменения в API могут повлиять на существующие посты

### Высокий риск:
- 🔴 Нет - все изменения reversible

## 📈 КРИТЕРИИ УСПЕХА

### Функциональные:
1. POST запрос к `/api/posts` возвращает 201 Created
2. CreatePostModal успешно создает посты с изображениями  
3. Посты отображаются в feed с корректными aspect ratios
4. Нет 500 ошибок в серверных логах

### Нефункциональные:
1. API response time < 2 секунды
2. Отсутствие memory leaks после изменений
3. Обратная совместимость с существующими постами
4. Чистые логи без Prisma validation ошибок

## ⏱️ ВРЕМЕННАЯ ОЦЕНКА

- **Общее время**: 60 минут
- **Фаза 1**: 10 минут (диагностика)
- **Фаза 2**: 15 минут (Prisma исправления)  
- **Фаза 3**: 20 минут (imageAspectRatio mapping)
- **Фаза 4**: 15 минут (тестирование)

## 🚀 ROLLBACK ПЛАН

В случае проблем:
1. Откатить изменения в `/api/posts/route.ts`
2. Восстановить предыдущую версию Prisma client: `git checkout HEAD~1 -- lib/generated/`
3. Перезапустить dev server
4. Валидировать что basic API функциональность работает

---
**Статус**: Готов к реализации  
**Следующий этап**: IMPLEMENTATION_REPORT.md (после выполнения) 