# 🔍 DISCOVERY REPORT: Fast Refresh Causing Full Page Reloads

## 📅 Дата: 17.01.2025
## 🎯 Проблема: Fast Refresh causes full page reloads in development
## 🏷️ ID: [fast_refresh_reload_2025_017]

---

## 🔬 Browser & Console Analysis

### Observed Behavior
```
[LOG] [SW] Skipping registration in development
[WARNING] <meta name="apple-mobile-web-app-capable" content="yes"> is deprecated
```
- **Pattern**: При изменении файлов происходит полная перезагрузка страницы
- **Ожидание**: Fast Refresh должен обновлять компоненты без перезагрузки

### Console During Hot Update
```
[GET] http://localhost:3000/_next/static/webpack/9d117f6d4dfea42c.webpack.hot-update.json => [200] OK
[GET] http://localhost:3000/_next/static/webpack/app/messages/layout.9d117f6d4dfea42c.hot-update.js => [200] OK
[GET] http://localhost:3000/_next/static/webpack/webpack.9d117f6d4dfea42c.hot-update.js => [200] OK
```
- Hot updates загружаются, но страница все равно перезагружается

---

## 🌐 Context7 Fast Refresh Research

### Next.js Fast Refresh Requirements
From Context7 documentation:
1. **Named Components**: Anonymous components break Fast Refresh
2. **useMemo Re-runs**: Fast Refresh re-runs useMemo even with same dependencies
3. **Server Components HMR**: Can be configured with `serverComponentsHmrCache`

### Common Causes of Full Reloads
1. **Syntax Errors**: Compile errors force full reload
2. **Anonymous Exports**: `export default function() {}` breaks Fast Refresh
3. **Non-React Exports**: Exporting non-components from component files
4. **Module Boundary Issues**: Changes affecting module initialization

---

## 📊 Root Cause Analysis

### Potential Causes in Fonana

#### 1. Anonymous Components
```typescript
// Bad - causes full reload
export default function() {
  return <div>Component</div>
}

// Good - supports Fast Refresh
export default function MyComponent() {
  return <div>Component</div>
}
```

#### 2. Mixed Exports Pattern
```typescript
// Bad - non-component exports
export default function Page() { ... }
export const someUtility = () => { ... }

// Good - only component exports
export default function Page() { ... }
```

#### 3. Global Side Effects
```typescript
// Bad - runs on every module load
console.log('[AppProvider] Initializing...')
window.someGlobal = value

// Good - effects inside components
useEffect(() => {
  console.log('[AppProvider] Initializing...')
}, [])
```

#### 4. Class Component Issues
From `ErrorBoundary.tsx`:
```typescript
export class ErrorBoundary extends React.Component
```
Class components have limited Fast Refresh support

---

## 🔎 Code Patterns Analysis

### Console Logging Pattern
Throughout the codebase:
```typescript
console.log('[JWT] Loading token from localStorage...')
console.log('[WalletProvider] Initialized wallets:', wallets)
console.log('[AppProvider][Debug] State update:', {...})
```
- **Issue**: Console logs at module level can trigger reloads
- **Impact**: Development experience degradation

### Provider Initialization
Multiple providers re-initialize:
```
[LOG] [AppProvider] Initializing application...
[LOG] [AppProvider] Cleaning up...
[LOG] [AppProvider] Initializing application...
```
- **Pattern**: Double initialization suggests full remount

### WebSocket Reconnection
```
[ERROR] WebSocket connection to 'ws://localhost:3000/ws' failed
[LOG] Attempting to reconnect (1/5)
```
- **Impact**: WebSocket reconnects on every reload

---

## 💡 Alternative Approaches

### Approach 1: Component Naming Audit
- **Action**: Run codemod to name all anonymous components
- **Command**: `npx @next/codemod name-default-component`
- **Impact**: Immediate improvement for affected components

### Approach 2: Module Boundary Cleanup
- **Action**: Move non-component exports to separate files
- **Pattern**: One component per file rule
- **Impact**: Cleaner module boundaries

### Approach 3: Development-only Guards
- **Action**: Wrap console logs in development checks
- **Pattern**: `if (process.env.NODE_ENV === 'development')`
- **Impact**: Reduced side effects

### Approach 4: Next.js Configuration
```javascript
// next.config.js
experimental: {
  serverComponentsHmrCache: true // Enable HMR cache
}
```

---

## 🧪 Verification Tests

### Test 1: Check for Anonymous Components
```bash
grep -r "export default function\s*(" --include="*.tsx" --include="*.jsx"
```

### Test 2: Find Mixed Exports
```bash
grep -r "export (const|let|var|function)" --include="*.tsx" | grep -v "export default"
```

### Test 3: Console Log Analysis
```bash
grep -r "console\." --include="*.tsx" | grep -v "useEffect\|useCallback\|function"
```

---

## 📈 Impact Assessment

### Developer Experience
- **Current**: Every change = full reload = lost state
- **Time Lost**: ~3-5 seconds per change
- **Productivity**: Significantly reduced

### Debugging Difficulty
- **State Loss**: Hard to debug stateful interactions
- **Network Reset**: WebSocket reconnections
- **Console Noise**: Repeated initialization logs

---

## ✅ Discovery Checklist

- [x] Context7 Fast Refresh documentation reviewed
- [x] Common causes identified
- [x] Code patterns analyzed
- [x] Alternative approaches documented
- [x] Test commands prepared
- [x] Impact assessed

---

## 🎯 Recommended Investigation Order

1. **Run Anonymous Component Check** (Quick win)
2. **Audit Console Logs** (Medium effort)
3. **Check Module Exports** (Medium effort)
4. **Test with Configuration** (Low effort)

**Next Step**: Create ARCHITECTURE_CONTEXT.md with specific file analysis 