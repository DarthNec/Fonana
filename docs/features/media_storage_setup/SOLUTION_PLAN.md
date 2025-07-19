# 📋 SOLUTION PLAN: Media Storage Setup v1

## 📅 Дата: 18.01.2025
## 🎯 Задача: Настройка локального медиа-хранилища с placeholder изображениями

## 🎯 ЦЕЛИ РЕШЕНИЯ

1. **Немедленная цель**: Устранить все 404 ошибки для медиа-файлов
2. **Краткосрочная цель**: Создать работающее локальное хранилище
3. **Долгосрочная цель**: Подготовить систему для будущей миграции с Supabase

## 📐 АРХИТЕКТУРА РЕШЕНИЯ

### Структура папок
```
public/
└── media/
    ├── avatars/        # Аватары пользователей
    ├── backgrounds/    # Фоновые изображения профилей
    ├── posts/          # Основные медиа-файлы постов
    ├── thumbposts/     # Превью постов
    └── temp/           # Временные файлы для обработки
```

### Стратегия заполнения
1. **Аватары**: Скачать с Unsplash API портретные фото
2. **Фоны**: Скачать landscape изображения для фонов
3. **Посты**: Разнообразный контент по категориям
4. **Превью**: Автоматически генерировать из основных изображений

## 📝 ДЕТАЛЬНЫЙ ПЛАН

### Этап 1: Создание структуры папок (5 минут)
```bash
mkdir -p public/media/{avatars,backgrounds,posts,thumbposts,temp}
```

### Этап 2: Скрипт для загрузки изображений (30 минут)
```python
# scripts/download_media_placeholders.py
import requests
import os
from typing import List, Dict

class MediaDownloader:
    def __init__(self):
        self.unsplash_url = "https://source.unsplash.com"
        self.picsum_url = "https://picsum.photos"
        
    def download_avatars(self, count: int = 60):
        """Загрузка портретных фото для аватаров"""
        for i in range(count):
            url = f"{self.unsplash_url}/400x400/?portrait"
            self._download_image(url, f"public/media/avatars/avatar_{i}.jpg")
            
    def download_backgrounds(self, count: int = 60):
        """Загрузка пейзажных фото для фонов"""
        for i in range(count):
            url = f"{self.unsplash_url}/1200x400/?landscape,nature"
            self._download_image(url, f"public/media/backgrounds/bg_{i}.jpg")
            
    def download_posts(self, categories: Dict[str, int]):
        """Загрузка изображений по категориям"""
        for category, count in categories.items():
            for i in range(count):
                url = f"{self.unsplash_url}/800x600/?{category}"
                filename = f"public/media/posts/{category}_{i}.jpg"
                self._download_image(url, filename)
                # Создаем превью
                self._create_thumbnail(filename)
```

### Этап 3: Обновление путей в БД (20 минут)
```sql
-- scripts/update_media_paths.sql

-- Обновление аватаров пользователей
UPDATE users 
SET avatar = CONCAT('/media/avatars/avatar_', 
    MOD(CAST(SUBSTRING(id, 1, 8) AS INTEGER), 60), '.jpg')
WHERE avatar IS NOT NULL;

-- Обновление медиа постов
UPDATE posts 
SET 
    thumbnail = CONCAT('/media/thumbposts/thumb_', 
        MD5(id), '.jpg'),
    "mediaUrl" = CONCAT('/media/posts/', 
        LOWER(category), '_', 
        MOD(CAST(SUBSTRING(id, 1, 8) AS INTEGER), 20), '.jpg')
WHERE thumbnail IS NOT NULL OR "mediaUrl" IS NOT NULL;
```

### Этап 4: Добавление backgroundImage в схему (15 минут)
```typescript
// prisma/schema.prisma
model User {
  // ... existing fields
  backgroundImage String? @db.VarChar(255)
}
```

```sql
-- Миграция
ALTER TABLE users ADD COLUMN "backgroundImage" VARCHAR(255);

-- Заполнение данных
UPDATE users 
SET "backgroundImage" = CONCAT('/media/backgrounds/bg_', 
    MOD(CAST(SUBSTRING(id, 1, 8) AS INTEGER), 60), '.jpg')
WHERE "isCreator" = true;
```

### Этап 5: Создание fallback компонента (10 минут)
```typescript
// components/MediaWithFallback.tsx
export function MediaWithFallback({ 
  src, 
  fallback = "/placeholder.jpg",
  alt,
  className 
}: Props) {
  const [error, setError] = useState(false);
  
  return (
    <img 
      src={error ? fallback : src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
}
```

### Этап 6: Оптимизация загрузки (10 минут)
```typescript
// lib/utils/imageOptimizer.ts
export function getOptimizedImageUrl(
  originalUrl: string, 
  width?: number,
  quality?: number
): string {
  // Проверка локальности файла
  if (originalUrl.startsWith('/media/')) {
    return originalUrl; // Локальные файлы
  }
  
  // Fallback для внешних URL
  if (originalUrl.includes('supabase')) {
    return '/placeholder.jpg';
  }
  
  return originalUrl;
}
```

## ⏱️ ВРЕМЕННЫЕ ОЦЕНКИ

| Этап | Время | Приоритет |
|------|-------|-----------|
| Создание папок | 5 мин | 🔴 Критический |
| Загрузка изображений | 30 мин | 🔴 Критический |
| Обновление БД | 20 мин | 🔴 Критический |
| Добавление backgroundImage | 15 мин | 🟡 Важный |
| Fallback компонент | 10 мин | 🟡 Важный |
| Оптимизация | 10 мин | 🟢 Желательный |
| **ИТОГО** | **90 минут** | |

## 🔄 АЛЬТЕРНАТИВНЫЕ ПОДХОДЫ

### Вариант A: Минимальный (текущий план)
- Простые placeholder изображения
- Быстрая реализация
- Не требует внешних сервисов

### Вариант B: С CDN
- Использовать Cloudinary для оптимизации
- Автоматическая генерация превью
- Требует регистрации и настройки

### Вариант C: Восстановление из Supabase
- Попытка получить оригиналы
- Требует доступа к Supabase
- Может занять больше времени

## ✅ КРИТЕРИИ УСПЕХА

- [ ] Все 404 ошибки медиа устранены
- [ ] Страница /feed показывает изображения
- [ ] Страница /creators имеет аватары и фоны
- [ ] Производительность не ухудшилась
- [ ] Система готова к будущей миграции

## 🚀 СЛЕДУЮЩИЕ ШАГИ

1. Получить одобрение плана
2. Создать IMPACT_ANALYSIS.md
3. Начать реализацию по этапам
4. Тестировать после каждого этапа 