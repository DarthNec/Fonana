## 🧱 [Интеграция архитектурных слоёв: WebSocketEventManager, CacheManager, Retry логика]

### Контекст
Архитектурные слои (WebSocketEventManager, CacheManager, Retry логика) созданы, протестированы и готовы к использованию. Однако они **не интегрированы в реальный код** проекта: хуки, компоненты и API вызовы продолжают использовать старую логику. Это создаёт архитектурный разрыв и делает проект нестабильным и противоречивым.

### Цель
Интегрировать архитектурные слои в основной код:
- Заменить прямые вызовы WebSocket на централизованный менеджер событий
- Заменить обращения к localStorage на использование CacheManager
- Обернуть критические async вызовы в retry-логику

---

### Роадмап

#### Этап 1: WebSocketEventManager - ✅ ЧАСТИЧНО ЗАВЕРШЕН
- [x] ✅ Найти все вызовы `wsService.emit(...)` и заменить на:
```ts
import { emitPostLiked } from '@/lib/services/WebSocketEventManager'
emitPostLiked(postId, likesCount, userId)
```
- [x] ✅ Заменить `wsService.on(...)` на подписки через `setupDefaultHandlers()` в `AppProvider`
- [x] ✅ Удалить прямое использование `wsService` в хуках и UI

#### Этап 2: CacheManager - ⚠️ ЧАСТИЧНО ИНТЕГРИРОВАН
- [x] ⚠️ Найти и удалить все вызовы `localStorage.getItem(...)`, `setItem(...)`, `removeItem(...)`
- [ ] Заменить на:
```ts
import { cacheManager } from '@/lib/services/CacheManager'
const cachedUser = cacheManager.get('user_data')
cacheManager.set('user_data', newUserData)
```
- [ ] Использовать в `AppProvider`, `Feed`, `Profile`, `CreatorPage`, `SubscriptionManager` и т.д.

#### Этап 3: Retry логика - ⚠️ ЧАСТИЧНО ИНТЕГРИРОВАНА
- [x] ⚠️ Найти все критические async вызовы, такие как:
  - `fetchUserData()`
  - `fetchNotifications()`
  - `POST /like`
  - `POST /comment`
- [ ] Обернуть их в:
```ts
import { retryWithToast } from '@/lib/utils/retry'
await retryWithToast(() => fetchUserData(), config, 'UserData')
```
- [ ] Убедиться, что при ошибках показывается toast, UI fallback или retry-UI

---

### Критерии успеха

✅ Все `wsService.emit/on` удалены из UI и хуков  
✅ Все кеши и восстановление используют `CacheManager`  
✅ Все важные async вызовы покрыты `retry(...)` или `retryWithToast(...)`  
✅ Весь старый код удалён, архитектурные слои используются как основа проекта  
✅ Возможна верификация архитектуры без дополнительных слоёв

---

### Артефакты

- [ ] Обновлённые хуки и компоненты без `wsService`
- [ ] Все обращения к кешу через `cacheManager`
- [ ] Retry логика в критических точках API
- [ ] Обновлённые `Fonana_Architecture.md`, `Fonana_Context_Flows.md`, `REFACTORING_PROGRESS_REPORT.md` после завершения

---

### Время выполнения
⏱️ Примерно 2–3 часа

---

### Напоминание
❗ Это последний интеграционный этап  
❗ Без него проект остаётся на «фейковой» архитектуре  
❗ Только после завершения можно фиксировать архитектуру и начинать масштабирование