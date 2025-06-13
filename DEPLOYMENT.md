# 🚀 Развертывание Fonana

## Обнаруженные проблемы и решения

### 🔧 Основные проблемы:
1. **Несоответствие портов** - разные конфигурации использовали порты 3000 и 3001
2. **Отсутствует DATABASE_URL** - не настроена переменная окружения для Prisma
3. **Проблемы с standalone режимом** - некорректная конфигурация запуска
4. **Множественные nginx конфигурации** - конфликтующие настройки

### ✅ Внесенные исправления:

#### 1. Стандартизация портов
- Все сервисы теперь используют порт **3001**
- Обновлены: `start_fonana.sh`, `fonana.service`, nginx конфигурация

#### 2. Добавлен standalone mode
- `next.config.js` обновлен с `output: 'standalone'`
- Dockerfile исправлен для standalone сборки

#### 3. Исправлен скрипт запуска
- `start_fonana.sh` теперь корректно обрабатывает standalone режим
- Добавлена инициализация базы данных

#### 4. Оптимизирован systemd service
- `fonana.service` использует исправленный скрипт запуска
- Добавлена переменная DATABASE_URL

## 📋 Пошаговое развертывание

### Шаг 1: Подготовка сервера
```bash
# Убедитесь, что вы находитесь в директории проекта
cd /var/www/fonana

# Дайте права на выполнение скриптам
chmod +x deploy-fonana.sh
chmod +x diagnose.sh
chmod +x start_fonana.sh
```

### Шаг 2: Автоматическое развертывание
```bash
# Запустите скрипт развертывания (требуются права root)
sudo ./deploy-fonana.sh
```

### Шаг 3: Проверка состояния
```bash
# Запустите диагностику
./diagnose.sh

# Проверьте статус сервиса
systemctl status fonana

# Посмотрите логи
journalctl -u fonana -f
```

## 🐳 Docker развертывание (альтернатива)

```bash
# Сборка образа
docker build -t fonana .

# Запуск контейнера
docker run -d \
  --name fonana \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e DATABASE_URL="file:./prisma/dev.db" \
  fonana
```

## 🔍 Диагностика проблем

### Проверка портов
```bash
# Проверка занятости портов
netstat -tuln | grep 3001
lsof -i :3001

# Проверка nginx
nginx -t
systemctl status nginx
```

### Проверка базы данных
```bash
# Создание базы данных (если отсутствует)
npx prisma db push

# Проверка схемы
npx prisma db pull
```

### Проверка сборки Next.js
```bash
# Пересборка приложения
npm run build

# Проверка standalone файлов
ls -la .next/standalone/
```

## 📊 Мониторинг

### Логи
```bash
# Системные логи
journalctl -u fonana -f

# Логи nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Проверка работоспособности
```bash
# Локальная проверка
curl http://localhost:3001

# Внешняя проверка  
curl http://69.10.59.234

# Health check
curl http://localhost/health
```

## 🔧 Управление сервисом

```bash
# Запуск
systemctl start fonana

# Остановка
systemctl stop fonana

# Перезапуск
systemctl restart fonana

# Автозапуск
systemctl enable fonana

# Проверка статуса
systemctl status fonana
```

## 🚨 Устранение неполадок

### Белый экран / 404 ошибки
1. Проверьте сборку Next.js: `npm run build`
2. Убедитесь, что база данных создана: `npx prisma db push`
3. Проверьте переменные окружения в `.env`

### Ошибки подключения к базе данных
1. Создайте `.env` файл с `DATABASE_URL="file:./prisma/dev.db"`
2. Выполните `npx prisma generate`
3. Создайте базу: `npx prisma db push`

### Порт уже занят
```bash
# Найти процесс
lsof -i :3001

# Остановить процесс
pkill -f "node.*server.js"
```

## 📁 Важные файлы

- `deploy-fonana.sh` - Автоматическое развертывание
- `diagnose.sh` - Диагностика проблем  
- `start_fonana.sh` - Скрипт запуска приложения
- `fonana.service` - Systemd сервис
- `nginx-fonana-production.conf` - Nginx конфигурация
- `.env` - Переменные окружения (создается автоматически)

## 🌐 Доступ к приложению

После успешного развертывания приложение будет доступно по адресу:
- **http://69.10.59.234** (через nginx)
- **http://localhost:3001** (прямой доступ)

## 📞 Поддержка

При возникновении проблем:
1. Запустите диагностику: `./diagnose.sh`
2. Проверьте логи: `journalctl -u fonana -f`
3. Перезапустите сервис: `systemctl restart fonana` 