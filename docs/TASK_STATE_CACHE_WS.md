## 🧩 [Комплексный этап: Zustand + CacheManager + WebSocket Event Manager]

### Контекст
Для стабилизации архитектуры необходимо централизовать состояние, кеш и real-time события. В данный момент состояния разбросаны по `UserContext`, `NotificationContext`, `CreatorContext`, кеширование происходит вручную, а WebSocket-обработчики дублируются.

### Цель
Внедрить Zustand в качестве глобального хранилища, CacheManager для TTL-контроля данных и WebSocketEventManager для унифицированной обработки real-time событий.

---

### Роадмап

#### 1. Zustand Store
- Установить Zustand
- Создать `lib/store/appStore.ts`
  - `userSlice`: `user`, `isLoading`, `setUser()`, `clearUser()`
  - `notificationSlice`: `notifications`, `unreadCount`, `setNotifications()`
  - `creatorSlice`: `creator`, `posts`, `setCreator()`
- Обновить контексты на работу через Zustand
- Добавить `AppProvider.tsx` для обертки

#### 2. CacheManager
- Создать `lib/services/CacheManager.ts`
  - TTL-логика, LRU-эвикшен
  - Методы `get`, `set`, `invalidate`, `clearAll`
- Заменить текущие кеши (`StorageService`, `UserContext`, `CreatorContext`) на него

#### 3. WebSocket Event Manager
- Создать `lib/services/WebSocketEventManager.ts`
  - Централизованное управление событиями
  - `subscribe(channel, handler)`, `unsubscribe()`, `emit()`
  - Throttling и deduplication
- Обновить `NotificationContext`, `PostCard`, `CommentSection` на работу через store + ws manager

---

### Критерии успеха

✅ `UserContext`, `NotificationContext`, `CreatorContext` используют Zustand  
✅ Все кеши заведены через `CacheManager`  
✅ WebSocket события обновляют store напрямую  
✅ Компоненты UI автоматически реагируют на изменения store  
✅ Race conditions устранены  
✅ Подписки не дублируются, throttle работает  
✅ Протестированы сценарии из `Fonana_Context_Flows.md`

---

### Артефакты

- [ ] `lib/store/appStore.ts`
- [ ] `lib/services/CacheManager.ts`
- [ ] `lib/services/WebSocketEventManager.ts`
- [ ] Обновленные `*_Context.tsx`
- [ ] `providers/AppProvider.tsx`
- [ ] Обновления документации `Fonana_Architecture.md`, `Fonana_Context_Flows.md`