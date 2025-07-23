# 🔍 M7 PHASE 2: DISCOVER - X-Accel-Redirect Research

**Дата:** 2025-01-21  
**Фаза:** DISCOVER - Глубокое исследование технических ограничений  
**Цель:** Найти ВСЕ возможные способы передачи headers metadata

## 🏗️ ТЕКУЩАЯ АРХИТЕКТУРА

### **Production Flow (ПРОБЛЕМНАЯ):**
```mermaid
flowchart LR
    Frontend[Frontend Request] 
    --> Nginx[Nginx]
    --> NextJS[Next.js API]
    --> Check[checkMediaAccess]
    --> Headers[Create Headers]
    --> XAccel[X-Accel-Redirect]
    --> NginxFile[Nginx serves file]
    --> Response[❌ Response без headers]
```

### **Development Flow (РАБОЧАЯ):**
```mermaid
flowchart LR
    Frontend[Frontend Request]
    --> NextJS[Next.js API]
    --> Check[checkMediaAccess]
    --> Headers[Create Headers]
    --> Stream[Direct file stream]
    --> Response[✅ Response с headers]
```

## 🔍 ГЛУБОКОЕ ИССЛЕДОВАНИЕ X-ACCEL-REDIRECT

### **Nginx X-Accel-Redirect Documentation Research:**

#### **Как работает X-Accel-Redirect:**
1. **Application** (Next.js) генерирует response с headers
2. **Nginx** получает response и видит `X-Accel-Redirect` header
3. **Nginx** игнорирует body и большинство headers от application
4. **Nginx** служит файл напрямую из указанного location
5. **❌ Проблема**: Nginx НЕ передает application headers в final response

#### **Что Nginx сохраняет от application response:**
- ✅ `Content-Type` (если не переопределен)
- ✅ `X-Accel-*` headers (управляющие)
- ❌ **Кастомные headers** (`X-Has-Access`, `X-Should-Blur`) - **ТЕРЯЮТСЯ**

#### **Что Nginx добавляет сам:**
- ✅ `Content-Length`, `Last-Modified`, `ETag`
- ✅ Caching headers (`Cache-Control`, `Expires`)
- ✅ Security headers (если настроены в location)

## 📊 ИССЛЕДОВАНИЕ РЕШЕНИЙ

### **🥇 РЕШЕНИЕ 1: Conditional X-Accel (ГИБРИДНЫЙ)**

**Концепция:** Использовать X-Accel только для free content, direct streaming для restricted

```typescript
// app/api/media/[...path]/route.ts
const accessResult = await checkMediaAccess(mediaPath, token)

if (accessResult.hasAccess && accessResult.accessType === 'free') {
  // Free content → X-Accel (performance)
  headers.set('X-Accel-Redirect', `/internal/${mediaPath}`)
  return new NextResponse(null, { headers })
} else {
  // Restricted content → Direct stream (headers preserved)
  headers.set('X-Has-Access', accessResult.hasAccess.toString())
  headers.set('X-Should-Blur', accessResult.shouldBlur.toString())
  // ... other headers ...
  return streamFile(filePath, headers)
}
```

**Преимущества:**
- ✅ Free content максимально быстро (X-Accel)
- ✅ Restricted content с полными headers
- ✅ Нет breaking changes в frontend
- ✅ Сохраняет существующую UX логику

**Недостатки:**
- ⚠️ Restricted content медленнее (через Node.js)
- ⚠️ Увеличивает нагрузку на Next.js для крупных файлов

### **🥈 РЕШЕНИЕ 2: Pre-fetch Metadata API (РАЗДЕЛЕНИЕ CONCERNS)**

**Концепция:** Отдельный API endpoint для получения access metadata

```typescript
// app/api/media/metadata/[...path]/route.ts
export async function GET(request: NextRequest) {
  const { pathname } = new URL(request.url)
  const mediaPath = pathname.replace('/api/media/metadata/', '')
  const token = getTokenFromRequest(request)
  
  const accessResult = await checkMediaAccess(mediaPath, token)
  
  return NextResponse.json({
    hasAccess: accessResult.hasAccess,
    shouldBlur: accessResult.shouldBlur,
    upgradePrompt: accessResult.upgradePrompt,
    requiredTier: accessResult.requiredTier,
    // ... all metadata
  })
}

// Frontend usage:
const metadata = await fetch(`/api/media/metadata${imagePath}`)
const { hasAccess, shouldBlur } = await metadata.json()
```

**Преимущества:**
- ✅ X-Accel работает для всех файлов (максимум performance)
- ✅ Полный контроль над metadata
- ✅ Возможность caching metadata
- ✅ Separation of concerns (файлы ≠ metadata)

**Недостатки:**
- ❌ Frontend breaking changes (дополнительный API call)
- ❌ Дополнительная latency (2 requests вместо 1)
- ❌ Race conditions (metadata vs file loading)

### **🥉 РЕШЕНИЕ 3: Query Parameter Metadata (SIMPLE)**

**Концепция:** Передача metadata через URL query parameters

```typescript
// app/api/media/[...path]/route.ts
const accessResult = await checkMediaAccess(mediaPath, token)
const metadata = btoa(JSON.stringify(accessResult)) // base64 encode

if (process.env.NODE_ENV === 'production') {
  const redirectUrl = `/internal/${mediaPath}?metadata=${metadata}`
  headers.set('X-Accel-Redirect', redirectUrl)
  return new NextResponse(null, { headers })
}

// Frontend:
const url = new URL(imageElement.src)
const metadataParam = url.searchParams.get('metadata')
if (metadataParam) {
  const metadata = JSON.parse(atob(metadataParam))
  // Use metadata for UI decisions
}
```

**Преимущества:**
- ✅ Минимальные изменения в архитектуре
- ✅ X-Accel для всех файлов
- ✅ Metadata всегда синхронизированы с файлом

**Недостатки:**
- ❌ Ugly URLs с metadata в query
- ❌ URL length limitations
- ❌ Security concern (metadata visible в URLs)
- ❌ Caching complexity

### **🔧 РЕШЕНИЕ 4: Nginx Lua Scripting (ADVANCED)**

**Концепция:** Динамическое добавление headers в Nginx через Lua

```nginx
location /internal/ {
    internal;
    alias /var/www/Fonana/public/;
    
    # Lua script для добавления headers
    access_by_lua_block {
        local path = ngx.var.uri
        local token = ngx.var.http_authorization
        
        -- Call our metadata API
        local metadata = get_metadata(path, token)
        
        -- Set headers based on metadata
        ngx.header["X-Has-Access"] = metadata.hasAccess
        ngx.header["X-Should-Blur"] = metadata.shouldBlur
    }
}
```

**Преимущества:**
- ✅ Performance X-Accel + headers
- ✅ Нет frontend changes
- ✅ Централизованная логика в Nginx

**Недостатки:**
- ❌ Сложность настройки (Nginx + Lua)
- ❌ Дублирование access logic (Node.js + Lua)
- ❌ Maintenance overhead
- ❌ Debugging complexity

### **🚀 РЕШЕНИЕ 5: Response Headers Proxy (NGINX PROXY_SET_HEADER)**

**Концепция:** Nginx сохраняет application headers перед X-Accel

```nginx
location ~ ^/api/media/ {
    proxy_pass http://localhost:3000;
    
    # Сохраняем headers от application
    proxy_set_header X-Original-Has-Access $upstream_http_x_has_access;
    proxy_set_header X-Original-Should-Blur $upstream_http_x_should_blur;
    
    # После X-Accel, восстанавливаем headers
    add_header X-Has-Access $upstream_http_x_has_access always;
    add_header X-Should-Blur $upstream_http_x_should_blur always;
}
```

**Преимущества:**
- ✅ Сохраняет performance X-Accel
- ✅ Передает headers от application
- ✅ Нет frontend changes

**Недостатки:**
- ⚠️ Сложная Nginx конфигурация
- ❓ Неясно работает ли с X-Accel-Redirect
- ❓ Требует тестирования feasibility

## 🔄 СУЩЕСТВУЮЩИЕ ПАТТЕРНЫ В ИНДУСТРИИ

### **CDN Patterns:**
- **CloudFlare Workers**: Edge functions для metadata injection
- **AWS CloudFront**: Lambda@Edge для header manipulation
- **Fastly VCL**: Custom logic для headers

### **Nginx + Application Patterns:**
- **Conditional serving**: Different handling для public vs private
- **Metadata injection**: Lua/njs scripts
- **Upstream headers**: Proxy header manipulation

## 📊 PERFORMANCE COMPARISON

### **Current (Broken but Fast):**
```
Free content: X-Accel (~5ms) ✅
Restricted content: X-Accel (~5ms) ❌ (no headers)
```

### **Solution 1 (Conditional):**
```
Free content: X-Accel (~5ms) ✅
Restricted content: Node.js streaming (~50ms) ⚠️
```

### **Solution 2 (Pre-fetch):**
```
Free content: X-Accel (~5ms) + Metadata API (~20ms) = ~25ms ⚠️
Restricted content: X-Accel (~5ms) + Metadata API (~20ms) = ~25ms ⚠️
```

### **Solution 5 (Nginx proxy):**
```
Free content: X-Accel (~5ms) ✅
Restricted content: X-Accel (~5ms) ✅
```

## 🎯 КРИТЕРИИ ОЦЕНКИ РЕШЕНИЙ

### **Must Have:**
- [x] Headers delivery для restricted content
- [x] Сохранение performance для free content
- [x] Совместимость с существующим frontend
- [x] Production safety

### **Nice to Have:**
- [ ] Minimal Nginx config changes
- [ ] No frontend breaking changes  
- [ ] Unified architecture for all content types
- [ ] Easy testing and debugging

## ✅ DISCOVERY RESULTS

### **Рекомендуемые решения для дальнейшего анализа:**
1. **🥇 Conditional X-Accel** - Баланс performance/features
2. **🥈 Nginx Headers Proxy** - Если технически возможно
3. **🥉 Pre-fetch Metadata** - Fallback option

### **Отклоненные решения:**
- ❌ **Query Parameters** - Security и UX concerns
- ❌ **Lua Scripting** - Over-engineering для нашего случая

---

**Следующий шаг:** EXECUTION PLAN - Детальное планирование выбранного решения с implementation steps 