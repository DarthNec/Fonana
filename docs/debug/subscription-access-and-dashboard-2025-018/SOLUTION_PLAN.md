# 📋 SOLUTION PLAN: Восстановление системы подписок

## 📅 Дата: 18.01.2025
## 🎯 Версия: v1

## 🎯 ЦЕЛИ

1. **Исправить доступ к контенту по подписке** с real-time обновлением
2. **Восстановить управление подписками** в дашборде
3. **Найти и восстановить весь потерянный функционал**
4. **Обеспечить enterprise-grade качество**

## 📝 ДЕТАЛЬНЫЙ ПЛАН

### ФАЗА 1: Исправление тира подписки lafufu (Priority: 🔴 Critical)

#### Шаг 1.1: Обновление подписки в БД
```sql
UPDATE subscriptions 
SET plan = 'basic' 
WHERE "userId" = (SELECT id FROM users WHERE nickname = 'lafufu')
  AND "creatorId" = (SELECT id FROM users WHERE nickname = 'fonanadev');
```

#### Шаг 1.2: Добавление WebSocket интеграции с JWT
- Создать `lib/utils/jwt.ts` для генерации JWT токенов
- Обновить `lib/services/websocket.ts` для передачи токена
- Интегрировать с NextAuth session

#### Шаг 1.3: Исправление real-time обновлений
- Обеспечить доставку события `subscription_updated`
- Проверить обработчики в `useOptimizedRealtimePosts`
- Добавить оптимистичные обновления UI

### ФАЗА 2: Восстановление управления подписками (Priority: 🔴 Critical)

#### Шаг 2.1: Интеграция UserSubscriptions в дашборд
```tsx
// app/dashboard/page.tsx
import UserSubscriptions from '@/components/UserSubscriptions'

// Добавить компонент в layout
<UserSubscriptions />
```

#### Шаг 2.2: Добавление навигации
- Добавить пункт "My Subscriptions" в меню профиля
- Создать отдельную страницу `/dashboard/subscriptions`
- Добавить быстрые действия в дашборд

#### Шаг 2.3: Интеграция SubscriptionManager
- Добавить вкладку "Manage Visibility" 
- Сохранение настроек в localStorage и БД
- Синхронизация с CreatorsExplorer

### ФАЗА 3: Поиск и восстановление потерянного функционала (Priority: 🟡 High)

#### Шаг 3.1: Аудит всех компонентов
- Сканирование `/components` на неиспользуемые файлы
- Проверка git истории на удаленный функционал
- Анализ импортов и экспортов

#### Шаг 3.2: Восстановление найденного функционала
Потенциально потерянный функционал:
- Flash Sales компоненты
- Referral система
- Analytics dashboard
- Rewards/Achievement система
- Notification preferences
- Privacy settings

#### Шаг 3.3: Документирование всего функционала
- Создать карту всех features
- Обновить ARCHITECTURE_COMPLETE_MAP.md
- Добавить в memory-bank

### ФАЗА 4: Enterprise-grade улучшения (Priority: 🟢 Medium)

#### Шаг 4.1: Добавление метрик и аналитики
- Subscription conversion rate
- Tier upgrade tracking
- Churn analysis
- Revenue analytics

#### Шаг 4.2: Улучшение UX
- Анимации при обновлении доступа
- Progress indicators для загрузки
- Skeleton screens
- Error boundaries

#### Шаг 4.3: Оптимизация производительности
- Кэширование подписок
- Debounce/throttle для WebSocket
- Virtual scrolling для больших списков
- Lazy loading компонентов

## 🔧 ТЕХНИЧЕСКИЕ ИЗМЕНЕНИЯ

### 1. Новые файлы:
- `lib/utils/jwt.ts` - JWT утилиты
- `app/dashboard/subscriptions/page.tsx` - страница подписок
- `components/SubscriptionStats.tsx` - статистика подписок
- `lib/hooks/useSubscriptionManager.ts` - хук управления

### 2. Обновляемые файлы:
- `app/dashboard/page.tsx` - добавить UserSubscriptions
- `components/DashboardPageClient.tsx` - добавить быстрые действия
- `lib/services/websocket.ts` - JWT интеграция
- `components/ProfileMenu.tsx` - добавить навигацию

### 3. База данных:
- Миграция для добавления `hiddenCreators` в user_settings
- Индексы на subscriptions для производительности
- Триггер для автообновления validUntil

## 🧪 ПЛАН ТЕСТИРОВАНИЯ

### 1. Unit тесты:
- JWT генерация и валидация
- Проверка доступа к контенту
- Логика управления подписками

### 2. Integration тесты:
- WebSocket события end-to-end
- API endpoints с различными тирами
- Платежная система с подписками

### 3. E2E тесты (Playwright):
- Создание подписки и проверка доступа
- Управление видимостью креаторов
- Real-time обновление UI
- Апгрейд/даунгрейд тиров

## 📊 МЕТРИКИ УСПЕХА

1. **Доступ к контенту**: 100% корректность проверки тиров
2. **Real-time обновления**: < 500ms латентность
3. **UI отзывчивость**: < 100ms для всех действий
4. **Покрытие тестами**: > 95%
5. **Восстановленный функционал**: 100% найденных features

## ⚠️ РИСКИ И МИТИГАЦИЯ

### Риск 1: Нарушение существующих подписок
- **Митигация**: Бэкап БД перед изменениями
- **Rollback план**: SQL скрипты отката

### Риск 2: WebSocket нестабильность
- **Митигация**: Fallback на polling
- **Мониторинг**: Логирование всех событий

### Риск 3: Производительность с большим количеством подписок
- **Митигация**: Пагинация и виртуализация
- **Кэширование**: Redis для частых запросов

## 🚀 ПОСЛЕДОВАТЕЛЬНОСТЬ ВЫПОЛНЕНИЯ

1. **День 1**: Фаза 1 (исправление доступа)
2. **День 2**: Фаза 2 (восстановление UI)
3. **День 3-4**: Фаза 3 (поиск функционала)
4. **День 5-6**: Фаза 4 (enterprise улучшения)
5. **День 7**: Тестирование и документация

## ✅ ЧЕКЛИСТ ГОТОВНОСТИ

- [ ] План линейный и последовательный
- [ ] Все зависимости учтены
- [ ] Риски имеют митигацию
- [ ] Метрики измеримы
- [ ] Тесты покрывают все сценарии 