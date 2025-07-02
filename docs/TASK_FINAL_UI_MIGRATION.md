## 🚨 [Финальный этап: UI Миграция и Удаление старой архитектуры]

### Контекст
После внедрения Zustand, CacheManager, WebSocket Event Manager, ErrorBoundary и валидации — UI всё ещё работает на старых контекстах (`UserContext`, `NotificationContext`, `CreatorContext`). Это создает двойную архитектуру, race conditions и отставание от актуальной схемы проекта.

### Цель
Полностью мигрировать UI-компоненты на Zustand и связанные сервисы. Удалить устаревшие контексты, кеши, хуки и прямые вызовы WebSocket. Синхронизировать архитектуру проекта с документацией.

---

### Роадмап

#### Этап 1: Миграция UserContext
- Найти все вызовы `useUserContext()`
- Заменить на хуки из `appStore.ts`:
```ts
const user = useUser()
const isLoading = useUserLoading()
const error = useUserError()
```

#### Этап 2: Миграция NotificationContext
- Заменить `useNotificationContext()` на Zustand хуки:
```ts
const notifications = useNotifications()
const unreadCount = useUnreadCount()
```

#### Этап 3: Миграция CreatorContext
- Заменить `useCreatorData()` на Zustand хуки:
```ts
const creator = useCreator()
const posts = useCreatorPosts()
```

#### Этап 4: Удаление устаревших контекстов
- Удалить файлы:
  - `lib/contexts/UserContext.tsx`
  - `lib/contexts/NotificationContext.tsx`
  - `lib/contexts/CreatorContext.tsx`
  - `lib/hooks/useCreatorData.ts`
  - `components/UserProvider.tsx`
- Удалить провайдеры из `layout.tsx`, `App.tsx`

#### Этап 5: Интеграция WebSocket Event Manager
- Все `wsService.emit(...)` → заменить на функции из `WebSocketEventManager`
- Подключить обработчики через `setupDefaultHandlers()` в `AppProvider`

#### Этап 6: Интеграция CacheManager
- Вместо прямого `localStorage` использовать `cacheManager.get()` и `cacheManager.set()`

#### Этап 7: Подключение retry логики
- Все критические API вызовы обернуть в `retry(...)` или `retryWithToast(...)`

---

### Критерии успеха

✅ Все UI-компоненты используют только Zustand  
✅ Все старые контексты и провайдеры удалены  
✅ WebSocket работает через EventManager  
✅ Кеширование централизовано через CacheManager  
✅ Retry логика работает в критичных местах  
✅ `Fonana_Architecture.md` и `Fonana_Context_Flows.md` полностью соответствуют реализации  
✅ Все сценарии протестированы: лайки, комменты, подписки, ошибки, reconnect, кеш

---

### Артефакты

- [ ] Обновленные все страницы и компоненты (30+)
- [ ] Удаленные старые контексты
- [ ] Обновленные импорты во всех файлах
- [ ] Проверенные WebSocket события
- [ ] Протестированное поведение UI

---

### Напоминание

❗ Работать **поэтапно**  
❗ Тестировать после каждого блока  
❗ Делать `backup` и иметь rollback  
❗ Сначала `user`, потом `notifications`, потом `creator`