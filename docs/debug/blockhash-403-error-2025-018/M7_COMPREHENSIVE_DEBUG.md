# 🔬 M7 COMPREHENSIVE DEBUG: Solana Blockhash 403 Error

## 📋 ПРОБЛЕМА ОБНОВЛЕНА
**Ошибка**: `failed to get recent blockhash: Error: 403 : {"jsonrpc":"2.0","error":{"code": 403, "message":"Access forbidden"}}`

**Новые факты**:
- ✅ QuickNode endpoints обновлены (не истекшие)
- ❌ Ошибка 403 продолжается при любой подписке
- 🎯 Проблема НЕ в конфигурации RPC URLs

## 🎭 Phase 1: Deep Browser Investigation

### Browser-Based Reproduction
1. **Trigger точка**: Любая попытка подписки
2. **Expected behavior**: Solana transaction должна инициироваться
3. **Actual behavior**: 403 Forbidden при получении blockhash

### Console Analysis Strategy
- **Monitor Network tab** для Solana RPC calls
- **Track JavaScript errors** в момент ошибки  
- **Wallet connection status** проверка
- **Transaction flow** анализ

## 🔧 Phase 2: Configuration Deep Dive

### Current RPC Configuration Analysis
```
новые endpoints:
- https://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/
- wss://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/
```

### Environment Variables Check
- `NEXT_PUBLIC_SOLANA_RPC_URL`
- `NEXT_PUBLIC_SOLANA_NETWORK` 
- Конфигурация в `lib/solana/config.ts`

## 🎯 Phase 3: API Interaction Testing

### Direct RPC Testing
- Curl tests к QuickNode endpoints
- Проверка доступности без браузера
- Тестирование getRecentBlockhash напрямую

### Wallet Integration Testing  
- Phantom wallet connection
- Transaction initialization
- Signature requests

## 📊 HYPOTHESIS MATRIX

### H1: QuickNode Rate Limiting
- **Вероятность**: 🟡 Medium
- **Тест**: Direct curl to endpoints
- **Индикаторы**: Rate limit headers

### H2: Wallet Authorization Issue
- **Вероятность**: 🔴 High  
- **Тест**: Wallet connection status
- **Индикаторы**: Wallet state in browser

### H3: Network/CORS Problems
- **Вероятность**: 🟡 Medium
- **Тест**: Browser network tab
- **Индикаторы**: CORS errors, preflight failures

### H4: Transaction Format/Payload Issue
- **Вероятность**: 🔴 High
- **Тест**: Inspect transaction payload
- **Индикаторы**: Malformed requests

## 🎬 EXECUTION PLAN

### Step 1: Playwright Deep Investigation
- Navigate to subscription flow
- Capture exact moment of 403 error
- Monitor all network requests
- Extract failing request details

### Step 2: Direct RPC Testing
- Test QuickNode endpoints with curl
- Compare browser vs server requests
- Identify request differences

### Step 3: Wallet State Analysis
- Check wallet connection status
- Verify user authorization
- Test transaction preparation

### Step 4: Configuration Verification
- Ensure all configs point to new endpoints
- Check for hardcoded old endpoints
- Verify environment variable loading

---

**STATUS**: 🔄 **IN PROGRESS** - Commencing Playwright MCP investigation 