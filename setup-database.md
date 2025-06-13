# 🗄️ Настройка базы данных для Fonana

## Текущее состояние
- Используется SQLite (`file:./dev.db`)
- Подходит для разработки и небольших проектов
- Ограничения: один пользователь, нет параллельных запросов

## Варианты для Production

### 1. 🌤️ Облачная PostgreSQL (Рекомендуется)

#### Supabase (Бесплатный план)
1. Зайдите на https://supabase.com
2. Создайте новый проект
3. Получите connection string:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

#### Neon (Бесплатный план)
1. Зайдите на https://neon.tech
2. Создайте новый проект
3. Получите connection string из Dashboard

#### Railway (Бесплатный план)
1. Зайдите на https://railway.app
2. Создайте PostgreSQL сервис
3. Скопируйте DATABASE_URL

### 2. 🖥️ PostgreSQL на сервере

```bash
# Установка PostgreSQL
ssh -p 43988 root@69.10.59.234

# Обновление пакетов
apt update && apt upgrade -y

# Установка PostgreSQL
apt install postgresql postgresql-contrib -y

# Создание базы данных
sudo -u postgres psql << EOF
CREATE DATABASE fonana;
CREATE USER fonana_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE fonana TO fonana_user;
EOF

# Connection string
DATABASE_URL="postgresql://fonana_user:your_secure_password@localhost:5432/fonana"
```

### 3. 🚀 Быстрая настройка с Supabase

1. **Создайте аккаунт на Supabase**
   - https://supabase.com/dashboard

2. **Создайте новый проект**
   - Название: Fonana
   - Пароль: сохраните в безопасном месте
   - Регион: выберите ближайший

3. **Получите credentials**
   - Settings → Database
   - Connection string → URI

4. **Обновите на сервере**
   ```bash
   # Локально
   ./update-database.sh "postgresql://..."
   ```

## 📝 Скрипт обновления БД

Создайте файл `update-database.sh`:

```bash
#!/bin/bash

DATABASE_URL=$1
SERVER="root@69.10.59.234"
SSH_PORT="43988"

if [ -z "$DATABASE_URL" ]; then
    echo "Использование: ./update-database.sh DATABASE_URL"
    exit 1
fi

echo "🔄 Обновление базы данных на сервере..."

ssh -p $SSH_PORT $SERVER << EOF
cd /var/www/fonana

# Бэкап текущей БД
cp prisma/dev.db prisma/dev.db.backup

# Обновление .env
sed -i 's|DATABASE_URL=.*|DATABASE_URL="$DATABASE_URL"|' .env

# Применение миграций
npx prisma migrate deploy
npx prisma generate

# Перезапуск сервиса
systemctl restart fonana

echo "✅ База данных обновлена!"
EOF
```

## ⚡ Миграция данных

Если нужно сохранить существующие данные:

1. **Экспорт из SQLite**
   ```bash
   npx prisma db pull
   npx prisma migrate dev --name init
   ```

2. **Импорт в PostgreSQL**
   ```bash
   DATABASE_URL="postgresql://..." npx prisma db push
   ```

## 🔍 Проверка

После настройки проверьте:
```bash
# Статус сервиса
ssh -p 43988 root@69.10.59.234 "systemctl status fonana"

# Логи
ssh -p 43988 root@69.10.59.234 "journalctl -u fonana -n 50"

# Тест подключения
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && npx prisma db push"
```

## 💡 Рекомендации

1. **Для MVP**: Продолжайте с SQLite
2. **Для роста**: Переходите на Supabase (бесплатно до 500MB)
3. **Для production**: Используйте управляемую БД с бэкапами 