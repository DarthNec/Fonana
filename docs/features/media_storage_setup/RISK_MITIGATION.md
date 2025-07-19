# 🛡️ RISK MITIGATION: Media Storage Setup v1

## 📅 Дата: 18.01.2025
## 🎯 Задача: План устранения критических и major рисков

## 🔴 КРИТИЧЕСКИЕ РИСКИ - ОБЯЗАТЕЛЬНЫЕ К УСТРАНЕНИЮ

### Риск 1: Потеря оригинальных URL в БД

#### Описание
При обновлении полей avatar, thumbnail, mediaUrl мы потеряем оригинальные ссылки на Supabase.

#### План митигации
```sql
-- 1. Создание резервных колонок
ALTER TABLE users ADD COLUMN IF NOT EXISTS "avatar_original" TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS "thumbnail_original" TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS "mediaUrl_original" TEXT;

-- 2. Сохранение оригинальных значений
UPDATE users SET "avatar_original" = avatar WHERE avatar IS NOT NULL;
UPDATE posts SET 
    "thumbnail_original" = thumbnail,
    "mediaUrl_original" = "mediaUrl"
WHERE thumbnail IS NOT NULL OR "mediaUrl" IS NOT NULL;

-- 3. Проверка сохранения
SELECT COUNT(*) FROM users WHERE "avatar_original" IS NOT NULL;
SELECT COUNT(*) FROM posts WHERE "thumbnail_original" IS NOT NULL;
```

#### Proof of Mitigation
```sql
-- Тест восстановления
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN avatar = avatar_original THEN 1 END) as can_restore
FROM users
WHERE avatar_original IS NOT NULL;
-- Ожидаемый результат: total = can_restore после отката
```

### Риск 2: Нехватка места на диске

#### Описание
Загрузка ~400 файлов общим размером ~500MB может превысить доступное место.

#### План митигации
```bash
#!/bin/bash
# scripts/check_disk_space.sh

# 1. Проверка перед началом
REQUIRED_MB=1000  # 1GB для безопасности
AVAILABLE_MB=$(df -m . | tail -1 | awk '{print $4}')

if [ $AVAILABLE_MB -lt $REQUIRED_MB ]; then
    echo "❌ ОШИБКА: Недостаточно места на диске!"
    echo "Требуется: ${REQUIRED_MB}MB, Доступно: ${AVAILABLE_MB}MB"
    exit 1
fi

echo "✅ Места достаточно: ${AVAILABLE_MB}MB доступно"

# 2. Мониторинг во время загрузки
monitor_space() {
    while true; do
        CURRENT_MB=$(df -m . | tail -1 | awk '{print $4}')
        if [ $CURRENT_MB -lt 100 ]; then
            echo "⚠️ ПРЕДУПРЕЖДЕНИЕ: Осталось менее 100MB!"
            # Отправить сигнал остановки скрипту загрузки
            touch /tmp/stop_download
        fi
        sleep 30
    done
}

monitor_space &
MONITOR_PID=$!
```

#### Proof of Mitigation
```bash
# Проверка после загрузки каждых 50 файлов
du -sh public/media/
df -h .
```

## 🟡 MAJOR РИСКИ - ТРЕБУЮТ ВНИМАНИЯ

### Риск 3: Несоответствие placeholder контенту

#### Описание
Случайные изображения могут не соответствовать категориям постов.

#### План митигации
```python
# scripts/categorized_download.py
import requests
from typing import Dict, List

class CategorizedDownloader:
    def __init__(self):
        # Маппинг категорий на Unsplash коллекции
        self.category_mapping = {
            'art': 'art,painting,illustration',
            'tech': 'technology,computer,programming',
            'lifestyle': 'lifestyle,fashion,wellness',
            'trading': 'finance,charts,money',
            'intimate': 'portrait,beauty,fashion',
            'gaming': 'gaming,esports,videogames',
            'music': 'music,concert,instruments',
            'education': 'education,books,learning',
            'comedy': 'funny,humor,meme'
        }
        
    def get_appropriate_image(self, category: str, index: int) -> str:
        """Получить изображение соответствующее категории"""
        keywords = self.category_mapping.get(category.lower(), 'general')
        
        # Используем Unsplash с правильными ключевыми словами
        url = f"https://source.unsplash.com/800x600/?{keywords}"
        
        # Альтернатива: использовать конкретные коллекции
        collections = {
            'art': '1163637',  # Art collection
            'tech': '2184453', # Technology collection
            'lifestyle': '17098', # Lifestyle collection
        }
        
        if category.lower() in collections:
            collection_id = collections[category.lower()]
            url = f"https://source.unsplash.com/collection/{collection_id}/800x600"
            
        return url
```

#### Proof of Mitigation
```python
# Визуальная проверка соответствия
for category in categories:
    sample_path = f"public/media/posts/{category}_0.jpg"
    print(f"Проверьте {category}: {sample_path}")
```

### Риск 4: Проблемы с правами доступа

#### Описание
Папки могут быть созданы с неправильными правами.

#### План митигации
```bash
#!/bin/bash
# scripts/fix_permissions.sh

# 1. Установка правильных прав
find public/media -type d -exec chmod 755 {} \;
find public/media -type f -exec chmod 644 {} \;

# 2. Проверка владельца
CURRENT_USER=$(whoami)
chown -R $CURRENT_USER:$CURRENT_USER public/media/

# 3. Тест записи
for dir in avatars backgrounds posts thumbposts temp; do
    TEST_FILE="public/media/$dir/.write_test"
    if touch "$TEST_FILE" 2>/dev/null; then
        echo "✅ Запись в $dir: OK"
        rm "$TEST_FILE"
    else
        echo "❌ Запись в $dir: FAILED"
        exit 1
    fi
done
```

### Риск 5: Медленная загрузка изображений

#### Описание
Большие изображения замедлят загрузку страниц.

#### План митигации
```python
# scripts/optimize_images.py
from PIL import Image
import os
from concurrent.futures import ProcessPoolExecutor

def optimize_image(filepath: str):
    """Оптимизация одного изображения"""
    try:
        img = Image.open(filepath)
        
        # Определяем оптимальные размеры
        if 'avatars' in filepath:
            max_size = (400, 400)
            quality = 85
        elif 'backgrounds' in filepath:
            max_size = (1200, 400)
            quality = 80
        elif 'thumbposts' in filepath:
            max_size = (400, 300)
            quality = 75
        else:  # posts
            max_size = (800, 600)
            quality = 82
            
        # Resize с сохранением пропорций
        img.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        # Сохраняем с оптимизацией
        img.save(filepath, 'JPEG', quality=quality, optimize=True)
        
        # Проверяем размер файла
        size_kb = os.path.getsize(filepath) / 1024
        print(f"✅ Оптимизирован: {filepath} ({size_kb:.1f}KB)")
        
    except Exception as e:
        print(f"❌ Ошибка оптимизации {filepath}: {e}")

# Параллельная оптимизация
with ProcessPoolExecutor(max_workers=4) as executor:
    all_images = []
    for root, dirs, files in os.walk('public/media'):
        for file in files:
            if file.endswith(('.jpg', '.jpeg', '.png')):
                all_images.append(os.path.join(root, file))
    
    executor.map(optimize_image, all_images)
```

## 🟢 MINOR РИСКИ - МОНИТОРИНГ

### Риск 6: NSFW контент в placeholders

#### Мониторинг
```python
# Визуальная проверка случайной выборки
import random
import webbrowser

sample_files = random.sample(os.listdir('public/media/posts'), 10)
for file in sample_files:
    filepath = f"file:///path/to/public/media/posts/{file}"
    print(f"Проверьте: {file}")
    # webbrowser.open(filepath)  # Открыть в браузере
```

## 📋 КОНТРОЛЬНЫЙ ЧЕКЛИСТ

### Перед началом
- [ ] Disk space проверен (минимум 1GB)
- [ ] Backup БД создан
- [ ] Оригинальные URL сохранены в отдельные колонки
- [ ] Права на папки проверены

### Во время выполнения
- [ ] Мониторинг disk space активен
- [ ] Категоризация изображений работает
- [ ] Retry логика для загрузки активна

### После завершения
- [ ] Все изображения оптимизированы
- [ ] Визуальная проверка выборки
- [ ] Performance тест загрузки страниц
- [ ] Backup можно восстановить

## 🚀 ИТОГОВАЯ ГОТОВНОСТЬ

С применением всех митигаций:
- 🔴 Критические риски: **УСТРАНЕНЫ**
- 🟡 Major риски: **ПОД КОНТРОЛЕМ**
- 🟢 Minor риски: **МОНИТОРИНГ**

**Заключение**: Система готова к безопасной реализации 