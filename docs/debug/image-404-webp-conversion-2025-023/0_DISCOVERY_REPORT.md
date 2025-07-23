# 🔍 DISCOVERY REPORT: WebP Image 404 Errors

**Задача:** Исправить 404 ошибки при загрузке WebP изображений постов  
**Дата:** 2025-01-23  
**Методология:** IDEAL M7  

## 📊 РЕАЛЬНАЯ ПРОБЛЕМА (КОНТЕКСТ АРХИТЕКТУРЫ)

### ❌ Что я изначально думал:
- "Next.js не может отдать static files" - НЕВЕРНО!
- "Нужно создать новый API endpoint" - НЕВЕРНО!

### ✅ Что РЕАЛЬНО происходит:

#### 1. **МЫ УЖЕ ИМПЛЕМЕНТИРОВАЛИ MEDIA API СИСТЕМУ:**
- `/api/media/[...path]/route.ts` с smart conditional headers strategy
- Nginx конфигурация с X-Accel-Redirect support
- Полная система access control с monetization

#### 2. **transformMediaUrl КОНВЕРТИРУЕТ ПУТИ:**
```typescript
// lib/utils/mediaUrl.ts конвертирует:
/posts/images/file.JPG → /posts/images/file.webp
```

#### 3. **НО БРАУЗЕР ДЕЛАЕТ ПРЯМЫЕ STATIC REQUESTS:**
```
// Браузер запрашивает:
GET /posts/images/c6fcc7504f697b380017f94789bd0826.webp
// Это НЕ проходит через /api/media/!
```

#### 4. **WEBP ФАЙЛЫ НЕ СОЗДАНЫ НА ДИСКЕ:**
- На сервере: `c6fcc7504f697b380017f94789bd0826.JPG` ✅ существует
- На сервере: `c6fcc7504f697b380017f94789bd0826.webp` ❌ НЕ существует

## 🔍 ROOT CAUSE ANALYSIS

### ⚠️ РАЗРЫВ В АРХИТЕКТУРЕ:

1. **Upload System**: Загружает JPG файлы в `/public/posts/images/`
2. **Database**: Сохраняет пути как JPG (`/posts/images/file.JPG`)
3. **transformMediaUrl**: Конвертирует JPG пути в WebP для frontend
4. **Browser**: Запрашивает WebP файлы как static files
5. **File System**: НЕ СОДЕРЖИТ WebP файлы ❌

### 🎯 КЛЮЧЕВОЙ ВОПРОС:
**Должны ли `/posts/images/` запросы проходить через `/api/media/` или как static files?**

## 📋 АРХИТЕКТУРНЫЕ ВАРИАНТЫ

### Option A: Static Files (текущий подход)
- **Pros**: Быстрее, кэшируется браузером, меньше нагрузки на сервер
- **Cons**: Нет access control, нет monetization, нужно создавать WebP файлы

### Option B: API Media Route (наша существующая система)  
- **Pros**: Access control, monetization, smart headers, conversion on-the-fly
- **Cons**: Больше нагрузки на сервер, сложнее кэширование

## 🔍 ТЕКУЩЕЕ СОСТОЯНИЕ СИСТЕМЫ

### ✅ Что работает:
- **Аватары**: `/media/avatars/` - работают через API или static
- **API endpoints**: `/api/media/[...path]` полностью функционален
- **Nginx**: Правильно настроен с X-Accel-Redirect
- **Access control**: Система monetization работает

### ❌ Что сломано:
- **Post images**: `/posts/images/` запросы идут как static, но WebP файлов нет
- **transformMediaUrl**: Конвертирует в несуществующие пути

## 🎯 ГИПОТЕЗЫ ДЛЯ INVESTIGATION

### Гипотеза 1: Post images должны идти через API
- Изменить `transformMediaUrl` чтобы возвращать `/api/media/posts/images/file.JPG`
- API будет конвертировать JPG → WebP on-the-fly

### Гипотеза 2: Создать WebP файлы на диске
- Upload system должен создавать WebP versions
- Оставить static file serving

### Гипотеза 3: Nginx rewrite rule  
- Nginx перенаправляет `/posts/images/*.webp` → `/api/media/posts/images/*.JPG`

## 🧪 PLANNED INVESTIGATION

### Phase 1: Understand Current Flow
1. Проследить полный путь от upload до browser request
2. Проверить что ДОЛЖНО происходить vs что происходит
3. Найти где именно architecture мismatch

### Phase 2: Test Hypotheses  
1. Playwright MCP: тестировать каждую гипотезу в браузере
2. Проверить performance implications каждого подхода
3. Валидировать совместимость с существующей системой

### Phase 3: Validate Solution
1. Проверить что решение не ломает existing functionality
2. Убедиться что access control продолжает работать
3. Измерить impact на производительность

## ⚠️ CRITICAL REQUIREMENT

**НЕ СОЗДАВАТЬ НОВЫХ API ENDPOINTS** - у нас уже есть полная media система!

Нужно понять ПОЧЕМУ `/posts/images/` не проходят через `/api/media/` и исправить это несоответствие. 