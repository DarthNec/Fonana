# Отчет об исправлении статических файлов в Nginx

## Проблема
После создания поста изображения возвращали 404 ошибку, хотя файлы физически существовали на сервере.

## Анализ проблемы

### 1. Симптомы
- Посты создавались успешно
- Файлы загружались на сервер в `/var/www/fonana/public/posts/images/`
- При попытке доступа к файлам возвращалась 404 ошибка
- В заголовках ответа был виден `X-Powered-By: Next.js`, что означало обработку через приложение

### 2. Найденные причины

#### Причина 1: Конфликт правил в nginx
В основной конфигурации было два конфликтующих правила:
```nginx
# Правило 1 - должно обслуживать /posts/ напрямую
location /posts/ {
    alias /var/www/fonana/public/posts/;
}

# Правило 2 - перехватывало ВСЕ изображения
location ~* \.(jpg|jpeg|png|gif|...)$ {
    proxy_pass http://localhost:3000;
}
```

Регулярное выражение имеет более высокий приоритет, поэтому все изображения шли через Next.js.

#### Причина 2: Множественные конфигурации nginx
Были найдены несколько конфигураций:
- `/etc/nginx/sites-enabled/fonana` - основная конфигурация (HTTP, порт 80)
- `/etc/nginx/sites-enabled/fonana-me` - HTTPS конфигурация для fonana.me

Конфигурация `fonana-me` обрабатывала HTTPS запросы, но НЕ имела правил для `/posts/`.

## Внесенные исправления

### 1. Обновление основной конфигурации
- Удалено конфликтующее правило для всех изображений
- Обновлен `server_name` на `fonana.me`

### 2. Обновление HTTPS конфигурации
Добавлены правила для статических файлов:
```nginx
# Serve posts directly from filesystem
location /posts/ {
    alias /var/www/fonana/public/posts/;
    expires 30d;
    add_header Cache-Control "public, immutable";
    add_header Access-Control-Allow-Origin "*";
}

# Serve avatars directly
location /avatars/ {
    alias /var/www/fonana/public/avatars/;
    expires 7d;
    add_header Cache-Control "public";
}

# Serve backgrounds directly
location /backgrounds/ {
    alias /var/www/fonana/public/backgrounds/;
    expires 7d;
    add_header Cache-Control "public";
}
```

## Результат
- ✅ Изображения теперь обслуживаются напрямую через nginx
- ✅ Улучшена производительность (нет проксирования через Next.js)
- ✅ Правильные заголовки кеширования (30 дней для постов)
- ✅ CORS заголовки для кросс-доменных запросов

## Тестирование
```bash
# Проверка основного изображения
curl -I https://fonana.me/posts/images/18db3fc60c9610d92d6c04c1ecd71e3d.JPG
# HTTP/1.1 200 OK

# Проверка превью
curl -I https://fonana.me/posts/images/thumb_18db3fc60c9610d92d6c04c1ecd71e3d.webp
# HTTP/1.1 200 OK
```

## Рекомендации
1. Удалить дублирующиеся nginx конфигурации
2. Использовать только одну конфигурацию для домена
3. Регулярно проверять nginx конфигурации на конфликты 