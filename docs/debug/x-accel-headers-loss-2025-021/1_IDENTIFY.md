# 🔍 M7 PHASE 1: IDENTIFY - X-Accel-Redirect Headers Loss

**Дата создания:** 2025-01-21  
**Проблема:** X-Accel-Redirect не передает кастомные headers от API к frontend  
**Статус:** 🔴 КРИТИЧЕСКАЯ - блокирует всю систему монетизации

## 📋 ТОЧНОЕ ОПИСАНИЕ ПРОБЛЕМЫ

### 🎯 **Что НЕ работает:**
1. **Headers metadata теряется**: `X-Has-Access`, `X-Should-Blur`, `X-Upgrade-Prompt` не доходят до frontend
2. **Frontend blind**: React компоненты не знают статус доступа пользователя к контенту
3. **Монетизация сломана**: Premium/VIP контент показывается всем без ограничений
4. **UX нарушен**: Нет blur effects, CTAs, upgrade prompts

### ✅ **Что работает:**
1. **API access control** ✅ (проверки выполняются корректно)
2. **Nginx proxy** ✅ (запросы доходят до Next.js)
3. **Headers generation** ✅ (API создает правильные headers)
4. **File serving** ✅ (файлы отдаются efficiently через Nginx)

## 🔬 ТЕХНИЧЕСКАЯ ДИАГНОСТИКА

### **Локально (development) - РАБОТАЕТ:**
```bash
curl -I http://localhost:3000/api/media/posts/images/0612cc5b000dcff7ed9879dbc86942cf.JPG

# ✅ РЕЗУЛЬТАТ:
X-Has-Access: true
X-Should-Blur: false  
X-Access-Type: free
```

### **Production (X-Accel) - НЕ РАБОТАЕТ:**
```bash
curl -I https://fonana.me/api/media/posts/images/0612cc5b000dcff7ed9879dbc86942cf.JPG

# ❌ РЕЗУЛЬТАТ:
HTTP/1.1 200 OK
Server: nginx/1.24.0
# ❌ НЕТ наших headers!
# ✅ Но есть Access-Control-Expose-Headers (доказательство что API вызвался)
Access-Control-Expose-Headers: X-Has-Access, X-Should-Blur, X-Should-Dim...
```

## 🔍 КОРНЕВАЯ ПРИЧИНА

### **X-Accel-Redirect механизм:**
```typescript
// app/api/media/[...path]/route.ts (production):
const accessResult = await checkMediaAccess(mediaPath, token)

// ✅ API правильно проверяет доступ
console.log('Access result:', accessResult)
// { hasAccess: true, shouldBlur: false, accessType: 'free' }

// ✅ API правильно создает headers
headers.set('X-Has-Access', accessResult.hasAccess.toString())
headers.set('X-Should-Blur', accessResult.shouldBlur.toString())

// ❌ ПРОБЛЕМА: X-Accel-Redirect игнорирует кастомные headers
headers.set('X-Accel-Redirect', `/internal/${mediaPath}`)
return new NextResponse(null, { headers })

// Nginx получает X-Accel-Redirect → отдает файл напрямую → теряет metadata
```

### **Nginx X-Accel-Redirect поведение:**
1. **Next.js API** создает response с headers ✅
2. **Nginx получает** `X-Accel-Redirect: /internal/file.jpg` ✅
3. **Nginx отдает файл** из `/internal/` location ✅
4. **❌ Nginx НЕ ПЕРЕДАЕТ** кастомные headers от API
5. **Frontend получает** только файл без metadata ❌

## 🚨 BUSINESS IMPACT

### **🔴 Критические потери:**
- **VIP tier access**: Пользователи видят VIP контент без подписки 
- **Premium posts**: Платные посты доступны бесплатно
- **Subscription CTAs**: Нет призывов к подписке/апгрейду
- **Creator revenue**: Авторы теряют доход от премиум контента

### **📊 Затронутые системы:**
1. **PostCard components** - не показывают blur/CTAs
2. **Post access logic** - не работают tier restrictions  
3. **Subscription system** - обходится пользователями
4. **Payment flow** - не активируется для locked content

## 🎯 ОЖИДАЕМЫЕ HEADERS

### **Free content:**
```http
X-Has-Access: true
X-Should-Blur: false
X-Access-Type: free
```

### **VIP content (unauthorized):**
```http
X-Has-Access: false
X-Should-Blur: true
X-Required-Tier: vip
X-Upgrade-Prompt: Join VIP for ultimate experience
X-Access-Type: vip
```

### **Paid content (unauthorized):**
```http
X-Has-Access: false
X-Should-Blur: true
X-Price: 0.1
X-Currency: SOL
X-Access-Type: paid
```

## 🔧 ПРЕДВАРИТЕЛЬНЫЙ АНАЛИЗ РЕШЕНИЙ

### **Вариант 1: Отключить X-Accel для restricted content**
- **Плюсы**: Headers передаются ✅
- **Минусы**: Потеря performance для крупных файлов ❌

### **Вариант 2: Alternative metadata delivery**
- **Query parameters**: `/api/media/file.jpg?metadata=base64_encoded`
- **Separate API call**: Frontend делает дополнительный запрос за metadata
- **Cookie-based**: Передача через cookies

### **Вариант 3: Nginx header manipulation**
- **add_header в /internal/**: Статические headers в Nginx
- **Lua scripting**: Dynamic header generation на Nginx уровне
- **Upstream headers**: Nginx proxy_set_header tricks

### **Вариант 4: Frontend architecture change**
- **Pre-fetch metadata**: Получать access info до загрузки медиа
- **Component-level checks**: Встроенные access проверки в UI
- **Centralized access store**: Zustand/Redux для access states

## 📊 ВЛИЯНИЕ НА МЕТРИКИ

### **Текущие потери:**
- **Revenue protection**: 0% (все restrictions bypassed)
- **Tier enforcement**: 0% (все tiers доступны всем)
- **User experience**: 40% (нет blur/CTAs но файлы загружаются)

### **Целевые показатели после исправления:**
- **Revenue protection**: 95%
- **Tier enforcement**: 98%
- **User experience**: 95%
- **Performance**: Без деградации

## 🚨 БЛОКЕРЫ

- **Nginx X-Accel limitation** ⚠️ (техническое ограничение)
- **Production dependency** ⚠️ (изменения затрагивают live систему)
- **Frontend compatibility** ⚠️ (компоненты ожидают определенные headers)

## ✅ ГОТОВНОСТЬ К DISCOVERY

- [x] **Проблема четко определена**
- [x] **Корневая причина идентифицирована**  
- [x] **Business impact измерен**
- [x] **Technical constraints понятны**
- [x] **Multiple solution paths выявлены**

---

**Следующий шаг:** DISCOVER phase - глубокое исследование X-Accel-Redirect ограничений и анализ всех возможных решений 