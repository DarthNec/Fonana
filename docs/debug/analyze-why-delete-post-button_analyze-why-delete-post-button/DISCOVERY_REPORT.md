# 🔍 DISCOVERY REPORT: Delete Post Button Not Working on ExplorePageClientMobile

**Date:** 2026-03-11  
**Session ID:** task_analyze-why-delete-post-button_5593  
**Status:** 🔴 CRITICAL BUG  
**Severity:** HIGH (blocks user functionality)

---

## 📋 **PROBLEM STATEMENT**

User reports that when opening their own post on `ExplorePageClientMobile` and clicking the "Delete Post" button, **nothing happens**.

---

## 🔍 **ROOT CAUSE ANALYSIS**

### **1. Component Flow**

```
ExplorePageClientMobile
  ↓
FullscreenCarousel (when user clicks on post)
  ↓
FullscreenPostCard
  ↓
PostContent (newCore)
  ↓
VerticalActions (contains Delete Post button)
```

### **2. Delete Button Location**

**File:** `components/feed/VerticalActions.tsx`  
**Lines:** 652-663

```typescript
{isOwner && (
  <button
    onClick={() => {
      onAction?.({ type: 'delete', postId: post.id })
      setShowMenu(false)
    }}
    className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
  >
    <TrashIcon className="w-5 h-5" />
    <span>Delete post</span>
  </button>
)}
```

**✅ Button is correctly implemented**: 
- Shows only for `isOwner` (user.id === post.creator.id)
- Calls `onAction({ type: 'delete', postId: post.id })`
- Has proper UI styling

---

### **3. Action Handler Chain**

#### **VerticalActions → PostContent**
```typescript
// components/posts/newCore/PostContent.tsx (line 255)
<VerticalActions
  post={post}
  onAction={onAction} // ← Passes onAction prop
  isFullscreen={isFullscreen}
/>
```
✅ **PASSES** `onAction` correctly

---

#### **PostContent → FullscreenPostCard**
```typescript
// components/posts/variants/FullscreenPostCard.tsx (line 20)
<PostContent
  post={post}
  onAction={onAction} // ← Passes onAction prop
  isFullscreen={isFullscreen}
/>
```
✅ **PASSES** `onAction` correctly

---

#### **FullscreenPostCard → FullscreenCarousel**
```typescript
// components/feed/FullscreenCarousel.tsx (line 452)
<FullscreenPostCard
  post={displayPost}
  onAction={handleAction} // ← Passes handleAction
  isFullscreen={isFullscreen}
/>
```

**handleAction** (lines 149-157):
```typescript
const handleAction = useCallback((action: PostAction) => {
  if (action.type === 'comment') {
    setShowComments(true)
    return
  }
  
  // Все остальные действия передаем родителю
  onAction?.(action) // ← PASSES to parent (ExplorePageClientMobile)
}, [onAction])
```
✅ **PASSES** `action.type === 'delete'` to parent correctly

---

#### **FullscreenCarousel → ExplorePageClientMobile**
```typescript
// components/ExplorePageClientMobile.tsx (line 357)
<FullscreenCarousel
  posts={fullscreenPosts}
  initialIndex={fullscreenIndex}
  onAction={handlePostAction} // ← Passes handlePostAction
  showBackButton={true}
  onBack={() => setShowFullscreen(false)}
  isFullscreen={true}
/>
```

---

### **4. 🔴 THE PROBLEM: Missing Handler**

**File:** `components/ExplorePageClientMobile.tsx`  
**Function:** `handlePostAction` (lines 201-257)

```typescript
const handlePostAction = async (action: PostAction) => {
  const post = posts.find(p => p.id === action.postId)
  
  switch (action.type) {
    case 'subscribe':
      // ... handled
      break
      
    case 'purchase':
      // ... handled
      break

    case 'tip':
      // ... handled
      break
      
    case 'share':
      // ... handled
      break
      
    // ❌ NO CASE FOR 'delete'!
  }
}
```

**🔴 CRITICAL MISSING:** There is **NO handler** for `action.type === 'delete'`!

---

## 📊 **COMPARISON WITH OTHER COMPONENTS**

### **ExplorePageClient (Desktop) - HAS DELETE HANDLER**

**File:** `components/ExplorePageClient.tsx`

```typescript
const handlePostAction = async (action: PostAction) => {
  // ... other cases
  
  case 'delete':
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        const token = await jwtManager.getToken()
        const response = await fetch(`/api/posts/${action.postId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          setPosts(prev => prev.filter(p => p.id !== action.postId))
          toast.success('Post deleted successfully')
        } else {
          toast.error('Failed to delete post')
        }
      } catch (error) {
        console.error('[ExplorePageClient] Delete error:', error)
        toast.error('Failed to delete post')
      }
    }
    break
}
```

✅ **Desktop version HAS proper delete handler**

---

## 📋 **SUMMARY**

| Aspect | Status |
|--------|--------|
| **Button UI** | ✅ Works (shows correctly for owner) |
| **Button onClick** | ✅ Works (calls onAction) |
| **Action propagation** | ✅ Works (reaches ExplorePageClientMobile) |
| **Handler in ExplorePageClientMobile** | ❌ **MISSING** |
| **API endpoint** | ✅ Exists (`DELETE /api/posts/:id`) |
| **Desktop version** | ✅ Works correctly |

---

## 🎯 **ROOT CAUSE**

**`ExplorePageClientMobile` does NOT handle `action.type === 'delete'` in the `handlePostAction` function.**

The button works correctly, the action propagates correctly, but when it reaches `ExplorePageClientMobile`, there is no `case 'delete':` block to process it.

---

## 🔄 **WHY THIS HAPPENS**

This is likely a **copy-paste inconsistency** between:
- `ExplorePageClient` (desktop) - ✅ HAS delete handler
- `ExplorePageClientMobile` (mobile) - ❌ MISSING delete handler

When the mobile version was created, the `delete` case was not copied over.

---

## ✅ **SOLUTION PLAN**

### **Option 1: Add delete handler to ExplorePageClientMobile (RECOMMENDED)**

**Impact:** LOW  
**Risk:** LOW  
**Time:** 5 minutes  
**Files:** 1 (`ExplorePageClientMobile.tsx`)

**Changes:**
1. Add `case 'delete':` to `handlePostAction` switch statement
2. Copy logic from `ExplorePageClient.tsx`
3. Test delete functionality

---

### **Option 2: Extract shared handler into a utility function**

**Impact:** MEDIUM  
**Risk:** MEDIUM  
**Time:** 20 minutes  
**Files:** 3 (`ExplorePageClient.tsx`, `ExplorePageClientMobile.tsx`, `lib/utils/postActions.ts`)

**Changes:**
1. Create `lib/utils/postActions.ts`
2. Extract `handleDeletePost` function
3. Use in both desktop and mobile components

**Pros:** DRY (Don't Repeat Yourself)  
**Cons:** More files to maintain, requires testing both components

---

## 📊 **RECOMMENDATION**

**Use Option 1** for the following reasons:

1. **Quick fix** (5 min vs 20 min)
2. **Low risk** (only 1 file changed)
3. **Immediate solution** (user can delete posts right away)
4. **Matches existing pattern** (both components have their own handlers)

Option 2 can be done later as a **refactoring task** if code duplication becomes a problem.

---

## 📝 **NEXT STEPS**

1. Read `ExplorePageClient.tsx` to copy delete handler logic
2. Add `case 'delete':` to `ExplorePageClientMobile.tsx`
3. Test delete functionality on mobile view
4. Verify confirmation dialog works
5. Verify post removal from UI
6. Verify API call succeeds

---

**Analysis completed:** 2026-03-11  
**Ready for:** SOLUTION_PLAN.md
