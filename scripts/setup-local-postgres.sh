#!/bin/bash

# Скрипт для настройки локальной PostgreSQL базы данных для Fonana

echo "🚀 Настройка локальной PostgreSQL для Fonana..."

# Определение ОС
OS="$(uname -s)"

# Установка PostgreSQL в зависимости от ОС
case "${OS}" in
    Darwin*)    # macOS
        echo "📦 Обнаружена macOS..."
        if ! command -v brew &> /dev/null; then
            echo "❌ Homebrew не установлен. Установите его с https://brew.sh/"
            exit 1
        fi
        
        if ! command -v psql &> /dev/null; then
            echo "📦 Установка PostgreSQL..."
            brew install postgresql@16
            brew services start postgresql@16
        else
            echo "✅ PostgreSQL уже установлен"
        fi
        ;;
        
    Linux*)     # Linux
        echo "📦 Обнаружена Linux..."
        if ! command -v psql &> /dev/null; then
            echo "📦 Установка PostgreSQL..."
            sudo apt update
            sudo apt install -y postgresql postgresql-contrib
            sudo systemctl start postgresql
            sudo systemctl enable postgresql
        else
            echo "✅ PostgreSQL уже установлен"
        fi
        ;;
        
    *)
        echo "❌ Неподдерживаемая ОС: ${OS}"
        echo "Пожалуйста, установите PostgreSQL вручную"
        exit 1
        ;;
esac

# Создание базы данных
echo "🗄️ Создание базы данных fonana_dev..."

if [ "${OS}" = "Darwin" ]; then
    # macOS
    createdb fonana_dev 2>/dev/null || echo "База данных fonana_dev уже существует"
else
    # Linux
    sudo -u postgres createdb fonana_dev 2>/dev/null || echo "База данных fonana_dev уже существует"
    sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'postgres';" 2>/dev/null || echo "Пользователь postgres уже существует"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE fonana_dev TO postgres;" 2>/dev/null
fi

# Создание .env.local файла
if [ ! -f .env.local ]; then
    echo "📝 Создание .env.local файла..."
    cat > .env.local << EOF
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
EOF
    echo "✅ .env.local файл создан"
else
    echo "⚠️  .env.local файл уже существует"
fi

# Генерация Prisma Client
echo "🔧 Генерация Prisma Client..."
npx prisma generate

# Применение миграций
echo "🔄 Применение миграций..."
npx prisma migrate deploy

echo "✅ Настройка завершена!"
echo ""
echo "Теперь вы можете:"
echo "1. Запустить сервер: npm run dev"
echo "2. Открыть Prisma Studio: npx prisma studio"
echo ""
echo "База данных: fonana_dev"
echo "Пользователь: postgres"
echo "Пароль: postgres" 