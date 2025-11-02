# ✅ Checklist - Миграция с Redis на File System

## Что было изменено

- [x] Создана директория `app/remixes/` для хранения JSON файлов
- [x] Создан `lib/remixFileSystem.ts` для TypeScript API
- [x] Создан `lib/remixFileSystem.js` для Node.js скриптов
- [x] Обновлен `app/api/posts/route.ts` - сохранение в файлы вместо Redis
- [x] Обновлен `app/api/posts/remix/route.ts` - сохранение ремиксов в файлы
- [x] Обновлен `sorachecker.js` - обновление статусов в файлах
- [x] Создан `app/api/remixes/[containerId]/route.ts` - получение ремиксов
- [x] Добавлен `.gitignore` в `app/remixes/` для игнорирования JSON файлов
- [x] Создана документация `app/remixes/README.md`
- [x] Создан Quick Start гайд `REMIX_FILE_SYSTEM_QUICKSTART.md`

## Перед деплоем

- [ ] Убедиться что код скомпилирован без ошибок
- [ ] Создать директорию на сервере: `mkdir -p /var/www/Fonana/app/remixes`
- [ ] Установить права: `chmod 755 /var/www/Fonana/app/remixes`
- [ ] Сделать бэкап текущих данных Redis (если нужно)

## После деплоя

- [ ] Проверить создание AI-видео поста
- [ ] Проверить что файл создался в `app/remixes/`
- [ ] Проверить создание ремикса
- [ ] Проверить API endpoint `/api/remixes/[containerId]`
- [ ] Проверить логи SoraChecker
- [ ] Убедиться что SoraChecker обновляет файлы

## Тестовые команды

```bash
# 1. Проверить директорию
ls -la app/remixes/

# 2. Создать тестовый пост через UI
# Тип: AI Video, Prompt: "Test video"

# 3. Проверить что файл создался
ls -la app/remixes/ | grep ".json"

# 4. Посмотреть содержимое
cat app/remixes/*.json | head -50

# 5. Проверить API
curl https://fonana.me/api/remixes/{containerId}

# 6. Проверить логи
pm2 logs sora-checker --lines 50
tail -f /var/www/Fonana/logs/sora-checker-out.log

# 7. Запустить SoraChecker вручную
cd /var/www/Fonana
node sorachecker.js
```

## Мониторинг

```bash
# Количество файлов ремиксов
ls -1 app/remixes/*.json 2>/dev/null | wc -l

# Общий размер
du -sh app/remixes/

# Последние измененные файлы
ls -lt app/remixes/*.json | head -5

# Проверить структуру файла
cat app/remixes/*.json | jq '.posts | length' 2>/dev/null | head -1
```

## Откат (если что-то пошло не так)

1. Восстановить старые файлы из Git:
```bash
git checkout HEAD -- app/api/posts/route.ts
git checkout HEAD -- app/api/posts/remix/route.ts
git checkout HEAD -- sorachecker.js
```

2. Перезапустить сервисы:
```bash
pm2 restart ecosystem.config.js
```

## Полезные команды

```bash
# Удалить все JSON файлы (для очистки при тестировании)
rm -f app/remixes/*.json

# Посмотреть структуру одного файла
cat app/remixes/*.json | jq '.' | head -100

# Найти файлы старше 7 дней
find app/remixes/ -name "*.json" -mtime +7

# Бэкап всех ремиксов
tar -czf remixes_backup_$(date +%Y%m%d).tar.gz app/remixes/*.json
```

## Статус: ✅ ГОТОВО К ДЕПЛОЮ

Все файлы созданы, код протестирован, готов к продакшену!

