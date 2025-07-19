# 🎯 SOLUTION PLAN: Profile System Expansion v1

**Дата**: 17 июля 2025  
**ID задачи**: [profile_system_expansion_2025_017]  
**Связано с**: DISCOVERY_REPORT.md + ARCHITECTURE_CONTEXT.md

## 📋 ОБЩИЙ ПЛАН

### Реализация 5 требований в 3 фазы:

1. **ФАЗА 1** (Critical): Edit Profile + Posts Feed  
2. **ФАЗА 2** (Enhancement): Custom Links + Background Duplication
3. **ФАЗА 3** (Analytics): Real Statistics Integration

**Общее время**: ~4-6 часов  
**Приоритет**: Высокий (все требования критичны для UX)

## 🚀 ФАЗА 1: CORE FUNCTIONALITY (2-3 часа)

### 1.1 Edit Profile Modal Integration
**Цель**: Заменить ссылку на модальное окно редактирования

**Шаги**:
1. **Модификация CreatorPageClient.tsx**:
   ```typescript
   // Добавить state для modal
   const [showEditModal, setShowEditModal] = useState(false)
   
   // Заменить Link на button
   {isOwner ? (
     <button onClick={() => setShowEditModal(true)}>
       <PencilIcon className="w-4 h-4" />
       Edit Profile
     </button>
   ) : (...)}
   
   // Добавить ProfileSetupModal
   <ProfileSetupModal 
     isOpen={showEditModal}
     onClose={() => setShowEditModal(false)}
     initialData={{
       nickname: creator.nickname,
       fullName: creator.fullName,
       bio: creator.bio,
       avatar: creator.avatar,
       website: creator.website,
       twitter: creator.twitter,
       telegram: creator.telegram
     }}
     mode="edit"
   />
   ```

2. **Расширение ProfileSetupModal.tsx**:
   ```typescript
   // Добавить support для edit mode
   interface ProfileSetupModalProps {
     // ... existing props
     initialData?: Partial<ProfileData>
     mode?: 'create' | 'edit'
   }
   
   // Предзаполнение формы в edit mode
   useEffect(() => {
     if (mode === 'edit' && initialData) {
       setFormData(prev => ({ ...prev, ...initialData }))
     }
   }, [mode, initialData])
   ```

3. **Обновление после сохранения**:
   ```typescript
   const handleProfileUpdate = async (data: ProfileData) => {
     try {
       await updateProfile(data)
       // Обновляем данные креатора
       await fetchCreatorData()
       setShowEditModal(false)
       toast.success('Profile updated successfully!')
     } catch (error) {
       toast.error('Failed to update profile')
     }
   }
   ```

### 1.2 Posts Feed Implementation
**Цель**: Показать реальные посты пользователя с табками

**Шаги**:
1. **Интеграция useOptimizedPosts**:
   ```typescript
   // В CreatorPageClient.tsx
   const { posts, isLoading: postsLoading, error: postsError } = useOptimizedPosts({
     creatorId,
     sortBy: 'latest'
   })
   ```

2. **Tab Navigation System**:
   ```typescript
   const [activeTab, setActiveTab] = useState<'all' | 'media' | 'text'>('all')
   
   const tabs = [
     { id: 'all', label: 'All Posts', count: posts.length },
     { id: 'media', label: 'Media', count: mediaPostsCount },
     { id: 'text', label: 'Text', count: textPostsCount }
   ]
   
   const filteredPosts = useMemo(() => {
     switch (activeTab) {
       case 'media':
         return posts.filter(post => ['image', 'video', 'audio'].includes(post.type))
       case 'text':
         return posts.filter(post => post.type === 'text')
       default:
         return posts
     }
   }, [posts, activeTab])
   ```

3. **Posts Grid Component**:
   ```typescript
   const PostsSection = () => (
     <div className="mt-8">
       {/* Tab Navigation */}
       <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
         {tabs.map(tab => (
           <button
             key={tab.id}
             onClick={() => setActiveTab(tab.id)}
             className={cn(
               "px-4 py-2 font-medium text-sm border-b-2 transition-colors",
               activeTab === tab.id 
                 ? "border-purple-500 text-purple-600 dark:text-purple-400"
                 : "border-transparent text-gray-600 dark:text-gray-400"
             )}
           >
             {tab.label} ({tab.count})
           </button>
         ))}
       </div>
       
       {/* Posts Grid */}
       {postsLoading ? (
         <PostsLoadingSkeleton />
       ) : filteredPosts.length > 0 ? (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {filteredPosts.map(post => (
             <PostCard key={post.id} post={post} />
           ))}
         </div>
       ) : (
         <EmptyPostsState activeTab={activeTab} />
       )}
     </div>
   )
   ```

4. **Замена placeholder**:
   ```typescript
   // Заменить секцию "Posts Coming Soon" на:
   <PostsSection />
   ```

## 🎨 ФАЗА 2: ENHANCEMENTS (1-2 часа)

### 2.1 Custom Links Editor
**Цель**: Позволить пользователям редактировать свой nickname для персональных ссылок

**Шаги**:
1. **Custom Link Section в ProfileSetupModal**:
   ```typescript
   // Добавить в форму редактирования
   <div className="space-y-4">
     <h3 className="text-lg font-semibold">Custom Profile Link</h3>
     <div className="flex items-center space-x-2">
       <span className="text-gray-500">fonana.me/</span>
       <input
         type="text"
         value={formData.nickname}
         onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
         placeholder="your-custom-link"
         className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
       />
     </div>
     <p className="text-sm text-gray-600">
       This will be your public profile URL
     </p>
   </div>
   ```

2. **Real-time Validation**:
   ```typescript
   const [nicknameStatus, setNicknameStatus] = useState<'checking' | 'available' | 'taken'>('available')
   
   const checkNicknameAvailability = useCallback(
     debounce(async (nickname: string) => {
       if (!nickname || nickname === creator.nickname) return
       
       setNicknameStatus('checking')
       try {
         const response = await fetch(`/api/user/check-nickname?nickname=${nickname}`)
         const data = await response.json()
         setNicknameStatus(data.available ? 'available' : 'taken')
       } catch {
         setNicknameStatus('taken')
       }
     }, 500),
     [creator.nickname]
   )
   ```

3. **API Endpoint для проверки**:
   ```typescript
   // app/api/user/check-nickname/route.ts
   export async function GET(request: NextRequest) {
     const nickname = request.nextUrl.searchParams.get('nickname')
     
     const existing = await prisma.user.findFirst({
       where: { 
         nickname: { equals: nickname, mode: 'insensitive' }
       }
     })
     
     return NextResponse.json({ available: !existing })
   }
   ```

### 2.2 Background Duplication
**Цель**: Продублировать background image на header плашку

**Шаги**:
1. **CSS Background Integration**:
   ```typescript
   // В CreatorPageClient header section
   <div 
     className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500"
     style={{
       backgroundImage: creator.backgroundImage 
         ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${creator.backgroundImage})`
         : undefined,
       backgroundSize: 'cover',
       backgroundPosition: 'center'
     }}
   >
     {/* Existing avatar and info content */}
     <div className="relative z-10 bg-black/20 backdrop-blur-sm rounded-3xl p-6">
       {/* Avatar and creator info */}
     </div>
   </div>
   ```

2. **Fallback Gradient**:
   ```typescript
   const getHeaderBackground = (backgroundImage?: string) => {
     if (backgroundImage) {
       return {
         backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${backgroundImage})`,
         backgroundSize: 'cover',
         backgroundPosition: 'center'
       }
     }
     return {
       background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
     }
   }
   ```

## 📊 ФАЗА 3: REAL STATISTICS (1 час)

### 3.1 Dynamic Statistics Integration
**Цель**: Подтянуть реальную статистику вместо статичных значений

**Шаги**:
1. **API Enhancement**:
   ```typescript
   // В GET /api/creators/{id} добавить:
   const [followersCount, postsCount, followingCount] = await Promise.all([
     prisma.follow.count({ where: { followingId: id } }),
     prisma.post.count({ where: { creatorId: id } }),
     prisma.follow.count({ where: { followerId: id } })
   ])
   
   return {
     ...creator,
     stats: {
       followers: followersCount,
       posts: postsCount, 
       following: followingCount
     }
   }
   ```

2. **Real-time Updates**:
   ```typescript
   // В CreatorPageClient добавить periodic refresh
   useEffect(() => {
     const interval = setInterval(async () => {
       // Обновляем статистику каждые 30 секунд
       await fetchCreatorData()
     }, 30000)
     
     return () => clearInterval(interval)
   }, [creatorId])
   ```

3. **Statistics Display Enhancement**:
   ```typescript
   const StatCard = ({ icon: Icon, count, label, trend }: StatCardProps) => (
     <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-4 text-center">
       <Icon className="w-6 h-6 text-purple-500 mx-auto mb-2" />
       <div className="text-2xl font-bold text-gray-900 dark:text-white">
         {count.toLocaleString()}
         {trend && (
           <span className={cn(
             "text-sm ml-1",
             trend > 0 ? "text-green-500" : "text-red-500"
           )}>
             {trend > 0 ? "↗" : "↘"}
           </span>
         )}
       </div>
       <div className="text-sm text-gray-600 dark:text-slate-400">{label}</div>
     </div>
   )
   ```

## 🔧 ТЕХНИЧЕСКИЕ ДЕТАЛИ

### Context7 MCP Integration:
- **React Hook Form**: Для формы редактирования профиля
- **React Query**: Для кеширования API calls (опционально)
- **Framer Motion**: Для анимаций модалки (опционально)

### Error Handling:
```typescript
const handleError = (error: Error, context: string) => {
  console.error(`[${context}] Error:`, error)
  toast.error(`Failed to ${context.toLowerCase()}`)
  
  // Logging для мониторинга
  fetch('/api/log', {
    method: 'POST',
    body: JSON.stringify({ 
      level: 'error',
      context,
      message: error.message,
      creatorId
    })
  })
}
```

### Performance Optimizations:
```typescript
// Memoization для фильтрации постов
const filteredPosts = useMemo(() => filterPosts(posts, activeTab), [posts, activeTab])

// Lazy loading для больших списков постов
const { ref, inView } = useInView({ threshold: 0 })
useEffect(() => {
  if (inView && hasMore && !isLoading) {
    loadMorePosts()
  }
}, [inView, hasMore, isLoading])
```

### Mobile Responsiveness:
```typescript
// Адаптивные табки
<div className="flex overflow-x-auto scrollbar-hide border-b">
  {tabs.map(tab => (
    <button className="whitespace-nowrap px-4 py-2 min-w-max">
      <span className="hidden sm:inline">{tab.label}</span>
      <span className="sm:hidden">{tab.shortLabel}</span>
    </button>
  ))}
</div>
```

## ✅ КРИТЕРИИ ЗАВЕРШЕНИЯ

### Фаза 1:
- [ ] Edit Profile кнопка открывает модалку
- [ ] Модалка сохраняет изменения успешно  
- [ ] Посты загружаются и отображаются
- [ ] Табки работают (All/Media/Text)
- [ ] Медиа фильтрация корректна

### Фаза 2:
- [ ] Custom links редактируются
- [ ] Nickname validation работает
- [ ] Background дублируется на header
- [ ] Responsive design на всех устройствах

### Фаза 3:
- [ ] Статистика берется из БД
- [ ] Счетчики обновляются в реальном времени
- [ ] Performance оптимизирован

### Общие критерии:
- [ ] Zero breaking changes
- [ ] TypeScript coverage 100%
- [ ] Mobile responsive
- [ ] Error handling готов
- [ ] Playwright MCP validation пройдена

**Следующий файл**: IMPACT_ANALYSIS.md - оценка влияния на систему 