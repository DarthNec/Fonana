# 🔍 DISCOVERY REPORT: Upload 413 Error

## 🚨 Симптомы:
1. **413 Request Entity Too Large** при загрузке изображений
2. Ошибка после кропа изображения
3. Сервер возвращает HTML вместо JSON (error page)

## 🎯 Вероятные причины:
1. Nginx client_max_body_size слишком маленький
2. Next.js body size limit
3. Изображение после кропа больше чем оригинал (base64 encoding)

## 📊 Данные из логов:
- Endpoint: /api/posts/upload
- Error: 413 Request Entity Too Large
- Response: HTML страница ошибки

