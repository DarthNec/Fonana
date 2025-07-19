# 🎮 IMPLEMENTATION SIMULATION: Media Storage Setup v1

## 📅 Дата: 18.01.2025
## 🎯 Задача: Симуляция полного процесса настройки медиа-хранилища

## 🔄 СИМУЛЯЦИЯ ПРОЦЕССА

### Этап 1: Подготовка и Backup (10 минут)

```bash
# 1. Проверка свободного места
df -h .
# Ожидаемый результат: минимум 1GB свободно

# 2. Создание backup БД
pg_dump -U fonana_user -h localhost -d fonana > backup_media_$(date +%Y%m%d_%H%M%S).sql
# Результат: файл ~50MB

# 3. Backup таблиц в БД
psql -U fonana_user -h localhost -d fonana << EOF
CREATE TABLE users_backup_media AS SELECT * FROM users;
CREATE TABLE posts_backup_media AS SELECT * FROM posts;
EOF
# Результат: 2 новые таблицы созданы
```

### Этап 2: Создание структуры папок (5 минут)

```bash
# Создание папок
mkdir -p public/media/{avatars,backgrounds,posts,thumbposts,temp}

# Проверка прав
ls -la public/media/
# Ожидаемый результат: drwxr-xr-x для всех папок

# Копирование существующих файлов
find public -name "avatar_*.jpeg" -o -name "avatar_*.png" | xargs -I {} cp {} public/media/avatars/
# Результат: ~10 файлов скопировано
```

### Этап 3: Скрипт загрузки изображений (40 минут)

```python
# scripts/download_media_placeholders.py
import requests
import os
import time
from PIL import Image
import hashlib

class MediaDownloader:
    def __init__(self):
        self.session = requests.Session()
        self.downloaded = 0
        
    def download_image(self, url: str, filepath: str) -> bool:
        """Загрузка с retry логикой"""
        for attempt in range(3):
            try:
                response = self.session.get(url, timeout=30)
                if response.status_code == 200:
                    with open(filepath, 'wb') as f:
                        f.write(response.content)
                    self.downloaded += 1
                    print(f"✅ Downloaded: {filepath} ({self.downloaded} total)")
                    return True
            except Exception as e:
                print(f"❌ Attempt {attempt + 1} failed: {e}")
                time.sleep(2)
        return False
        
    def create_thumbnail(self, source: str, thumb_path: str):
        """Создание превью"""
        try:
            img = Image.open(source)
            img.thumbnail((400, 300), Image.Resampling.LANCZOS)
            img.save(thumb_path, quality=85)
            print(f"✅ Thumbnail created: {thumb_path}")
        except Exception as e:
            print(f"❌ Thumbnail failed: {e}")

# Симуляция выполнения
downloader = MediaDownloader()

# Аватары (60 штук, ~24MB)
for i in range(60):
    url = f"https://picsum.photos/400/400?random={i}"
    filepath = f"public/media/avatars/avatar_{i}.jpg"
    downloader.download_image(url, filepath)
    time.sleep(0.5)  # Rate limiting

# Фоны (60 штук, ~72MB) 
for i in range(60):
    url = f"https://picsum.photos/1200/400?random={i+100}"
    filepath = f"public/media/backgrounds/bg_{i}.jpg"
    downloader.download_image(url, filepath)
    time.sleep(0.5)

# Посты по категориям (300 штук, ~240MB)
categories = {
    'art': 50, 'tech': 40, 'lifestyle': 40, 'trading': 30,
    'intimate': 30, 'gaming': 30, 'music': 30, 'education': 25,
    'comedy': 25
}

for category, count in categories.items():
    for i in range(count):
        url = f"https://picsum.photos/800/600?random={category}{i}"
        filepath = f"public/media/posts/{category}_{i}.jpg"
        thumb_path = f"public/media/thumbposts/thumb_{category}_{i}.jpg"
        
        if downloader.download_image(url, filepath):
            downloader.create_thumbnail(filepath, thumb_path)
        time.sleep(0.5)

print(f"\n📊 Итого загружено: {downloader.downloaded} файлов")
# Ожидаемый результат: 420 файлов, ~336MB
```

### Этап 4: Обновление БД (15 минут)

```sql
-- scripts/update_media_paths.sql

-- 1. Обновление аватаров (32 записи)
UPDATE users 
SET avatar = '/media/avatars/avatar_' || 
    (ascii(substring(id::text, 1, 1)) % 60)::text || '.jpg'
WHERE avatar IS NOT NULL AND avatar != '';

-- Проверка
SELECT id, nickname, avatar FROM users WHERE avatar IS NOT NULL LIMIT 5;
-- Результат: пути вида /media/avatars/avatar_N.jpg

-- 2. Добавление backgroundImage
ALTER TABLE users ADD COLUMN IF NOT EXISTS "backgroundImage" VARCHAR(255);

-- Заполнение для креаторов
UPDATE users 
SET "backgroundImage" = '/media/backgrounds/bg_' || 
    (ascii(substring(id::text, 1, 1)) % 60)::text || '.jpg'
WHERE "isCreator" = true;

-- Проверка
SELECT COUNT(*) FROM users WHERE "backgroundImage" IS NOT NULL;
-- Результат: 52 записи

-- 3. Обновление медиа постов (242 записи)
UPDATE posts p
SET 
    thumbnail = '/media/thumbposts/thumb_' || 
        LOWER(p.category) || '_' || 
        (ascii(substring(p.id::text, 1, 1)) % 
        CASE 
            WHEN category = 'Art' THEN 50
            WHEN category = 'Tech' THEN 40
            WHEN category = 'Lifestyle' THEN 40
            WHEN category = 'Trading' THEN 30
            ELSE 25
        END)::text || '.jpg',
    "mediaUrl" = '/media/posts/' || 
        LOWER(p.category) || '_' || 
        (ascii(substring(p.id::text, 1, 1)) % 
        CASE 
            WHEN category = 'Art' THEN 50
            WHEN category = 'Tech' THEN 40
            WHEN category = 'Lifestyle' THEN 40
            WHEN category = 'Trading' THEN 30
            ELSE 25
        END)::text || '.jpg'
WHERE thumbnail IS NOT NULL OR "mediaUrl" IS NOT NULL;

-- Проверка
SELECT category, COUNT(*) FROM posts 
WHERE thumbnail LIKE '/media/%' 
GROUP BY category;
-- Результат: все 242 записи обновлены
```

### Этап 5: Обновление Prisma схемы (10 минут)

```bash
# 1. Обновление schema.prisma
cat >> prisma/schema.prisma << 'EOF'

// Добавлено в модель User
// backgroundImage String? @db.VarChar(255)
EOF

# 2. Генерация миграции
npx prisma migrate dev --name add_background_image
# Результат: миграция создана и применена

# 3. Генерация клиента
npx prisma generate
# Результат: TypeScript типы обновлены
```

### Этап 6: Проверка через Playwright (10 минут)

```javascript
// Playwright MCP проверка
// 1. Навигация на /feed
await browser_navigate({ url: "http://localhost:3000/feed" });

// 2. Ожидание загрузки
await browser_wait_for({ time: 3 });

// 3. Проверка network requests
const requests = await browser_network_requests();
const errors404 = requests.filter(r => r.status === 404);
console.log(`404 errors: ${errors404.length}`);
// Ожидаемый результат: 0 ошибок

// 4. Скриншот для визуальной проверки
await browser_take_screenshot({ filename: "feed-after-media-setup.png" });

// 5. Проверка /creators
await browser_navigate({ url: "http://localhost:3000/creators" });
await browser_wait_for({ time: 2 });
await browser_take_screenshot({ filename: "creators-after-media-setup.png" });
```

## 🔍 EDGE CASES И ПРОБЛЕМЫ

### Edge Case 1: Недоступность внешних API
```python
# Fallback на локальные placeholders
if not response.ok:
    shutil.copy('public/placeholder.jpg', filepath)
    print(f"⚠️ Using placeholder for: {filepath}")
```

### Edge Case 2: Дублирование при хешировании
```sql
-- Проблема: несколько постов могут получить одно изображение
-- Решение: использование позиции в категории
WITH numbered_posts AS (
    SELECT id, category, 
           ROW_NUMBER() OVER (PARTITION BY category ORDER BY "createdAt") as pos
    FROM posts
)
UPDATE posts p
SET thumbnail = '/media/thumbposts/thumb_' || LOWER(p.category) || '_' || 
    ((np.pos - 1) % category_count)::text || '.jpg'
FROM numbered_posts np
WHERE p.id = np.id;
```

### Edge Case 3: Race Condition при параллельной загрузке
```python
# Использование threading с ограничением
from concurrent.futures import ThreadPoolExecutor, as_completed

with ThreadPoolExecutor(max_workers=5) as executor:
    futures = []
    for url, path in download_queue:
        future = executor.submit(download_image, url, path)
        futures.append(future)
    
    for future in as_completed(futures):
        result = future.result()
```

## 📊 МЕТРИКИ СИМУЛЯЦИИ

| Метрика | Значение |
|---------|----------|
| Общее время выполнения | ~90 минут |
| Загружено файлов | 420 |
| Общий размер | ~336MB |
| Обновлено записей в БД | 326 |
| HTTP запросов | 420 |
| Ошибок | 0-5 (retry помогает) |

## ⚠️ BOTTLENECKS

1. **Скорость загрузки**: ~1 файл/сек с rate limiting
2. **Размер изображений**: Нужна оптимизация после загрузки
3. **БД операции**: UPDATE на 242 записи может быть медленным

## ✅ КОНТРОЛЬНЫЕ ТОЧКИ

- [ ] Backup создан и проверен
- [ ] Структура папок создана
- [ ] 50% изображений загружено
- [ ] 100% изображений загружено
- [ ] БД обновлена
- [ ] Prisma мигрирована
- [ ] Frontend проверен
- [ ] Нет 404 ошибок

## 🚀 ГОТОВНОСТЬ К РЕАЛИЗАЦИИ

Симуляция показывает, что план выполним с учетом:
- Достаточного времени для загрузки
- Правильной обработки ошибок
- Поэтапной проверки результатов

**Рекомендация**: PROCEED с реализацией 