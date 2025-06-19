# Исправление загрузки аватаров и фонов - 19 июня 2025

## Проблема
Пользователи не могли загрузить ни аватар, ни фоновое изображение в профиле.

## Причина
1. **Неправильные пути в production**: API endpoints использовали `process.cwd()`, который в production указывал на неправильную директорию
2. **Проблема с правами доступа**: PM2 запущен от пользователя `root`, а директории принадлежали `www-data`

## Решение

### 1. Исправлены пути в API endpoints

#### `/app/api/upload/avatar/route.ts`:
```typescript
// Было:
const uploadDir = path.join(process.cwd(), 'public', 'avatars')

// Стало:
let uploadDir: string
if (process.env.NODE_ENV === 'production') {
  uploadDir = '/var/www/fonana/public/avatars'
} else {
  uploadDir = path.join(process.cwd(), 'public', 'avatars')
}
```

#### `/app/api/upload/background/route.ts`:
Аналогичные изменения для фоновых изображений.

### 2. Исправлены права доступа

Изменен владелец директорий на `root` (пользователь PM2):
```bash
chown -R root:root /var/www/fonana/public/avatars
chown -R root:root /var/www/fonana/public/backgrounds
chown -R root:root /var/www/fonana/public/posts
chmod -R 755 /var/www/fonana/public/avatars
chmod -R 755 /var/www/fonana/public/backgrounds
chmod -R 755 /var/www/fonana/public/posts
```

## Проверка
- Директории существуют и имеют правильные права
- Nginx правильно настроен для обслуживания статических файлов
- API endpoints используют правильные пути для production

## Статус
✅ Проблема исправлена и развернута в production
✅ Пользователи могут загружать аватары и фоны 