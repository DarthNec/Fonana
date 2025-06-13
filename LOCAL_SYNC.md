# Синхронизация локальной версии с Production

## Текущие различия

### Production (fonana.me):
- База данных: PostgreSQL
- Аватары: Генерируются локально (AvatarGenerator)
- DATABASE_URL: `postgresql://fonana_user:yQTx7rKa1QqBrGfFv483ICsnm@localhost:5432/fonana?schema=public`

### Local:
- База данных: SQLite (нужно обновить на PostgreSQL)
- Аватары: Уже обновлены на генератор

## Шаги для синхронизации локальной версии

### 1. Установка PostgreSQL локально

#### macOS:
```bash
# Установка через Homebrew
brew install postgresql@16
brew services start postgresql@16

# Создание базы данных
createdb fonana_dev
```

#### Linux:
```bash
# Установка PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Создание базы данных
sudo -u postgres createdb fonana_dev
sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'postgres';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE fonana_dev TO postgres;"
```

#### Windows:
Скачайте и установите PostgreSQL с https://www.postgresql.org/download/windows/

### 2. Создание .env.local файла

Создайте файл `.env.local` в корне проекта:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fonana_dev?schema=public"

# Solana Configuration
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_HOST=https://api.devnet.solana.com

# Ethereum Configuration
NEXT_PUBLIC_ETHEREUM_NETWORK=goerli
NEXT_PUBLIC_WEB3MODAL_PROJECT_ID=your_web3modal_project_id

# Platform Configuration
NEXT_PUBLIC_PLATFORM_FEE_PERCENTAGE=10
NEXT_PUBLIC_DONATION_FEE_PERCENTAGE=2.5
NEXT_PUBLIC_CONTENT_FEE_PERCENTAGE=15
```

### 3. Применение миграций

```bash
# Генерация Prisma Client
npx prisma generate

# Применение миграций к локальной базе данных
npx prisma migrate deploy

# Если нужно создать новую миграцию
npx prisma migrate dev --name init
```

### 4. Проверка работы

```bash
# Запуск локального сервера
npm run dev

# Проверка подключения к БД
npx prisma studio
```

## Дополнительные настройки

### Импорт данных с production (опционально)

Если нужно импортировать данные с production:

```bash
# На сервере
pg_dump -U fonana_user -h localhost fonana > fonana_backup.sql

# Локально
psql -U postgres -d fonana_dev < fonana_backup.sql
```

### Проверка версий

Убедитесь, что используете те же версии:
- Node.js: 18.x или выше
- PostgreSQL: 16.x
- Prisma: проверьте в package.json

## Итоговая проверка

После синхронизации у вас должно быть:
- ✅ PostgreSQL база данных работает локально
- ✅ Аватары генерируются через AvatarGenerator
- ✅ Все API endpoints работают корректно
- ✅ Нет ошибок при загрузке постов

## Важные файлы для .gitignore

Убедитесь, что эти файлы в .gitignore:
```
.env
.env.local
.env.production
``` 