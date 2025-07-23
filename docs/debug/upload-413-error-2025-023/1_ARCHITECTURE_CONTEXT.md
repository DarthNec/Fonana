# 🏗️ ARCHITECTURE CONTEXT: Upload 413 Error Analysis

**Дата:** 2025-01-23  
**Методология:** IDEAL M7 - Phase 2  
**🎯 ROOT CAUSE CONFIRMED:** Next.js API Route Body Parser Default Limit (1MB)

## 🔍 DISCOVERY FINDINGS SUMMARY

### ✅ **Context7 Critical Discovery:**
**Next.js API routes имеют body parser limit 1MB по умолчанию:**
```typescript
// MISSING in app/api/posts/upload/route.ts:
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // или больше
    },
  },
}
```

### ❌ **ROOT CAUSE IDENTIFIED:**

#### 🚨 **PRIMARY ISSUE: Missing Body Parser Configuration**
- **Upload API route**: НЕТ конфигурации `bodyParser.sizeLimit`
- **Next.js default**: 1MB body limit  
- **Application expects**: До 10MB для изображений (код проверяет)
- **Result**: 413 Request Entity Too Large BEFORE code execution

#### 📊 **CHAIN OF EVENTS:**
```
1. User selects file > 1MB
2. Browser sends POST to /api/posts/upload  
3. Next.js body parser: "File too large" → HTTP 413
4. Browser receives HTML error page (not JSON)
5. JavaScript: SyntaxError parsing HTML as JSON
6. UI shows "Failed to upload file"
```

## 🗂️ АРХИТЕКТУРНАЯ КАРТА ПРОБЛЕМЫ

### ❌ **Current (Broken) Flow:**
```
User File (3MB) → Browser → /api/posts/upload
                     ↓
                 Next.js Body Parser (1MB limit)
                     ↓
                 HTTP 413 + HTML Error Page ❌
                     ↓
                 Upload Code: NEVER EXECUTED
```

### ✅ **Expected (Working) Flow:**
```
User File (3MB) → Browser → /api/posts/upload
                     ↓
                 Next.js Body Parser (10MB limit)
                     ↓
                 Upload Code: Executes file processing ✅
                     ↓
                 JSON Response: {url, thumbUrl, etc.}
```

## 📋 IMPACTED COMPONENTS

### 🔧 **ТРЕБУЕТ ИЗМЕНЕНИЙ:**
- **`app/api/posts/upload/route.ts`**: Добавить `export const config`
- **Potentially Nginx**: Настроить `client_max_body_size` (вторичная проблема)

### ✅ **НЕ ТРЕБУЮТ ИЗМЕНЕНИЙ:**
- **Upload logic**: Код обработки файлов работает правильно
- **Sharp.js processing**: WebP optimization готова к работе
- **Frontend**: CreatePostModal корректно отправляет запросы
- **Database**: Структура готова для больших файлов

## 🛡️ VALIDATION OF HYPOTHESIS

### ✅ **Evidence Supporting Root Cause:**
1. **Context7 Documentation**: Next.js requires explicit bodyParser.sizeLimit config
2. **Code Analysis**: Upload route missing required config export
3. **Error Pattern**: 413 + HTML response = classic body parser limit
4. **Timing**: Appeared after standalone removal (config reset)

### ❌ **Alternative Causes Ruled Out:**
- **Nginx limits**: No explicit client_max_body_size found (uses default)
- **Disk space**: Adequate space available
- **PM2 limits**: Process running normally
- **File permissions**: Directory creation works fine

## 🔧 TECHNICAL REQUIREMENTS

### 📊 **File Size Support Matrix:**
- **Images**: Up to 10MB (код уже проверяет)
- **Videos**: Up to 100MB (код уже проверяет)  
- **Audio**: Up to 50MB (код уже проверяет)

### ⚙️ **Required Configuration:**
```typescript
// app/api/posts/upload/route.ts - ADD THIS:
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb', // Covers all file types
    },
  },
  maxDuration: 30, // Allow time for large file processing
}
```

### 🔗 **Secondary Nginx Configuration (Optional):**
```nginx
# Add to /etc/nginx/sites-enabled/fonana:
client_max_body_size 100M;
```

## 🎯 SOLUTION VALIDATION PLAN

### ✅ **Phase 1: Next.js Configuration**
1. Добавить `export const config` в upload route
2. Set `bodyParser.sizeLimit: '100mb'`
3. Deploy и restart приложения

### ✅ **Phase 2: Testing**
1. Test файлы разных размеров: 500KB, 2MB, 5MB, 10MB
2. Validate JSON responses (не HTML error pages)
3. Confirm WebP thumbnail generation работает

### ✅ **Phase 3: Nginx Optimization (if needed)**
1. Add `client_max_body_size 100M` to nginx config
2. Reload nginx
3. Re-test large file uploads

## 📊 IMPACT ASSESSMENT

### 🟢 **MINIMAL RISK SOLUTION:**
- **Change scope**: Одна строка конфигурации в API route
- **Backward compatibility**: 100% совместимость
- **Performance impact**: Нулевой (только увеличивает лимит)
- **Rollback**: Легко (убрать/изменить config)

### 🎯 **EXPECTED RESULTS:**
- **File uploads work**: ✅ Для файлов до 100MB
- **WebP optimization**: ✅ Thumbnail generation восстанавливается  
- **UI experience**: ✅ Правильные JSON responses
- **Error handling**: ✅ Graceful failures вместо 413

## 🔄 RELATIONSHIP TO PREVIOUS FIX

### 🤔 **Why Issue Appeared After Standalone Removal:**
1. **Standalone mode**: Могла иметь другие default body limits
2. **Configuration reset**: PM2 restart мог сбросить какие-то settings  
3. **Build process**: Новый build мог изменить внутренние лимиты
4. **Environment differences**: Production vs development variations

### ✅ **No Conflict with WebP Fix:**
- **Static file serving**: Продолжает работать идеально
- **Media API**: Не затронута upload changes
- **Image optimization**: Sharp.js processing готов к большим файлам

**Status:** ✅ Ready for Solution Implementation - High confidence fix 