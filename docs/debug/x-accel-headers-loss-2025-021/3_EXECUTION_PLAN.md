# 🎯 M7 PHASE 3: EXECUTION PLAN - Conditional X-Accel Solution

**Дата:** 2025-01-21  
**Фаза:** EXECUTION PLAN - Детальный план реализации  
**Выбранное решение:** Conditional X-Accel (Гибридный подход)

## 🏆 ВЫБРАННОЕ РЕШЕНИЕ: CONDITIONAL X-ACCEL

### **Логика решения:**
```typescript
if (hasAccess && accessType === 'free') {
  // Free content → X-Accel-Redirect (максимум performance)
  return nginx_redirect()
} else {
  // Restricted content → Direct streaming (headers preserved)
  return direct_stream_with_headers()
}
```

### **Обоснование выбора:**
- ✅ **Best performance** для free content (90% трафика)
- ✅ **Full headers** для restricted content (критично для UX)
- ✅ **Zero frontend changes** (backward compatibility)
- ✅ **Progressive enhancement** (easy rollback)

## 📋 ДЕТАЛЬНЫЙ ПЛАН РЕАЛИЗАЦИИ

### **ЭТАП 1: Условная логика в Media API (20 мин)**

#### **Изменения в `app/api/media/[...path]/route.ts`:**
```typescript
// Добавить условную логику перед return
const accessResult = await checkMediaAccess(mediaPath, token)

// Устанавливаем все headers
headers.set('X-Has-Access', accessResult.hasAccess.toString())
headers.set('X-Should-Blur', accessResult.shouldBlur.toString())
headers.set('X-Should-Dim', accessResult.shouldDim.toString())
headers.set('X-Access-Type', accessResult.accessType)
headers.set('X-Required-Tier', accessResult.requiredTier || '')
headers.set('X-Upgrade-Prompt', accessResult.upgradePrompt || '')

// НОВАЯ ЛОГИКА: Conditional serving
if (process.env.NODE_ENV === 'production') {
  // Если контент free И пользователь имеет доступ → X-Accel
  if (accessResult.hasAccess && accessResult.accessType === 'free') {
    console.log('[Media API] Free content - using X-Accel-Redirect')
    headers.set('X-Accel-Redirect', `/internal/${mediaPath}`)
    return new NextResponse(null, { headers })
  } else {
    // Restricted content → Direct streaming для сохранения headers
    console.log('[Media API] Restricted content - direct streaming with headers')
    return streamFileWithHeaders(filePath, headers, accessResult)
  }
} else {
  // Development → всегда direct streaming
  return streamFile(filePath, headers)
}
```

#### **Новая функция `streamFileWithHeaders`:**
```typescript
async function streamFileWithHeaders(
  filePath: string, 
  headers: Headers, 
  accessResult: MediaAccessResult
): Promise<NextResponse> {
  
  if (!existsSync(filePath)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const stats = statSync(filePath)
  const contentType = getContentType(filePath)
  
  // Основные headers
  headers.set('Content-Type', contentType)
  headers.set('Content-Length', stats.size.toString())
  headers.set('Last-Modified', stats.mtime.toUTCString())
  headers.set('ETag', `"${stats.mtime.getTime()}-${stats.size}"`)
  headers.set('Accept-Ranges', 'bytes')
  
  // Security headers
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // CORS headers
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Access-Control-Expose-Headers', 
    'X-Has-Access, X-Should-Blur, X-Should-Dim, X-Upgrade-Prompt, X-Required-Tier, X-Access-Type')
  
  // Conditional caching
  if (accessResult.hasAccess) {
    // Доступный контент → обычный кэш
    headers.set('Cache-Control', 'public, max-age=604800') // 7 days
  } else {
    // Restricted контент → короткий кэш (может поменяться после подписки)
    headers.set('Cache-Control', 'private, max-age=300') // 5 minutes
  }
  
  // Stream файл
  const stream = createReadStream(filePath)
  return new NextResponse(stream as any, { headers })
}
```

### **ЭТАП 2: Range Requests Support (15 мин)**

#### **Поддержка видео streaming:**
```typescript
// В streamFileWithHeaders добавить range support
const range = request.headers.get('range')
if (range && contentType.startsWith('video/')) {
  return handleRangeRequest(filePath, range, headers)
}

function handleRangeRequest(filePath: string, range: string, headers: Headers) {
  const stats = statSync(filePath)
  const positions = range.replace(/bytes=/, "").split("-")
  const start = parseInt(positions[0], 10)
  const end = positions[1] ? parseInt(positions[1], 10) : stats.size - 1
  const chunksize = (end - start) + 1
  
  headers.set('Content-Range', `bytes ${start}-${end}/${stats.size}`)
  headers.set('Content-Length', chunksize.toString())
  
  const stream = createReadStream(filePath, { start, end })
  return new NextResponse(stream as any, { 
    status: 206, // Partial Content
    headers 
  })
}
```

### **ЭТАП 3: Logging и Monitoring (10 мин)**

#### **Добавить метрики:**
```typescript
// В начале Media API
console.log('[Media API Performance]', {
  path: mediaPath,
  method: accessResult.hasAccess && accessResult.accessType === 'free' ? 'X-Accel' : 'Direct',
  accessType: accessResult.accessType,
  hasAccess: accessResult.hasAccess,
  userAgent: request.headers.get('user-agent')?.substring(0, 50)
})
```

### **ЭТАП 4: Testing Framework (15 мин)**

#### **Создать тест скрипт `scripts/test-conditional-xaccel.sh`:**
```bash
#!/bin/bash

echo "🧪 Testing Conditional X-Accel Implementation"

BASE_URL="https://fonana.me"

# Test 1: Free content (должен использовать X-Accel)
echo "1. Testing FREE content..."
RESPONSE=$(curl -sI "$BASE_URL/api/media/posts/images/0612cc5b000dcff7ed9879dbc86942cf.JPG")
if echo "$RESPONSE" | grep -q "X-Has-Access: true"; then
  echo "   ✅ Free content headers present"
else
  echo "   ❌ Free content headers missing"
fi

# Test 2: VIP content без токена (должен использовать Direct stream)  
echo "2. Testing VIP content (unauthorized)..."
RESPONSE=$(curl -sI "$BASE_URL/api/media/posts/images/thumb_4ebaa29d1704bd3c33e7e10b28a06ab0.webp")
if echo "$RESPONSE" | grep -q "X-Should-Blur: true"; then
  echo "   ✅ VIP content headers present (direct stream working)"
else
  echo "   ❌ VIP content headers missing"
fi

# Test 3: Performance comparison
echo "3. Performance test..."
FREE_TIME=$(curl -w "%{time_total}" -so /dev/null "$BASE_URL/api/media/posts/images/0612cc5b000dcff7ed9879dbc86942cf.JPG")
VIP_TIME=$(curl -w "%{time_total}" -so /dev/null "$BASE_URL/api/media/posts/images/thumb_4ebaa29d1704bd3c33e7e10b28a06ab0.webp")

echo "   Free content (X-Accel): ${FREE_TIME}s"
echo "   VIP content (Direct): ${VIP_TIME}s"

# Test 4: Headers completeness
echo "4. Headers completeness check..."
HEADERS=$(curl -sI "$BASE_URL/api/media/posts/images/thumb_4ebaa29d1704bd3c33e7e10b28a06ab0.webp")
REQUIRED_HEADERS=("X-Has-Access" "X-Should-Blur" "X-Access-Type" "X-Required-Tier")

for header in "${REQUIRED_HEADERS[@]}"; do
  if echo "$HEADERS" | grep -q "$header:"; then
    echo "   ✅ $header present"
  else
    echo "   ❌ $header missing"
  fi
done
```

## 🔄 ROLLOUT STRATEGY

### **Phase 1: Staging Testing (Local)**
1. **Apply changes** к Media API
2. **Test locally** с development mode
3. **Verify headers** работают корректно
4. **Test range requests** для видео

### **Phase 2: Production Deployment**
1. **Deploy API changes** на production
2. **Monitor logs** для performance metrics
3. **Run test script** для validation
4. **Monitor user metrics** (conversion rates)

### **Phase 3: Frontend Validation**
1. **Test PostCard components** с новыми headers
2. **Verify blur effects** для restricted content
3. **Check CTA buttons** появляются правильно
4. **Test upgrade flows** работают

### **Phase 4: Performance Monitoring**
1. **Compare latency** Free vs Restricted content
2. **Monitor server load** на Next.js
3. **Check CDN cache rates** не ухудшились
4. **User experience metrics** (bounce rate, conversions)

## 📊 SUCCESS METRICS

### **Technical Metrics:**
- **Headers delivery**: 100% для restricted content
- **Performance**: Free content <10ms, Restricted <100ms
- **Error rate**: <1% increase
- **Cache hit ratio**: >80% maintained

### **Business Metrics:**
- **Tier enforcement**: >95% (restricted content properly locked)
- **Subscription CTAs**: Показываются в >90% cases
- **Revenue protection**: Blocked access измеряется correctly
- **User experience**: Blur effects работают в >95% cases

## ⚠️ RISK MITIGATION

### **Performance Risk:**
- **Mitigation**: Monitor restricted content latency
- **Fallback**: Reduce file streaming buffer sizes
- **Alert**: Set up latency monitoring >200ms

### **Memory Usage Risk:**
- **Mitigation**: Implement file streaming chunks
- **Fallback**: Add rate limiting для concurrent streams
- **Alert**: Monitor Next.js memory usage

### **Nginx Compatibility Risk:**
- **Mitigation**: Test X-Accel headers не конфликтуют
- **Fallback**: Rollback к full direct streaming
- **Alert**: Monitor Nginx error logs

## 🚀 IMPLEMENTATION ORDER

1. **[20 min] Conditional logic** в Media API ✅
2. **[15 min] Range requests** для видео ✅
3. **[10 min] Logging** и monitoring ✅
4. **[15 min] Test framework** ✅
5. **[30 min] Production deployment** и validation ✅

**Total time:** 90 минут structured implementation

---

**Следующий шаг:** ARCHITECTURE phase - Анализ влияния на всю систему и integration points 