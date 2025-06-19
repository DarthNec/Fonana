# Исправление проблемы с thumbnail для видео постов

## Описание проблемы
Пользователь @dogwater попытался обновить свой пост, загрузив видео снова, но ничего не произошло. В feed видео все еще было битое.

## Причины

1. **EditPostModal не устанавливал правильный thumbnail для видео**
   - При загрузке видео thumbnail устанавливался на URL самого видео файла
   - Это приводило к битым превью в feed

2. **API не обновлял поле type**
   - При обновлении поста тип контента (video/image/text) не передавался

## Решение

### 1. Исправлен EditPostModal
```typescript
// Правильно устанавливаем thumbnail для разных типов медиа
if (mediaFile.type.startsWith('video/')) {
  thumbnail = '/placeholder-video.png'
} else if (mediaFile.type.startsWith('audio/')) {
  thumbnail = '/placeholder-audio.png'
} else {
  // Для изображений используем оптимизированную версию
  thumbnail = uploadData.thumbUrl || uploadData.url
}
```

### 2. Добавлено определение типа контента
```typescript
// Определяем тип контента
let contentType = post.type || 'text'
if (mediaFile) {
  if (mediaFile.type.startsWith('video/')) {
    contentType = 'video'
  } else if (mediaFile.type.startsWith('audio/')) {
    contentType = 'audio'
  } else if (mediaFile.type.startsWith('image/')) {
    contentType = 'image'
  }
}
```

### 3. Обновлен API
- Добавлена обработка поля `type` в PUT endpoint

### 4. Исправлены существующие посты
Запущен скрипт, который исправил 2 поста:
- "MVP = Mostly Valuable Prototype" от @fonanadev
- "My lifestyle" от @dogwater

## Результат
✅ Теперь при обновлении видео поста:
- Правильно устанавливается placeholder thumbnail
- Сохраняется тип контента
- Видео корректно отображается в feed

## Проверка
1. Откройте пост с видео
2. Нажмите "Edit"
3. Загрузите новое видео
4. Сохраните изменения
5. Видео должно корректно отображаться с placeholder превью 