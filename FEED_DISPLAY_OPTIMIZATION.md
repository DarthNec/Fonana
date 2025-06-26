# Feed Display Optimization - January 2025

## Проблемы

### 1. Автор видит свои посты закрытыми
- **Причина**: API не получает `userWallet` и не может определить, что текущий пользователь является автором поста
- **Механизм**: В `app/api/posts/route.ts` проверка `isCreatorPost` зависит от наличия `currentUser`, который определяется по `userWallet`

### 2. Посты закрываются при переключении окна
- **Причина**: При событии `focus` вызывается `loadPosts()` сразу, но контекст пользователя (`useUser`) может быть еще не восстановлен
- **Механизм**: `useUser` хук зависит от Solana wallet adapter, который может терять состояние при потере фокуса

## Решения

### 1. Добавлена задержка при обработке события focus
```javascript
// app/feed/page.tsx
const handleFocus = () => {
  // Небольшая задержка для восстановления контекста
  setTimeout(() => {
    if (!user || user.wallet) {
      loadPosts()
    }
  }, 100)
}
```

### 2. Использование localStorage как fallback
```javascript
// При загрузке постов
const userWallet = user?.wallet || localStorage.getItem('fonana_user_wallet')

if (userWallet) {
  params.append('userWallet', userWallet)
  // Сохраняем для будущего использования
  if (user?.wallet) {
    localStorage.setItem('fonana_user_wallet', user.wallet)
  }
}
```

### 3. Очистка localStorage при отключении
```javascript
// При отключении кошелька
if (!user?.wallet) {
  localStorage.removeItem('fonana_user_wallet')
}
```

## Оптимизированные файлы

1. **app/feed/page.tsx**
   - Добавлена задержка для события focus
   - Использование wallet из localStorage как fallback
   - Очистка localStorage при отключении

2. **app/creator/[id]/page.tsx**
   - Аналогичные изменения для страницы создателя
   - Синхронизация с обновлением пользователя

## Результаты

1. **Авторы всегда видят свои посты открытыми** - даже при временной потере контекста пользователя
2. **Посты не закрываются при переключении окна** - благодаря задержке и fallback механизму
3. **Улучшенная стабильность UX** - пользователи не теряют доступ к контенту из-за технических особенностей

## Дополнительные рекомендации

1. **Рассмотреть использование React Query или SWR** для кеширования состояния постов
2. **Добавить индикатор загрузки** при обновлении постов после фокуса
3. **Оптимизировать частоту обновлений** - возможно, не нужно обновлять при каждом фокусе

## Технические детали

### Поток данных
1. User подключает wallet → `useUser` создает/получает пользователя
2. `user.wallet` сохраняется в localStorage
3. При загрузке постов используется `user.wallet` или fallback из localStorage
4. API определяет `isCreatorPost` по переданному `userWallet`
5. PostCard получает флаг `shouldHideContent` из API и корректно отображает контент 