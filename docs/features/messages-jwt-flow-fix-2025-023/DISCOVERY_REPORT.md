# 🔍 DISCOVERY REPORT: Messages JWT Flow Fix (2025-023)

## 📅 Дата: 23.01.2025
## 🎯 Задача: Исправление JWT flow в системе сообщений
## 🔄 Статус: Discovery Phase Complete

---

## 🚨 CRITICAL ISSUE IDENTIFIED

### **ROOT CAUSE: JWT Token Timing Race Condition**

**Проблема**: AppProvider создает JWT токен асинхронно, но MessagesPageClient пытается его использовать немедленно в useEffect.

**Evidence from console logs**:
```javascript
[AppProvider] Wallet connected, ensuring JWT token exists...
[AppProvider] Creating JWT token for wallet: 5PJWbd52...
[MessagesPageClient] No JWT token available  // ❌ Called too early!
```

### **Secondary Issue: Infinite React Render Loop**
**Evidence**: Повторяющиеся вызовы `a5/a8` функций в console указывают на бесконечный цикл рендеринга в ConversationPage компоненте.

---

## 🔍 TECHNICAL ANALYSIS

### **JWT Token Creation Flow (AppProvider)**
```typescript
// lib/providers/AppProvider.tsx:90-130
const ensureJWTTokenForWallet = async (walletAddress: string) => {
  // 1. Проверяет localStorage на существующий токен
  // 2. Если нет токена -> создает новый через /api/auth/wallet
  // 3. Сохраняет в localStorage как 'fonana_jwt_token'
  // 4. ASYNC PROCESS - занимает ~200-500ms
}
```

**✅ AppProvider Status**: Функционирует корректно, токен создается успешно

### **JWT Token Access Flow (MessagesPageClient)**
```typescript  
// components/MessagesPageClient.tsx:40-70
const loadConversations = async () => {
  const token = await jwtManager.getToken()
  
  if (!token) {
    console.error('[MessagesPageClient] No JWT token available') // ❌ FAILS HERE
    return
  }
}

useEffect(() => {
  if (!user?.id) return
  loadConversations() // Called immediately when user?.id available
}, [user?.id])
```

**❌ MessagesPageClient Issue**: useEffect срабатывает сразу когда user?.id доступен, но JWT токен еще не создан.

### **JWT Manager Logic (jwtManager.getToken)**
```typescript
// lib/utils/jwt.ts:112-197
async getToken(): Promise<string | null> {
  // 1. Проверяет this.token в памяти -> null (первый запуск)
  // 2. Проверяет localStorage 'fonana_jwt_token' -> null (еще не создан AppProvider)
  // 3. Ищет 'fonana_user_wallet' -> finds wallet address
  // 4. Вызывает requestNewToken(wallet) -> создает новый токен
  // 5. BUT this races with AppProvider's ensureJWTTokenForWallet
}
```

**⚠️ Race Condition**: Два компонента пытаются создать JWT токен одновременно

---

## 🎯 SEQUENCE ANALYSIS

### **Current Broken Sequence**:
```
1. User connects wallet → WalletProvider
2. AppProvider detects wallet → starts ensureJWTTokenForWallet() [ASYNC]
3. AppProvider sets user in store → triggers useUser() updates
4. MessagesPageClient useEffect triggers → calls loadConversations() 
5. jwtManager.getToken() → finds no token in localStorage (race condition)
6. jwtManager creates new token request → duplicate token creation
7. MessagesPageClient shows "No JWT token available" error
```

### **Expected Correct Sequence**:
```
1. User connects wallet → WalletProvider  
2. AppProvider detects wallet → creates JWT token → saves to localStorage
3. AppProvider sets user in store → triggers useUser() updates
4. MessagesPageClient useEffect triggers → JWT token already available
5. jwtManager.getToken() → finds valid token → API calls succeed
6. MessagesPageClient loads conversations successfully
```

---

## 🔍 COMPONENT DEPENDENCIES ANALYSIS

### **AppProvider Dependencies (Token Creation)**:
```typescript
useEffect(() => {
  if (connected && publicKey && isInitialized) {
    ensureJWTTokenForWallet(publicKey.toBase58()) // ASYNC
  }
}, [connected, publicKey, isInitialized])
```

### **MessagesPageClient Dependencies (Token Usage)**:
```typescript
useEffect(() => {
  if (!user?.id) return
  loadConversations() // Needs JWT token
}, [user?.id])
```

**⚡ Problem**: `user?.id` доступен ДО завершения JWT token creation

---

## 🔧 INFINITE LOOP DISCOVERY

### **ConversationPage Circuit Breaker Evidence**:
От предыдущих аналогичных проблем в Memory Bank, infinite loop в messages system связан с:

1. **useEffect Dependencies**: Нестабильные зависимости вызывают бесконечные re-renders
2. **setState в Render Cycle**: Вызовы setState во время рендеринга компонента
3. **Circuit Breaker Activation**: Слишком частые API calls блокируются

**Pattern Match**: С SparklesIcon bug (Memory ID: 3702304) - проблемы в messages system часто связаны с неправильным timing и dependencies.

---

## 🛠️ SOLUTION REQUIREMENTS IDENTIFIED

### **Primary Fix: JWT Token Timing**
1. **Wait for JWT Ready**: MessagesPageClient должен ждать когда JWT токен готов
2. **Proper Dependency**: useEffect должен зависеть от JWT token availability
3. **Race Condition Prevention**: Избегать duplicate token creation

### **Secondary Fix: Infinite Loop Prevention** 
1. **Circuit Breaker Respect**: Не делать API calls когда заблокировано
2. **Stable Dependencies**: Использовать только стабильные primitive values
3. **Memory Cleanup**: Proper cleanup в useEffect

### **Implementation Strategy Options**:
1. **Option A**: Добавить JWT ready state в AppProvider
2. **Option B**: Использовать polling в MessagesPageClient для JWT availability
3. **Option C**: Создать JWT availability hook

---

## 📊 IMPACT ASSESSMENT  

### **Current State**:
- ❌ Messages system completely broken
- ❌ Users cannot access conversations
- ❌ Infinite loops causing performance issues
- ❌ Circuit breaker preventing legitimate API calls

### **Risk Level**: 🔴 **CRITICAL**
- **User Experience**: Complete breakdown of messaging functionality
- **Performance**: Browser lag from infinite loops  
- **Data Integrity**: No risk (read-only operations)

---

## 🎯 NEXT STEPS (Architecture Analysis)

1. **Architecture Context**: Map complete JWT flow across all components
2. **Solution Design**: Create JWT availability detection mechanism
3. **Implementation**: Fix timing issue with minimal code changes
4. **Validation**: Playwright MCP testing для verification

---

## 📝 RECOMMENDATIONS

### **Immediate Priority**:
1. **Fix JWT Timing**: Критически важно для восстановления messages
2. **Simple Solution**: Минимальные изменения для быстрого восстановления
3. **M7 Compliance**: Полный анализ согласно методологии

### **Long-term Improvements**:
1. **JWT Ready State**: Добавить в AppProvider для всех компонентов
2. **Centralized Token Management**: Улучшить coordination между компонентами
3. **Error Resilience**: Better handling для race conditions

---

**Discovery Phase Status**: ✅ **COMPLETE**
**Next Phase**: Architecture Context Analysis 