# Sora Checker - Автоматическая обработка AI видео

## 📋 Описание

`sorachecker.js` - автоматический скрипт для обработки AI-генерированных видео через Sora-2 API.

### Что делает скрипт:

1. **Находит** все посты с `type: 'ai-video'` и `mediaUrl: null`
2. **Проверяет** статус генерации в OpenAI Sora API
3. **Скачивает** готовое видео
4. **Накладывает** водяной знак "fonana.me"
5. **Загружает** на Bunny CDN
6. **Обновляет** пост с финальным URL
7. **Удаляет** видео из OpenAI

## 🚀 Установка

### 1. Установите зависимости

```bash
npm install axios
```

### 2. Установите FFmpeg (для водяного знака)

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg -y
```

**Windows:**
```bash
winget install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

### 3. Настройте переменные окружения

Добавьте в `.env`:
```env
OPENAI_API_KEY=your_openai_api_key
BUNNY_STORAGE_API_KEY=your_bunny_storage_key
```

## 📦 PM2 Конфигурация

Скрипт уже добавлен в `ecosystem.config.js` и будет запускаться **каждые 5 минут**.

### Команды PM2:

**Запустить все сервисы:**
```bash
pm2 start ecosystem.config.js
```

**Запустить только Sora Checker:**
```bash
pm2 start ecosystem.config.js --only sora-checker
```

**Посмотреть статус:**
```bash
pm2 status
```

**Посмотреть логи:**
```bash
pm2 logs sora-checker
```

**Остановить:**
```bash
pm2 stop sora-checker
```

**Рестарт:**
```bash
pm2 restart sora-checker
```

**Удалить из PM2:**
```bash
pm2 delete sora-checker
```

## 🔧 Ручной запуск

Для тестирования можно запустить вручную:

```bash
node sorachecker.js
```

## 📊 Процесс обработки

### Статусы видео в OpenAI:

- `pending` - Генерация в очереди
- `processing` - Генерация идёт
- `completed` - Видео готово ✅
- `failed` - Ошибка ❌

### Обработка ошибок:

Если видео не сгенерировалось (`status: 'failed'`):
- **Пост полностью удаляется** из базы данных
- Видео удаляется из OpenAI
- Причина ошибки логируется (например: `moderation_blocked`)

### Успешная обработка:

1. Видео скачивается во временную папку `temp_sora_videos/`
2. FFmpeg накладывает водяной знак (правый нижний угол)
3. Видео загружается в `posts/videos/sora/{requestId}.mp4` на Bunny
4. Пост обновляется:
   - `mediaUrl: "https://fonanastorage.b-cdn.net/posts/videos/sora/{requestId}.mp4"`
   - `type: "video"` (меняется с `ai-video`)
5. Видео удаляется из OpenAI
6. Временные файлы очищаются

## 📁 Структура файлов

```
Fonana/
├── sorachecker.js              # Основной скрипт
├── ecosystem.config.js         # PM2 конфигурация
├── temp_sora_videos/           # Временные файлы (создаётся автоматически)
│   ├── {requestId}_original.mp4
│   └── {requestId}_watermarked.mp4
└── logs/
    ├── sora-checker-out.log    # Обычные логи
    └── sora-checker-error.log  # Ошибки
```

## 🎨 Водяной знак

Параметры наложения:
- **Изображение**: `75x75-15perc.png` (размер: 75x75px)
- **Прозрачность**: 15% (встроена в изображение)
- **Анимация**: Движется по диагонали от левого верхнего к правому нижнему углу
- **Длительность**: Весь ролик (от начала до конца)
- **Формула движения**: 
  - X: `t/duration * (W-w)` (от 0 до ширины видео минус ширина лого)
  - Y: `t/duration * (H-h)` (от 0 до высоты видео минус высота лого)

### Требования:
- FFmpeg должен быть установлен
- Файл `75x75-15perc.png` должен находиться в корне проекта
- Если FFmpeg недоступен или файл не найден → видео загружается **без водяного знака**

## 🔍 Мониторинг

### Просмотр логов в реальном времени:

```bash
pm2 logs sora-checker --lines 100
```

### Метрики PM2:

```bash
pm2 monit
```

## ⚙️ Настройка интервала проверки

По умолчанию: **каждые 5 минут**

Изменить в `ecosystem.config.js`:
```javascript
cron_restart: '*/5 * * * *'  // Каждые 5 минут
cron_restart: '*/10 * * * *' // Каждые 10 минут
cron_restart: '0 * * * *'    // Каждый час
cron_restart: '0 */2 * * *'  // Каждые 2 часа
```

После изменения:
```bash
pm2 restart ecosystem.config.js
```

## 🐛 Отладка

### Проверка без PM2:

```bash
node sorachecker.js
```

### Проверка переменных окружения:

```bash
node -e "console.log(process.env.OPENAI_API_KEY)"
node -e "console.log(process.env.BUNNY_STORAGE_API_KEY)"
```

### Проверка FFmpeg:

```bash
ffmpeg -version
```

## 📝 Логи

### Пример успешной обработки:
```
[SoraChecker] Starting Sora video checker...
[SoraChecker] Found 2 pending AI video posts
[SoraChecker] Processing post abc123 (requestId: resp_xxx)
[SoraChecker] Video resp_xxx status: completed
[SoraChecker] Downloading video resp_xxx...
[SoraChecker] Adding watermark to video resp_xxx...
[SoraChecker] Uploading video resp_xxx to Bunny Storage...
[SoraChecker] Updating post abc123 with video URL...
[SoraChecker] Deleting video resp_xxx from OpenAI...
[SoraChecker] ✅ Post abc123 processed successfully!
[SoraChecker] Total: 2 | Success: 2 | Failed: 0
```

### Пример обработки с ошибкой:
```
[SoraChecker] Processing post def456 (requestId: resp_yyy)
[SoraChecker] Video resp_yyy has error: {
  code: 'moderation_blocked',
  message: 'Your request was blocked by our moderation system.'
}
[SoraChecker] Deleting failed post def456 from database...
[SoraChecker] Post def456 deleted from database
[SoraChecker] Deleting video resp_yyy from OpenAI...
[SoraChecker] Video resp_yyy deleted from OpenAI
```

## 🚨 Важно

- **Не удаляйте** папку `temp_sora_videos` вручную во время работы скрипта
- **Проверьте** наличие свободного места на диске (видео могут быть большими)
- **API ключи** должны быть в `.env` файле
- **Bunny Storage Zone** должен быть `fonanastorage`

## 📞 Поддержка

При проблемах проверьте:
1. Логи: `pm2 logs sora-checker`
2. Статус: `pm2 status`
3. Переменные окружения в `.env`
4. Наличие FFmpeg: `ffmpeg -version`
5. Права доступа к папке `temp_sora_videos/`

---

**Готово к запуску! 🚀**

