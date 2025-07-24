# 🔍 M7 DISCOVERY REPORT
**Task ID:** react-query-phase2-continuation  
**Date:** 2025-01-24  
**Phase:** Discovery  
**Route:** LIGHT  

---

## 📋 TASK DESCRIPTION
Continue Phase 2 React Query migration for high-priority components to eliminate useEffect+fetch patterns causing infinite loops.

---

## 🔍 CURRENT STATE ANALYSIS

### **Components to Migrate (High Priority):**

1. **MessagesPageClient.tsx**
   - Current: Manual fetch in useEffect for conversations list
   - Risk: Potential loops if dependencies change
   - Impact: High - main messages hub

2. **app/messages/[id]/page.tsx**
   - Current: Complex useEffect patterns with circuit breakers
   - Risk: Already has circuit breakers due to previous loop issues
   - Impact: Critical - active conversation view

3. **ProfileSetupModal.tsx**
   - Current: Avatar upload and profile updates
   - Risk: Medium - modal lifecycle can trigger re-fetches
   - Impact: Medium - user onboarding flow

4. **CreatePostModal.tsx**
   - Current: Post upload and creation
   - Risk: Low - mostly mutations, not queries
   - Impact: High - content creation

### **Patterns Already Established:**
```typescript
// Pattern from CreatorsExplorer.tsx migration:
const { data, isLoading } = useQuery({
  queryKey: ['resource', dependency],
  queryFn: async () => {
    const response = await fetch('/api/resource')
    if (!response.ok) throw new Error('Failed')
    return response.json()
  },
  staleTime: 5 * 60 * 1000,
  enabled: !!dependency // Conditional fetching
})
```

---

## 🎯 DISCOVERY FINDINGS

### **1. MessagesPageClient.tsx Analysis**
```typescript
// CURRENT PROBLEMATIC PATTERN:
useEffect(() => {
  const loadConversations = async () => {
    // Fetch logic
  }
  loadConversations()
}, [user?.id]) // Can cause loops if user object changes
```

**Solution:** Simple useQuery replacement with user.id in query key.

### **2. app/messages/[id]/page.tsx Analysis**
- Has 120+ lines of circuit breaker logic due to previous infinite loop issues
- Multiple fetch calls: loadConversation, sendMessage, purchaseMessage
- Complex state management with mounted refs

**Solution:** 
- Replace loadConversation with useQuery
- Keep mutations (sendMessage) as is
- Remove circuit breaker logic (React Query handles this)

### **3. Common Patterns Found:**
- All components check for user/wallet before fetching
- All use try/catch with toast notifications
- Most have loading states that can be replaced

---

## ✅ RECOMMENDED APPROACH

### **Quick Wins (15 mins each):**
1. **MessagesPageClient.tsx** - Straightforward query replacement
2. **ProfileSetupModal.tsx** - Only the initial data fetch needs React Query

### **More Complex (30 mins):**
3. **app/messages/[id]/page.tsx** - Can remove 100+ lines of circuit breaker code

### **Skip for Now:**
4. **CreatePostModal.tsx** - Mostly mutations, not queries

---

## 🚀 EXPECTED BENEFITS
- Remove 200+ lines of circuit breaker/loading logic
- Automatic request deduplication
- Consistent error handling
- Better TypeScript inference

---

**Ready to implement! Starting with MessagesPageClient.tsx** 