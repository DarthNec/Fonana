# Search Feature Implementation

## Overview
Имплементирована полнофункциональная система поиска с автокомплитом и фильтрами для платформы Fonana.

## Implemented Features

### 1. API Endpoints

#### `/api/search` - Основной поиск
- **Query Parameters:**
  - `q` - поисковый запрос (минимум 2 символа)
  - `type` - тип поиска: `all` | `creators` | `posts`
  - `category` - фильтр по категории
  - `minPrice` / `maxPrice` - диапазон цен в SOL
  - `contentType` - тип контента: `image` | `video` | `audio`
  - `tier` - уровень подписки: `basic` | `premium` | `vip`
  - `limit` / `offset` - пагинация

#### `/api/search/autocomplete` - Автокомплит
- **Query Parameters:**
  - `q` - поисковый запрос (минимум 1 символ)
  - `type` - тип поиска: `all` | `creators` | `posts`

### 2. SearchBar Component
Универсальный компонент поиска с поддержкой:
- ✅ Автокомплит с debounce (300ms)
- ✅ Фильтры (опционально)
- ✅ Поиск по Enter или клику
- ✅ Очистка поля
- ✅ Навигация к результатам

### 3. Search Page
Отдельная страница `/search` для отображения результатов

### 4. Integration Points
- Navbar (десктоп и мобильная версии)
- Feed Page
- Creators Explorer

## Search Capabilities

### Поиск создателей
- По nickname (username)
- По fullName (полное имя)
- По bio (описание)

### Поиск постов
- По title (заголовку)
- По content (содержанию)

### Фильтры
1. **Категории**: Art, Music, Gaming, Lifestyle, Fitness, Tech, DeFi, NFT, Trading, GameFi, Blockchain, Intimate, Education, Comedy
2. **Тип контента**: Фото, Видео, Аудио
3. **Уровень подписки**: Basic, Premium, VIP
4. **Диапазон цен**: От и До (в SOL)

## Testing
```bash
node scripts/test-search.js
```

## Deployment
```bash
./deploy-to-production.sh
```
