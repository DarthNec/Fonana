# 🚀 SOLUTION PLAN: Real-time Post Updates

**Дата:** 22.01.2025  
**M7 Phase:** 2 - Solution Plan v1  
**Предыдущий:** [Architecture Context](./1_ARCHITECTURE_CONTEXT.md)

## 🎯 SOLUTION OVERVIEW

### Стратегия: WebSocket Event Extension

**Подход:** Расширение существующей WebSocket инфраструктуры для уведомления автора о созданном посте

**Ключевые принципы:**
1. **Minimal invasive:** Минимальные изменения в существующем коде
2. **Graceful degradation:** Fallback к существующему поведению
3. **Performance first:** Параллельная обработка WebSocket + API response
4. **Consistency:** Использование existing patterns и infrastructure

## 📋 IMPLEMENTATION ROADMAP

### Phase 1: Backend WebSocket Integration (30 min)

#### Step 1.1: WebSocket Event Function
**Файл:** `websocket-server/src/events/posts.js`

```typescript
// NEW: Author notification function
async function notifyPostAuthor(post, authorId) {
  try {
    console.log(`📢 Notifying post author ${authorId} about new post ${post.id}`)
    
    // Normalize post data for consistency
    const normalizedPost = {
      id: post.id,
      content: {
        title: post.title,
        text: post.content
      },
      media: {
        type: post.type,
        url: post.mediaUrl,
        thumbnail: post.thumbnail
      },
      access: {
        isLocked: post.isLocked,
        price: post.price,
        currency: post.currency
      },
      creator: post.creator,
      metadata: {
        createdAt: post.createdAt,
        category: post.category
      }
    }
    
    const event = {
      type: 'post_created',
      post: normalizedPost,
      userId: authorId,
      timestamp: new Date().toISOString()
    }
    
    // Send direct to author if connected
    const sent = sendToUser(authorId, event)
    
    // Also broadcast to author's feed channel
    broadcastToSubscribers(
      { type: 'feed', userId: authorId },
      event
    )
    
    // Log for monitoring
    console.log(`✅ Post author notification sent: ${sent ? 'direct' : 'channel-only'}`)
    
    return true
  } catch (error) {
    console.error('❌ Failed to notify post author:', error)
    return false
  }
}

// Export the new function
module.exports = {
  // ... existing exports
  notifyPostAuthor
}
```

**Estimated time:** 15 minutes

#### Step 1.2: API Integration
**Файл:** `app/api/posts/route.ts`

```typescript
// Import WebSocket functions
import { notifyPostAuthor } from '@/websocket-server/src/events/posts'

// In POST function, after successful post creation (around line 320):
const post = await prisma.post.create({
  data: postData,
  include: {
    creator: {
      select: {
        id: true,
        nickname: true,
        fullName: true,
        avatar: true,
        isCreator: true
      }
    }
  }
})

// Update user post count
await prisma.user.update({
  where: { id: user.id },
  data: { postsCount: { increment: 1 } }
})

// NEW: WebSocket notification to author (non-blocking)
try {
  await notifyPostAuthor(post, user.id)
  console.log('[API] ✅ Author notified via WebSocket')
} catch (error) {
  // Don't block API response
  console.error('[API] ⚠️ WebSocket notification failed:', error)
}

// Continue with existing API response...
return NextResponse.json({ success: true, post: responsePost })
```

**Estimated time:** 15 minutes

### Phase 2: Frontend Integration (20 min)

#### Step 2.1: CreatePostModal Update
**Файл:** `components/CreatePostModal.tsx`

```typescript
// In handleSubmit function (around line 730):

// Current implementation:
onPostCreated((newPost) => {
  setShowCreateModal(false)
  refresh()  // ❌ Remove this line
})

// NEW implementation:
onPostCreated((newPost) => {
  setShowCreateModal(false)
  
  // Set up fallback timer for real-time update
  const fallbackTimer = setTimeout(() => {
    // Check if post appeared in feed via real-time
    const feedElement = document.querySelector(`[data-post-id="${newPost.id}"]`)
    if (!feedElement) {
      console.warn('Real-time update failed, falling back to refresh')
      refresh()
    }
  }, 3000) // 3 second fallback
  
  // Clear timer if component unmounts
  return () => clearTimeout(fallbackTimer)
})
```

**Estimated time:** 10 minutes

#### Step 2.2: FeedPageClient Optimization
**Файл:** `components/FeedPageClient.tsx`

```typescript
// In useOptimizedRealtimePosts configuration (around line 75):
const {
  posts: realtimePosts,
  newPostsCount,
  hasNewPosts,
  loadPendingPosts
} = useOptimizedRealtimePosts({
  posts,
  autoUpdateFeed: user?.id ? true : false, // NEW: Auto-update for logged-in users
  showNewPostsNotification: false, // NEW: Disable notification for own posts
  maxPendingPosts: 50,
  batchUpdateDelay: 100
})
```

**Estimated time:** 10 minutes

### Phase 3: Validation & Testing (15 min)

#### Step 3.1: WebSocket Server Testing
```bash
# Test WebSocket server locally
cd websocket-server
npm run dev

# In another terminal, test the new function
node -e "
const { notifyPostAuthor } = require('./src/events/posts');
const testPost = {
  id: 'test-123',
  title: 'Test Post',
  content: 'Test content',
  type: 'text',
  creator: { id: 'test-user', nickname: 'testuser' }
};
notifyPostAuthor(testPost, 'test-user');
"
```

#### Step 3.2: Integration Testing
```javascript
// Manual testing flow:
// 1. Open /feed page
// 2. Open browser DevTools → Network → WS tab
// 3. Create new post via CreatePostModal
// 4. Verify WebSocket event received
// 5. Verify post appears in feed without refresh
```

**Estimated time:** 15 minutes

## 🔧 DETAILED IMPLEMENTATION

### Backend Implementation Details

#### WebSocket Event Structure
```typescript
interface PostCreatedEvent {
  type: 'post_created'
  post: {
    id: string
    content: {
      title: string
      text: string
    }
    media: {
      type: 'text' | 'image' | 'video' | 'audio'
      url?: string
      thumbnail?: string
    }
    access: {
      isLocked: boolean
      price?: number
      currency?: string
    }
    creator: {
      id: string
      nickname: string
      fullName: string
      avatar?: string
      isCreator: boolean
    }
    metadata: {
      createdAt: string
      category: string
    }
  }
  userId: string
  timestamp: string
}
```

#### Error Handling Strategy
```typescript
// In notifyPostAuthor function
try {
  // WebSocket operations
} catch (error) {
  // Log for monitoring
  console.error('WebSocket notification failed:', {
    postId: post.id,
    authorId,
    error: error.message,
    timestamp: new Date().toISOString()
  })
  
  // Don't throw - graceful degradation
  return false
}
```

#### Monitoring & Logging
```typescript
// Add to websocket-server/src/monitoring.js
function logPostAuthorNotification(postId, authorId, success) {
  stats.postAuthorNotifications = (stats.postAuthorNotifications || 0) + 1
  if (success) {
    stats.postAuthorNotificationsSuccess = (stats.postAuthorNotificationsSuccess || 0) + 1
  }
  
  // Log to file
  logEvent('post_author_notification', {
    postId,
    authorId,
    success,
    timestamp: new Date().toISOString()
  })
}
```

### Frontend Implementation Details

#### Real-time Hook Integration
```typescript
// In useOptimizedRealtimePosts hook
const handlePostCreated = useCallback((event: WebSocketEvent) => {
  if (event.type === 'post_created' && event.post) {
    const newPost = event.post as UnifiedPost
    
    // Check if this is the current user's post
    const isOwnPost = event.userId === user?.id
    
    if (isOwnPost && autoUpdateFeed) {
      // Immediately add own posts to feed
      setUpdatedPosts(prev => {
        // Prevent duplicates
        if (prev.some(p => p.id === newPost.id)) return prev
        return [newPost, ...prev]
      })
      
      // Show success toast
      toast.success('Post published successfully!', {
        duration: 3000,
        icon: '🎉'
      })
    } else if (!isOwnPost) {
      // Handle posts from other users (existing logic)
      setPendingPosts(prev => [newPost, ...prev])
      // ... existing notification logic
    }
  }
}, [user?.id, autoUpdateFeed, ...])
```

#### Component State Management
```typescript
// In CreatePostModal - enhanced error handling
const [isRealTimeWorking, setIsRealTimeWorking] = useState(true)

const handleSubmit = async (e: React.FormEvent) => {
  // ... existing form submission logic
  
  try {
    const response = await fetch('/api/posts', { /* ... */ })
    const result = await response.json()
    
    if (response.ok) {
      const newPost = result.post
      
      // Start monitoring for real-time update
      const checkRealTime = () => {
        setTimeout(() => {
          const feedHasPost = checkIfPostInFeed(newPost.id)
          if (!feedHasPost) {
            console.warn('Real-time update not detected, using fallback')
            setIsRealTimeWorking(false)
            refresh()
          }
        }, 2000)
      }
      
      if (onPostCreated) {
        onPostCreated(newPost)
        checkRealTime()
      }
    }
  } catch (error) {
    // ... error handling
  }
}
```

### Data Consistency Strategy

#### Post Normalization
```typescript
// Ensure consistent data structure between API and WebSocket
function normalizePostForWebSocket(post) {
  return {
    id: post.id,
    content: {
      title: post.title || '',
      text: post.content || ''
    },
    media: {
      type: post.type || 'text',
      url: post.mediaUrl || null,
      thumbnail: post.thumbnail || null
    },
    access: {
      isLocked: post.isLocked || false,
      price: post.price || null,
      currency: post.currency || 'SOL',
      tier: post.minSubscriptionTier || null
    },
    creator: {
      id: post.creator.id,
      nickname: post.creator.nickname,
      fullName: post.creator.fullName,
      avatar: post.creator.avatar,
      isCreator: post.creator.isCreator
    },
    metadata: {
      createdAt: post.createdAt,
      category: post.category,
      likesCount: 0,
      commentsCount: 0
    }
  }
}
```

#### Deduplication Logic
```typescript
// In useOptimizedRealtimePosts
const addPostToFeed = useCallback((newPost: UnifiedPost) => {
  setUpdatedPosts(prev => {
    // Check for existing post
    const existingIndex = prev.findIndex(p => p.id === newPost.id)
    
    if (existingIndex >= 0) {
      // Update existing post (in case of race condition)
      const updated = [...prev]
      updated[existingIndex] = newPost
      return updated
    } else {
      // Add new post to beginning
      return [newPost, ...prev]
    }
  })
}, [])
```

## 🔄 FALLBACK MECHANISMS

### Level 1: WebSocket Failure Detection
```typescript
// In CreatePostModal
const [wsFailureDetected, setWsFailureDetected] = useState(false)

useEffect(() => {
  // Monitor WebSocket connection
  const wsService = getWebSocketService()
  
  const handleConnectionLost = () => {
    setWsFailureDetected(true)
    console.warn('WebSocket connection lost - will use fallback refresh')
  }
  
  wsService.on('connectionLost', handleConnectionLost)
  
  return () => {
    wsService.off('connectionLost', handleConnectionLost)
  }
}, [])

// In handleSubmit
if (wsFailureDetected) {
  // Immediately fallback to refresh
  if (onPostCreated) {
    onPostCreated(result.post)
    refresh()
  }
} else {
  // Use real-time with fallback timer
  // ... existing logic
}
```

### Level 2: Timeout-based Fallback
```typescript
// Enhanced fallback with multiple checkpoints
const setupFallbackChecks = (postId: string) => {
  const checks = [
    { delay: 1000, action: 'check' },
    { delay: 3000, action: 'warn' },
    { delay: 5000, action: 'fallback' }
  ]
  
  checks.forEach(({ delay, action }) => {
    setTimeout(() => {
      const postExists = checkIfPostInFeed(postId)
      
      switch (action) {
        case 'check':
          if (!postExists) {
            console.log('Real-time update not yet detected, continuing to wait...')
          }
          break
        case 'warn':
          if (!postExists) {
            console.warn('Real-time update significantly delayed')
          }
          break
        case 'fallback':
          if (!postExists) {
            console.error('Real-time update failed, executing fallback')
            refresh()
          }
          break
      }
    }, delay)
  })
}
```

### Level 3: Manual Refresh Option
```typescript
// User-triggered fallback
const showManualRefreshOption = () => {
  toast.custom((t) => (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-lg">
      <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
        Your post was created but may not be visible yet.
      </p>
      <button
        onClick={() => {
          refresh()
          toast.dismiss(t.id)
        }}
        className="text-sm bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
      >
        Refresh to see post
      </button>
    </div>
  ), {
    duration: 10000,
    position: 'top-center'
  })
}
```

## 📊 PERFORMANCE OPTIMIZATION

### WebSocket Event Batching
```typescript
// If multiple events arrive quickly
const eventBatch = []
const batchTimeout = 100 // ms

const processBatchedEvents = () => {
  if (eventBatch.length > 0) {
    const posts = eventBatch.map(e => e.post)
    addMultiplePostsToFeed(posts)
    eventBatch.length = 0
  }
}

const handleWebSocketEvent = (event) => {
  if (event.type === 'post_created') {
    eventBatch.push(event)
    
    // Debounce batch processing
    clearTimeout(batchTimer)
    batchTimer = setTimeout(processBatchedEvents, batchTimeout)
  }
}
```

### React Performance
```typescript
// Memoized components to prevent unnecessary re-renders
const PostItem = React.memo(({ post, onAction }) => {
  // ... component logic
}, (prevProps, nextProps) => {
  return prevProps.post.id === nextProps.post.id &&
         prevProps.post.metadata.updatedAt === nextProps.post.metadata.updatedAt
})

// Optimized state updates
const addPostOptimized = useCallback((newPost) => {
  setUpdatedPosts(prev => {
    // Early return if post already exists
    if (prev.some(p => p.id === newPost.id)) return prev
    
    // Use functional update for better performance
    return [newPost, ...prev.slice(0, 99)] // Keep max 100 posts in memory
  })
}, [])
```

## 🧪 TESTING STRATEGY

### Unit Tests
```typescript
// tests/websocket-events.test.ts
describe('notifyPostAuthor', () => {
  it('should send correct event structure', async () => {
    const mockPost = createMockPost()
    const result = await notifyPostAuthor(mockPost, 'user-123')
    
    expect(result).toBe(true)
    expect(mockSendToUser).toHaveBeenCalledWith('user-123', {
      type: 'post_created',
      post: expect.objectContaining({
        id: mockPost.id,
        content: expect.any(Object),
        media: expect.any(Object)
      }),
      userId: 'user-123',
      timestamp: expect.any(String)
    })
  })
  
  it('should handle WebSocket failures gracefully', async () => {
    mockSendToUser.mockImplementation(() => { throw new Error('WebSocket error') })
    
    const result = await notifyPostAuthor(createMockPost(), 'user-123')
    expect(result).toBe(false)
    // Should not throw
  })
})
```

### Integration Tests
```typescript
// tests/post-creation-flow.test.ts
describe('Real-time post creation flow', () => {
  it('should update feed immediately after post creation', async () => {
    const { getByTestId, queryByTestId } = render(<FeedPageClient />)
    
    // Mock WebSocket event
    const mockPost = createMockPost()
    fireEvent(window, new CustomEvent('websocket-event', {
      detail: {
        type: 'post_created',
        post: mockPost,
        userId: 'current-user'
      }
    }))
    
    // Post should appear immediately
    await waitFor(() => {
      expect(queryByTestId(`post-${mockPost.id}`)).toBeInTheDocument()
    })
  })
})
```

### E2E Tests (Playwright)
```javascript
// tests/e2e/realtime-posts.spec.js
test('author sees new post immediately after creation', async ({ page }) => {
  await page.goto('http://localhost:3000/feed')
  
  // Open create post modal
  await page.click('[data-testid="create-post-button"]')
  
  // Fill and submit form
  await page.fill('[data-testid="post-content"]', 'Test real-time post')
  await page.click('[data-testid="submit-post"]')
  
  // Post should appear without page refresh
  await expect(page.locator('[data-testid="post-list"]')).toContainText('Test real-time post')
  
  // Verify no network refresh request was made
  const requests = page.context().requests()
  const refreshRequests = requests.filter(r => r.url().includes('/api/posts') && r.method() === 'GET')
  expect(refreshRequests).toHaveLength(1) // Only initial load
})
```

## 📋 DEPLOYMENT CHECKLIST

### Pre-deployment Validation
- [ ] WebSocket server functions tested locally
- [ ] API integration verified
- [ ] Frontend real-time updates working
- [ ] Fallback mechanisms tested
- [ ] Error scenarios handled
- [ ] Performance benchmarks met
- [ ] Security validation completed

### Deployment Steps
1. **Deploy WebSocket server changes**
   ```bash
   # Copy new functions to production
   scp websocket-server/src/events/posts.js root@64.20.37.222:/var/www/Fonana/websocket-server/src/events/
   
   # Restart WebSocket server
   ssh root@64.20.37.222 'cd /var/www/Fonana/websocket-server && pm2 restart fonana-ws'
   ```

2. **Deploy API changes**
   ```bash
   # Deploy Next.js application
   git push origin main
   ./deploy-safe.sh
   ```

3. **Verify functionality**
   ```bash
   # Test WebSocket connection
   ssh root@64.20.37.222 'pm2 logs fonana-ws --lines 20'
   
   # Test API endpoints
   curl -X POST https://fonana.me/api/posts -H "Content-Type: application/json" -d '...'
   ```

### Post-deployment Monitoring
- [ ] WebSocket connection metrics
- [ ] Real-time event delivery rates
- [ ] Fallback trigger frequency
- [ ] User experience metrics
- [ ] Error rate monitoring

## 🎯 SUCCESS METRICS

### Technical Metrics
- **Real-time delivery:** > 95% success rate within 500ms
- **Fallback trigger:** < 5% of post creations
- **WebSocket latency:** < 100ms average
- **Memory usage:** No leaks during extended usage

### User Experience Metrics
- **Time to visibility:** Post appears in < 500ms
- **User satisfaction:** No reported issues with post visibility
- **Error recovery:** Seamless fallback experience

### Business Metrics
- **Post creation rate:** No negative impact
- **User engagement:** Potential increase due to immediate feedback
- **Support tickets:** No increase in post-related issues

## 🔄 ROLLBACK PLAN

### Immediate Rollback (< 5 minutes)
1. **Disable WebSocket notifications in API:**
   ```typescript
   // Quick disable in API
   const ENABLE_REALTIME_AUTHOR_NOTIFICATIONS = false
   
   if (ENABLE_REALTIME_AUTHOR_NOTIFICATIONS) {
     await notifyPostAuthor(post, user.id)
   }
   ```

2. **Revert frontend changes:**
   ```typescript
   // Restore refresh() call in CreatePostModal
   onPostCreated(() => {
     setShowCreateModal(false)
     refresh() // Restored fallback behavior
   })
   ```

### Full Rollback (< 30 minutes)
1. Revert WebSocket server changes
2. Redeploy previous API version
3. Clear any cached frontend assets

### Rollback Validation
- [ ] Post creation still works normally
- [ ] Feed updates correctly with refresh
- [ ] No JavaScript errors
- [ ] WebSocket connections stable

**Solution Plan v1 завершен ✅**

**Next Phase:** [Impact Analysis](./3_IMPACT_ANALYSIS.md) 