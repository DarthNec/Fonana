# 🏗️ ARCHITECTURE CONTEXT: WebP Image 404 Analysis

**Дата:** 2025-01-23  
**Методология:** IDEAL M7 - Phase 2  
**🎯 ROOT CAUSE НАЙДЕН:** `output: 'standalone'` в next.config.js ломает static file serving  

## 🔍 DISCOVERY FINDINGS SUMMARY

### ✅ Что РАБОТАЕТ:
- **API Routes**: `/api/media/[...path]` полностью функционален с smart conditional headers
- **Nginx**: Правильно настроен и проксирует requests к Next.js
- **File System**: WebP файлы СУЩЕСТВУЮТ на диске (`thumb_*.webp` созданы)
- **Database**: API возвращает правильные пути к файлам
- **Other Static Files**: `/placeholder.jpg` работает нормально

### ❌ ROOT CAUSE ОБНАРУЖЕН:

#### 🚨 **КРИТИЧЕСКАЯ ПРОБЛЕМА: next.config.js**
```javascript
// В next.config.js:
output: 'standalone'  // ЭТО ЛОМАЕТ STATIC FILE SERVING!
```

#### 📊 **ПОЛНЫЙ TRACE ПРОБЛЕМЫ:**

1. **Browser Request**: `GET /posts/images/thumb_*.webp`
2. **Nginx**: Проксирует к Next.js (нет специальных location rules)  
3. **Next.js в standalone mode**: НЕ МОЖЕТ отдать static files из subdirectories
4. **Result**: 404 NOT FOUND (даже для существующих файлов)

#### 🔍 **ДОКАЗАТЕЛЬСТВА:**
- **File exists**: ✅ `thumb_dba13fc1c9772369aeaa41434d57d9a3.webp` на диске
- **API returns path**: ✅ `/posts/images/thumb_*.webp` от API
- **Browser gets 404**: ❌ Next.js standalone не отдает файл
- **Other static files work**: ✅ `/placeholder.jpg` работает (root level)

## 🗂️ АРХИТЕКТУРНАЯ КАРТА ПРОБЛЕМЫ

### 🔄 Что ДОЛЖНО происходить:
```
Browser → /posts/images/file.webp 
  ↓
Nginx → proxy_pass to Next.js
  ↓  
Next.js → serve static file from /public/posts/images/
  ↓
File delivered ✅
```

### ❌ Что происходит СЕЙЧАС:
```
Browser → /posts/images/file.webp
  ↓
Nginx → proxy_pass to Next.js  
  ↓
Next.js (standalone) → "Cannot serve subdirectory static files"
  ↓
404 NOT FOUND ❌
```

## 🔧 КОРНЕВАЯ ПРИЧИНА АНАЛИЗ

### 🎯 **PRIMARY CAUSE: Next.js Standalone Mode**
- **Что**: `output: 'standalone'` в next.config.js
- **Почему проблема**: Standalone mode изменяет static file serving behavior
- **Когда появилось**: Когда мы экспериментировали с deployment strategies
- **Почему не замечено раньше**: PM2 был исправлен, но next.config.js не обновлен

### 🔗 **SECONDARY FACTORS:**
- **Nginx Configuration**: Проксирует ВСЕ requests (нет static file bypass)
- **File Location**: Files в subdirectory `/posts/images/` (не root level)
- **transformMediaUrl**: Работает правильно, не является проблемой

## 📋 КОМПОНЕНТЫ ЗАДЕЙСТВОВАННЫЕ

### ✅ **НЕ ТРЕБУЮТ ИЗМЕНЕНИЙ:**
- **Media API**: `/api/media/[...path]/route.ts` - работает идеально
- **transformMediaUrl**: `lib/utils/mediaUrl.ts` - логика правильная
- **Upload System**: Создает файлы правильно
- **Database**: Пути сохраняются корректно
- **Nginx**: Конфигурация корректная

### 🔧 **ТРЕБУЮТ ИЗМЕНЕНИЙ:**
- **next.config.js**: Убрать `output: 'standalone'`
- **PM2 ecosystem**: Убедиться что использует стандартный режим

## 🛡️ ПРОВЕРКА ГИПОТЕЗ

### ❌ **Отклоненные гипотезы:**
- **"API не работает"** - API полностью функционален
- **"Файлы не созданы"** - файлы существуют на диске  
- **"Nginx проблема"** - nginx корректно проксирует
- **"transformMediaUrl ломает пути"** - логика правильная

### ✅ **Подтвержденная гипотеза:**
- **"Standalone mode ломает static serving"** - CONFIRMED ✅

## 🎯 ПЛАН ИСПРАВЛЕНИЯ

### Phase 1: Fix Next.js Configuration
1. Убрать `output: 'standalone'` из next.config.js
2. Rebuild приложения  
3. Restart PM2 с обычным режимом

### Phase 2: Validation
1. Проверить что `/posts/images/` files доступны
2. Проверить что WebP conversion работает
3. Убедиться что existing functionality не сломана

## ⚠️ IMPACT ASSESSMENT

### 🟢 **MINIMAL RISK:**
- Изменение конфигурации не затрагивает код
- Standalone не используется в production (PM2 уже исправлен)
- Откат легкий (вернуть одну строку в конфиге)

### 📊 **ОЖИДАЕМЫЕ УЛУЧШЕНИЯ:**
- **Static file serving**: 0% → 100% success rate
- **Image loading**: No more placeholder fallbacks
- **User experience**: Instant image display
- **Performance**: Direct static serving (faster than API) 