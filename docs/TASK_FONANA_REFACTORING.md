## 🚨 [Рефакторинг критических архитектурных проблем Fonana]

### Контекст  
Проект Fonana содержит *системные архитектурные дефекты*, вызванные дублированием логики, нарушениями правил хуков, отсутствием единого состояния, ошибками в подписках WebSocket, уязвимостями безопасности, и деструктивной обработкой `localStorage`. Предыдущие фиксы производились хаотично и привели к каскадным багам, включая потерю уведомлений, сбои лайков и React error #310.

Архитектурная документация (`Fonana_Architecture.md`, `Fonana_Context_Flows.md`) уже составлена и должна использоваться **как инструкция**.

### Цель  
Пошагово устранить системные проблемы без порчи рабочего кода, строго следуя архитектурной документации и предотвращая побочные баги.

---

### Роадмап

#### 📍 Этап 1. Реанимация хуков и подписок (Приоритет 1)
1. Найти и устранить все нарушения правил React Hooks (React Error #310)  
2. Обновить хуки `useOptimizedRealtimePosts.tsx`, `useRealtimePosts.tsx`, `PricingProvider.tsx`  
3. Обновить все `useEffect`, зависящие от `user?.id`, чтобы они безопасно перезапускались

#### 📍 Этап 2. Централизация localStorage (Приоритет 1)
1. Создай `StorageService` с методами:
   - `getUserFromCache(wallet: string): User | null`  
   - `setUserToCache(user: User, wallet: string)`  
   - `clearUserCache()`
2. Удали дублирование кеш-логики
3. Добавь проверку `typeof window !== "undefined"` и try-catch

#### 📍 Этап 3. Декомпозиция WebSocket (Приоритет 1)
1. Разорви циклическую зависимость `WebSocket → JWT → UserContext → WS events → WebSocket`
2. Вынеси получение JWT в отдельный слой (AuthService)
3. Подключение WebSocket происходит **только после загрузки `user.id`**

#### 📍 Этап 4. Централизация состояния (Приоритет 2)
1. Внедри Zustand или Redux Toolkit
2. Перенеси `UserContext`, `NotificationContext`, `CreatorContext` в единое хранилище
3. Реализуй глобальную загрузку и инициализацию через `AppProvider`

#### 📍 Этап 5. Унификация кеша (Приоритет 2)
1. Создай `CacheManager.ts` с TTL-логикой и LRU-эвикшеном
2. Все кеши использовать его
3. Добавь централизованный `invalidateCache(key)` метод

#### 📍 Этап 6. Безопасность и валидация (Приоритет 2)
1. Шифруй JWT при сохранении
2. Валидация всех входных данных через Zod
3. Проверь маршруты API

#### 📍 Этап 7. WebSocket Event Manager (Приоритет 3)
1. Создай `WebSocketEventManager.ts`
2. Разгрузи контексты от подписок
3. Добавь throttling, deduplication, shared listeners

#### 📍 Этап 8. Обработка ошибок и деградация (Приоритет 3)
1. Добавь Error Boundaries
2. Retry с exponential backoff
3. Toast при любой ошибке (`wallet`, `notifications`, `likes`)

---

### Критерии успеха

✅ Ошибки React #310 устранены  
✅ localStorage используется централизованно  
✅ WebSocket не зависит напрямую от UserContext  
✅ Все подписки работают реактивно  
✅ Кеш единый, TTL согласован  
✅ JWT безопасен  
✅ Уведомления приходят при лайке/комменте  
✅ UI не крашится  
✅ Протестированы сценарии из `Fonana_Context_Flows.md`

---

### Артефакты

- `lib/services/StorageService.ts`
- `lib/services/CacheManager.ts`
- `lib/services/WebSocketEventManager.ts`
- `lib/store/appStore.ts` (Zustand)
- Обновленные `UserContext`, `NotificationContext`, `LikeButton`
- ESLint rule: no-callback-deps-in-hooks
- Док: `Fonana_Architecture.md`, `Fonana_Context_Flows.md` — обновить после рефакторинга