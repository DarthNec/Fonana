# Исправление проблемы с видео в постах

## Описание проблемы
Видео файлы загружаются на сервер, но ссылки на них не работают (404 ошибка).

## Причина
Nginx не был настроен для обслуживания статических файлов из директории `/posts/`. Все запросы проксировались на Next.js сервер, который не обслуживает эти файлы.

## Решение

### 1. Обновить nginx конфигурацию на сервере

Подключитесь к серверу:
```bash
ssh -p 43988 root@69.10.59.234
```

### 2. Отредактируйте nginx конфигурацию

```bash
nano /etc/nginx/sites-available/fonana
```

Добавьте следующие location блоки после блока с security headers:

```nginx
# Serve posts (images, videos, audio) directly from filesystem
location /posts/ {
    alias /var/www/fonana/public/posts/;
    expires 30d;
    add_header Cache-Control "public, immutable";
    
    # Enable CORS for media files
    add_header Access-Control-Allow-Origin "*";
    add_header Access-Control-Allow-Methods "GET, OPTIONS";
    
    # Specific handling for video files
    location ~ \.mp4$ {
        mp4;
        mp4_buffer_size     1m;
        mp4_max_buffer_size 5m;
    }
    
    # Ensure proper MIME types
    location ~ \.(mp4|webm|ogg)$ {
        add_header Content-Type video/mp4;
    }
}

# Serve avatars directly from filesystem
location /avatars/ {
    alias /var/www/fonana/public/avatars/;
    expires 7d;
    add_header Cache-Control "public";
}

# Serve backgrounds directly from filesystem
location /backgrounds/ {
    alias /var/www/fonana/public/backgrounds/;
    expires 7d;
    add_header Cache-Control "public";
}
```

Также увеличьте лимит размера файлов:
```nginx
client_max_body_size 100M;
```

### 3. Проверьте конфигурацию nginx

```bash
nginx -t
```

### 4. Перезагрузите nginx

```bash
systemctl reload nginx
```

### 5. Проверьте директории

Убедитесь, что директории существуют:
```bash
ls -la /var/www/fonana/public/posts/
ls -la /var/www/fonana/public/posts/videos/
```

Если директория videos не существует, создайте её:
```bash
mkdir -p /var/www/fonana/public/posts/videos
chmod 755 /var/www/fonana/public/posts/videos
```

### 6. Проверьте права доступа

```bash
# Убедитесь, что www-data имеет доступ к файлам
chown -R www-data:www-data /var/www/fonana/public/posts/
```

## Проверка

1. Попробуйте загрузить новое видео через интерфейс
2. Проверьте, что видео отображается в посте
3. Проверьте прямую ссылку на видео: `https://fonana.me/posts/videos/[filename]`

## Дополнительные улучшения

Конфигурация также включает:
- Поддержку mp4 streaming (для перемотки видео)
- CORS headers для кросс-доменных запросов
- Правильные MIME types для видео файлов
- Кеширование на 30 дней для медиа файлов 