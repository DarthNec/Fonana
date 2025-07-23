# 🔍 М7 DISCOVERY REPORT: Static Files Architecture

## 📅 Дата: 21.01.2025
## 🏷️ ID: [static_files_architecture_2025_021]
## 🎯 Проблема: **Next.js Static Files Cache vs Security Requirements**
## 🚀 Методология: IDEAL METHODOLOGY (М7) - Phase 1: Discovery

---

## 🔥 **ПРОБЛЕМА**

### **Текущая архитектурная ловушка:**
```
New Upload → File Created → Next.js Cache (stale) → 404 → Manual PM2 Restart Required
```

### **Бизнес требования:**
- ✅ Мгновенная доступность новых файлов
- ✅ Сохранение системы авторизации (тиры, платные посты)
- ✅ Производительность (WebP оптимизация)
- ✅ Масштабируемость (multiple concurrent uploads)
- ✅ Zero downtime

---

## 🔍 **DISCOVERY FINDINGS**

### **1. Анализ существующих решений:**

#### **Internal patterns в проекте:**
- Posts API проверяет доступ через `checkPostAccess()`
- Система тиров: Free → Basic → Premium → VIP
- Платные посты с `isLocked: true`
- AUTHOR ACCESS для собственных постов

#### **External best practices:**

**Next.js Official Solutions:**
1. **API Routes for dynamic files** - рекомендуемый подход
2. **Edge Functions** - для CDN интеграции
3. **Middleware** - для authorization на уровне запросов

**Industry patterns:**
1. **Signed URLs** (AWS S3, Cloudflare)
2. **Token-based access** (JWT в query params)
3. **Proxy patterns** (X-Accel-Redirect)

### **2. Технический анализ:**

**Почему Next.js кеширует static files:**
- Optimization для production performance
- Предполагается что public/ статичен
- Не предназначен для dynamic uploads

**Security implications:**
- Direct serving обходит все проверки
- URL guessing позволит скачать premium content
- Нет логирования доступа

### **3. Прототипы решений:**

#### **Прототип A: Secure API Route**
```typescript
// app/api/media/[...path]/route.ts
export async function GET(req, { params }) {
  const path = params.path.join('/')
  const post = await getPostByMediaPath(path)
  
  if (!await checkAccess(post, user)) {
    return new Response('Forbidden', { status: 403 })
  }
  
  const file = await fs.readFile(`public/${path}`)
  return new Response(file, {
    headers: {
      'Content-Type': getContentType(path),
      'Cache-Control': 'private, max-age=3600'
    }
  })
}
```

#### **Прототип B: Signed URLs**
```typescript
// Generate temporary access token
const token = jwt.sign({
  path: mediaUrl,
  userId: user.id,
  exp: Date.now() + 3600000
}, secret)

// URL: /api/media/secure?token=xxx
```

#### **Прототип C: Hybrid Approach**
```typescript
// Public thumbnails через отдельную папку
/public/thumbs/ → всегда доступны
/storage/secure/ → через API с проверкой
```

### **4. Performance анализ:**

**API Route overhead:**
- +50-100ms latency vs static
- Node.js memory usage для streaming
- Но позволяет кеширование на CDN уровне

**Optimizations available:**
- Edge runtime для API routes
- CDN caching с правильными headers
- Stream большие файлы

### **5. Playwright MCP findings:**

```javascript
// Текущее поведение
await browser_navigate({ url: "https://fonana.me/feed" })
// Console: 404 errors для новых файлов

// После PM2 restart
await run_terminal_cmd("pm2 restart fonana")
await browser_navigate({ url: "https://fonana.me/feed" })
// Images load successfully
```

---

## 🎯 **РЕКОМЕНДАЦИИ ДЛЯ SOLUTION PLAN**

### **Оптимальный подход: Secure Media API**

**Архитектура:**
1. Все media файлы через `/api/media/[...path]`
2. Проверка доступа на основе posts данных
3. Streaming response с правильными headers
4. CDN friendly с cache keys

**Преимущества:**
- ✅ Полный контроль доступа
- ✅ Мгновенная доступность
- ✅ Совместимо с тирами
- ✅ Аудит логи

**Trade-offs:**
- Дополнительная latency (mitigated by CDN)
- CPU usage (mitigated by streaming)

---

## ✅ **DISCOVERY CHECKLIST**

- [x] Context7 выполнен для Next.js static files
- [x] Минимум 3 альтернативы исследованы
- [x] Прототипы созданы и проанализированы
- [x] Best practices documented
- [x] Security implications analyzed
- [x] Performance metrics estimated
- [x] Business requirements mapped 