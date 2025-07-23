# 🔍 DISCOVERY REPORT: Upload WebP URLs Fix

**Задача:** Исправить upload pipeline чтобы новые посты создавались с корректными WebP URLs  
**Дата:** 2025-01-23  
**Методология:** IDEAL M7  
**🎯 КОРНЕВАЯ ПРОБЛЕМА:** Upload API создает WebP файлы, но сохраняет JPEG пути в БД

## 📊 РЕАЛЬНАЯ ПРОБЛЕМА

### 🚨 **Что происходит сейчас (НЕПРАВИЛЬНО):**
1. **Upload API** (`app/api/posts/upload/route.ts`):
   - Получает файл от пользователя
   - Конвертирует в WebP через Sharp
   - **СОХРАНЯЕТ WebP файл на диск** ✅
   - **НО ВОЗВРАЩАЕТ JPEG путь в response** ❌
   
2. **Frontend CreatePostModal**:
   - Получает JPEG путь от upload API
   - **Сохраняет JPEG путь в БД** ❌
   
3. **Frontend Feed/Posts**:
   - Читает JPEG путь из БД
   - **transformMediaUrl конвертирует JPG → WebP** ❌
   - Браузер делает запрос к WebP файлу
   - **РЕЗУЛЬТАТ**: 404 для старых файлов, работает для новых WebP

### ✅ **Что должно происходить (ПРАВИЛЬНО):**
1. **Upload API**:
   - Создает WebP файл ✅
   - **Возвращает WebP путь в response** ✅
   
2. **Frontend**:
   - **Сохраняет WebP путь сразу в БД** ✅
   
3. **Feed**:
   - **Читает WebP путь из БД напрямую** ✅
   - **НЕТ КОНВЕРТАЦИИ** ✅

## 🔍 EVIDENCE ИЗ CONSOLE

```
[transformMediaUrl] Converting JPG to WebP: 
/posts/images/c6fcc7504f697b380017f94789bd0826.JPG -> 
/posts/images/c6fcc7504f697b380017f94789bd0826.webp
```

**Это доказательство** что:
- Upload API до сих пор возвращает `.JPG` пути
- Frontend вынужден их конвертировать
- **МЫ ИСПРАВЛЯЛИ ЭТО РАНЬШЕ, НО ОНО ВЕРНУЛОСЬ**

## 🎯 ПЛАН ИССЛЕДОВАНИЯ

### Phase 1: Upload API Analysis
- Проверить `app/api/posts/upload/route.ts`
- Найти где формируется `mediaUrl` в response
- Проверить логику создания файлов vs возвращаемых путей

### Phase 2: Database Check  
- Проверить что реально сохраняется в БД `posts.mediaUrl`
- Сравнить новые vs старые записи

### Phase 3: Frontend Integration
- Проверить `CreatePostModal` логику сохранения
- Проверить где используется `transformMediaUrl`

### Phase 4: Root Cause Fix
- Исправить Upload API чтобы возвращал WebP пути
- Убрать ненужную frontend конвертацию для новых постов
- Оставить legacy support только для старых записей 