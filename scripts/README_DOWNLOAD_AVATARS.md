# 📥 Скрипт загрузки женских аватаров с Pexels

## ✅ Почему Pexels?

- **НЕ требует атрибуции** - можно использовать без указания фотографа
- **200 requests/hour** - выше чем Unsplash (50/hour)
- **Высокое качество** - профессиональные фотографии
- **Бесплатный API** - не нужна оплата
- **Pexels License** - идеально для коммерческого использования

---

## 🔑 Получение API ключа (1 минута)

1. Перейдите на https://www.pexels.com/api/
2. Нажмите **"Get Started"**
3. Зарегистрируйтесь (email + пароль)
4. В Dashboard нажмите **"+ New App"**
5. Заполните форму:
   - **App Name:** Fonana Avatars
   - **Description:** Avatar images for Fonana platform
   - **Website:** http://localhost:3000 (или ваш домен)
6. Нажмите **"Generate API Key"**
7. Скопируйте ключ (формат: `563492ad6f917000...`)

---

## 🚀 Быстрый старт

### Вариант 1: API ключ через переменную окружения (рекомендуется)

```bash
# 1. Установить API ключ (замените на свой!)
set PEXELS_API_KEY=563492ad6f917000010000018d31a03f59bd4af4ac0f503b5428e3c0

# 2. Запустить скрипт
cd C:\Users\blitz\OneDrive\Desktop\FonanaCopy
node scripts/download-female-avatars.js
```

### Вариант 2: API ключ как аргумент командной строки

```bash
node scripts/download-female-avatars.js --api-key 563492ad6f917000010000018d31a03f59bd4af4ac0f503b5428e3c0
```

### Вариант 3: API ключ в .env файле

```bash
# Создать файл .env в корне проекта
echo PEXELS_API_KEY=563492ad6f917000010000018d31a03f59bd4af4ac0f503b5428e3c0 > .env

# Запустить скрипт
node scripts/download-female-avatars.js
```

---

## 📖 Использование

### Базовая команда (150 изображений)
```bash
node scripts/download-female-avatars.js --api-key YOUR_KEY
```

### С параметрами
```bash
# Загрузить 100 изображений
node scripts/download-female-avatars.js --api-key YOUR_KEY --count 100

# Изменить размер (tiny/small/medium/large/large2x)
node scripts/download-female-avatars.js --api-key YOUR_KEY --size large

# Изменить папку назначения
node scripts/download-female-avatars.js --api-key YOUR_KEY --output public/media/avatars

# Комбинация параметров
node scripts/download-female-avatars.js --api-key YOUR_KEY --count 200 --size large --output public/media/faces
```

### Справка
```bash
node scripts/download-female-avatars.js --help
```

---

## ⚙️ Параметры

| Параметр | Описание | По умолчанию | Значения |
|----------|----------|--------------|----------|
| `--api-key KEY` | API ключ Pexels | (обязательно) | Ваш API key |
| `--count N` | Количество изображений | 150 | Любое число |
| `--size SIZE` | Размер изображений | medium | tiny, small, medium, large, large2x |
| `--output DIR` | Папка сохранения | public/media/faces | Любой путь |

**Размеры изображений:**
- `tiny` - ~280x280px
- `small` - ~400x400px
- `medium` - ~600x600px (рекомендуется)
- `large` - ~1200x1200px
- `large2x` - ~2400x2400px

---

## 🎯 Что делает скрипт?

1. **Проверяет API ключ** - валидация перед началом
2. **Создает папку** `public/media/faces/` (если не существует)
3. **Выполняет поиск** по 8 запросам:
   - woman portrait
   - female face
   - woman headshot
   - professional woman
   - young woman
   - woman smiling
   - business woman
   - elegant woman
4. **Загружает изображения** в высоком качестве
5. **Сохраняет файлы** как `female-portrait-001.jpg`, `female-portrait-002.jpg`, и т.д.
6. **Автоматически делает паузы** для соблюдения rate limits (200 req/hour)
7. **Показывает прогресс** в реальном времени с ETA

---

## 📊 Пример вывода

```
🚀 Начинаю загрузку женских портретов с Pexels

📊 Параметры:
   - Изображений: 150
   - Размер: medium
   - Папка: public/media/faces
   - API Key: 563492ad6f...
   - Запросов к API: 2

🔍 Поиск: "woman portrait"...
   📄 Страница 1/1 для запроса "woman portrait"...
   ✅ Получено 80 фотографий (всего: 80)
   ⏸️  Пауза 5с...

🔍 Поиск: "female face"...
   📄 Страница 1/1 для запроса "female face"...
   ✅ Получено 70 фотографий (всего: 150)

📸 Найдено фотографий: 150
🔄 Начинаю загрузку...

[1/150] Загружаю: female-portrait-001.jpg...
   📷 Фотограф: Andrea Piacquadio
   🔗 URL: https://images.pexels.com/photos/774909/pexels-photo...
✅ [1/150] Загружено: female-portrait-001.jpg

[2/150] Загружаю: female-portrait-002.jpg...
   📷 Фотограф: Anastasia Shuraeva
   🔗 URL: https://images.pexels.com/photos/5704849/pexels-phot...
✅ [2/150] Загружено: female-portrait-002.jpg

...

📈 Прогресс: 10/150 (7%)
   ✅ Успешно: 10 | ⏭️ Пропущено: 0 | ❌ Ошибок: 0
   ⏱️  Прошло: 35с | Осталось: ~7м 30с

...

============================================================
🎉 ЗАГРУЗКА ЗАВЕРШЕНА!

📊 Финальная статистика:
   ✅ Успешно загружено: 147
   ⏭️  Пропущено (уже были): 0
   ❌ Ошибок: 3
   📸 Уникальных фотографий: 150
   ⏱️  Общее время: 9м 15с
   📁 Папка: C:\Users\blitz\OneDrive\Desktop\FonanaCopy\public\media\faces
============================================================

✅ Успех! Загружено 90%+ изображений

💡 Следующие шаги:
   1. Проверьте изображения в папке public/media/faces/
   2. Используйте скрипт update_database_media_paths.py для обновления БД
   3. Или используйте эти изображения как дефолтные аватары

📜 ЛИЦЕНЗИЯ: Все изображения распространяются под Pexels License
   ✅ Можно использовать коммерчески
   ✅ НЕ требуется атрибуция фотографа
   ✅ Можно модифицировать
```

---

## ⚠️ Важные моменты

### Rate Limits Pexels

Pexels API имеет ограничение:
- **200 запросов/час** (выше чем Unsplash!)
- Это ~3.3 запроса в минуту

**Скрипт автоматически:**
- Делает паузу 2 секунды между загрузками изображений
- Делает паузу 5 секунд между страницами результатов
- При ошибке 429 (Too Many Requests) ждет 60 секунд

### Лицензия Pexels

Изображения с Pexels защищены **Pexels License**:
- ✅ Можно использовать коммерчески
- ✅ НЕ требуется атрибуция фотографа
- ✅ Можно модифицировать
- ✅ Можно распространять

**Это идеально для продакшена!**

### Если достигнут rate limit

```bash
# Скрипт автоматически обработает и подождет
# Но если нужно возобновить позже:
node scripts/download-female-avatars.js --api-key YOUR_KEY

# Скрипт пропустит уже загруженные файлы
```

---

## 🔄 Использование в проекте

### После загрузки изображений:

#### Вариант 1: Заменить существующие аватары

```bash
# Удалить старые аватары (опционально)
del public\media\avatars\*.jpg

# Переместить новые
move public\media\faces\*.jpg public\media\avatars\

# Обновить пути в базе данных
python scripts/update_database_media_paths.py
```

#### Вариант 2: Использовать как отдельную категорию

```typescript
// В Avatar.tsx можно добавить логику:
const defaultFemaleAvatar = `/media/faces/female-portrait-${(hash(userId) % 150) + 1}.jpg`;
```

#### Вариант 3: Конвертировать в WebP для оптимизации

```bash
# Установить sharp (если еще нет)
npm install sharp

# Создать скрипт конвертации или использовать cwebp:
cd public/media/faces
for %f in (*.jpg) do cwebp -q 85 "%f" -o "%~nf.webp"
```

---

## 🐛 Устранение неполадок

### ❌ Ошибка: Не указан API ключ

```
Решение: Укажите API ключ одним из способов:
- set PEXELS_API_KEY=your_key
- node scripts/download-female-avatars.js --api-key your_key
- Создайте .env файл
```

### ❌ Ошибка: 401 Unauthorized

```
Решение: Проверьте правильность API ключа
- Ключ должен начинаться с цифр (563492...)
- Скопируйте из Pexels Dashboard
- Проверьте что не добавились лишние пробелы
```

### ❌ Ошибка: 429 Too Many Requests

```
Решение: Достигнут rate limit (200 req/hour)
- Подождите 1 час
- Скрипт автоматически возобновит загрузку
- Или используйте меньший --count
```

### ❌ Ошибка: ENOENT (папка не найдена)

```bash
# Создать папку вручную
mkdir public\media\faces
```

### ❌ Ошибка: Network error / ECONNRESET

```
Решение: 
- Проверьте интернет-соединение
- Проверьте что Pexels доступен: https://www.pexels.com
- Попробуйте позже
```

---

## 🎨 Сравнение с Unsplash

| Характеристика | Pexels | Unsplash |
|----------------|--------|----------|
| **Атрибуция** | ❌ Не требуется | ⚠️ Требуется |
| **Rate Limit** | 200 req/hour | 50 req/hour (demo) |
| **API Key** | Бесплатный | Бесплатный |
| **Качество** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Поиск** | ✅ Хороший | ✅ Отличный |
| **Для продакшена** | ✅ Идеально | ⚠️ Требует attribution |

**Вердикт:** Pexels лучше для продакшена!

---

## 📝 Примеры команд

```bash
# Тестовая загрузка (10 изображений)
node scripts/download-female-avatars.js --api-key YOUR_KEY --count 10

# Стандартная загрузка (150 изображений, medium)
node scripts/download-female-avatars.js --api-key YOUR_KEY

# Большая загрузка (300 изображений, large)
node scripts/download-female-avatars.js --api-key YOUR_KEY --count 300 --size large

# Прямо в папку аватаров
node scripts/download-female-avatars.js --api-key YOUR_KEY --output public/media/avatars

# С переменной окружения (удобно для CI/CD)
set PEXELS_API_KEY=YOUR_KEY
node scripts/download-female-avatars.js --count 100
```

---

## 📞 Поддержка

Если возникли проблемы:

1. Проверьте README
2. Запустите с `--help`
3. Проверьте логи ошибок
4. Попробуйте с `--count 10` для теста
5. Проверьте API key на https://www.pexels.com/api/

---

## 🔐 Безопасность API ключа

**НЕ коммитьте API ключ в Git!**

Добавьте в `.gitignore`:
```
.env
```

Используйте переменные окружения для продакшена.

---

**Создано:** 18.02.2026  
**Автор:** M7 Analysis System  
**Версия:** 2.0 (Pexels)  
**Лицензия:** MIT
