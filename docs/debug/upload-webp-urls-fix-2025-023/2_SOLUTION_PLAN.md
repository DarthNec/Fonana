# 📋 SOLUTION PLAN: Next.js Static File Serving Fix

**Дата:** 2025-01-23  
**Методология:** IDEAL M7 - Phase 3  
**🎯 ПРОСТОЕ РЕШЕНИЕ:** Исправить static file serving, НЕ ТРОГАЯ upload pipeline  

## ✅ **WHAT WE CONFIRMED WORKS:**
- Upload API создает WebP files ✅
- Upload API возвращает WebP paths ✅  
- БД содержит корректные WebP paths ✅
- WebP files существуют на диске ✅

## 🎯 **ЕДИНСТВЕННАЯ ПРОБЛЕМА:**
**Next.js не может отдать static files из `/public/posts/images/`**

## 📋 **MINIMAL SOLUTION PLAN:**

### Step 1: Проверить статус standalone mode
```bash
# Убедиться что standalone отключен
grep standalone /var/www/Fonana/next.config.js
```

### Step 2: Minimal rebuild (если нужно)
```bash
# ТОЛЬКО если standalone не отключен
cd /var/www/Fonana
npm run build
pm2 restart fonana-app
```

### Step 3: Тест static serving
```bash
# Проверить что файлы доступны
curl -I https://fonana.me/posts/images/thumb_1bb1ef3914ae75e2276631b13fd57578.webp
```

## ⚠️ **CRITICAL RULES:**

### ❌ **НЕ ДЕЛАТЬ:**
- НЕ менять `app/api/posts/upload/route.ts` (он работает идеально)
- НЕ менять БД записи (новые уже корректны)  
- НЕ менять TypeScript configs без необходимости
- НЕ трогать другие части экосистемы
- НЕ создавать новые side effects

### ✅ **ТОЛЬКО ДЕЛАТЬ:**
- Исправить Next.js static file serving 
- Минимальные изменения в конфигурации
- Сохранить ALL working functionality

## 🔄 **FALLBACK PLAN:**

Если static serving не исправится:
1. Создать простой API route `/api/media/posts/images/[...path]`
2. Который просто читает файлы из `/public/posts/images/`
3. НЕ ТРОГАЯ существующий media API с access control

## 📊 **SUCCESS METRICS:**
- ✅ `https://fonana.me/posts/images/thumb_*.webp` → HTTP 200
- ✅ Feed shows images (не placeholder)
- ✅ Upload продолжает работать 
- ✅ NO regression в других функциях 