#!/bin/bash

# Безопасный скрипт деплоя с проверками и откатом
# Использование: ./scripts/safe-deploy.sh

set -e  # Остановиться при любой ошибке

echo "🚀 Начинаем безопасный деплой Fonana..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для вывода ошибок
error() {
    echo -e "${RED}❌ Ошибка: $1${NC}"
    exit 1
}

# Функция для вывода успеха
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Функция для вывода предупреждений
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Проверка, что мы на сервере
if [ ! -d "/var/www/fonana" ]; then
    error "Этот скрипт должен запускаться на продакшн сервере!"
fi

# Переход в директорию проекта
cd /var/www/fonana || error "Не могу перейти в директорию проекта"

# Сохраняем текущий коммит для возможности отката
CURRENT_COMMIT=$(git rev-parse HEAD)
echo "📌 Текущий коммит: $CURRENT_COMMIT"

# Создаем бекап .env файла
if [ -f .env ]; then
    cp .env .env.backup_$(date +%Y%m%d_%H%M%S)
    success "Создан бекап .env файла"
fi

# Проверяем статус git
if [ -n "$(git status --porcelain)" ]; then
    warning "Есть незакоммиченные изменения!"
    git status --short
    read -p "Продолжить? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Деплой отменен"
    fi
fi

# Получаем последние изменения
echo "📥 Получаем последние изменения..."
git fetch origin main || error "Не удалось получить изменения"

# Показываем что будет обновлено
echo "📋 Изменения для деплоя:"
git log --oneline HEAD..origin/main

# Подтверждение
read -p "Применить эти изменения? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    error "Деплой отменен"
fi

# Обновляем код
echo "🔄 Обновляем код..."
git pull origin main || error "Не удалось обновить код"

# Проверяем наличие новых зависимостей
if git diff $CURRENT_COMMIT HEAD --name-only | grep -q "package.json"; then
    echo "📦 Обнаружены изменения в package.json, устанавливаем зависимости..."
    npm ci || error "Не удалось установить зависимости"
fi

# Проверяем миграции
echo "🗄️  Проверяем миграции базы данных..."
npx prisma migrate status || warning "Не удалось проверить статус миграций"

# Спрашиваем про миграции
read -p "Применить миграции базы данных? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 Применяем миграции..."
    npx prisma migrate deploy || error "Не удалось применить миграции"
    success "Миграции применены"
fi

# Генерируем Prisma клиент
echo "🔨 Генерируем Prisma клиент..."
npx prisma generate || error "Не удалось сгенерировать Prisma клиент"

# Проверяем переменные окружения
echo "🔍 Проверяем переменные окружения..."
if [ ! -f .env ]; then
    error ".env файл не найден!"
fi

# Проверяем критические переменные
check_env_var() {
    if ! grep -q "^$1=" .env; then
        warning "Переменная $1 не установлена в .env"
        return 1
    fi
    return 0
}

ENV_WARNINGS=0
check_env_var "DATABASE_URL" || ((ENV_WARNINGS++))
check_env_var "NEXTAUTH_SECRET" || ((ENV_WARNINGS++))
check_env_var "NEXT_PUBLIC_PLATFORM_WALLET" || ((ENV_WARNINGS++))
check_env_var "NEXT_PUBLIC_SOLANA_RPC_HOST" || ((ENV_WARNINGS++))

if [ $ENV_WARNINGS -gt 0 ]; then
    warning "Обнаружено $ENV_WARNINGS предупреждений о переменных окружения"
    read -p "Продолжить? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Деплой отменен"
    fi
fi

# Билдим приложение
echo "🏗️  Собираем приложение..."
NODE_ENV=production npm run build || {
    echo -e "${RED}❌ Сборка не удалась!${NC}"
    echo "Откатываемся на предыдущий коммит..."
    git reset --hard $CURRENT_COMMIT
    npm ci
    error "Сборка не удалась, откат выполнен"
}

success "Приложение успешно собрано"

# Проверяем что PM2 запущен
if ! pm2 list | grep -q "fonana"; then
    error "Приложение 'fonana' не найдено в PM2"
fi

# Перезапускаем приложение
echo "🔄 Перезапускаем приложение..."
pm2 reload fonana --update-env || error "Не удалось перезапустить приложение"

# Ждем пока приложение запустится
echo "⏳ Ждем запуска приложения..."
sleep 5

# Проверяем статус
if pm2 list | grep -q "fonana.*online"; then
    success "Приложение успешно запущено"
else
    error "Приложение не запустилось! Проверьте логи: pm2 logs fonana"
fi

# Проверяем доступность сайта
echo "🌐 Проверяем доступность сайта..."
if curl -s -o /dev/null -w "%{http_code}" https://fonana.me | grep -q "200"; then
    success "Сайт доступен и работает"
else
    warning "Сайт может быть недоступен, проверьте вручную"
fi

# Показываем логи
echo "📜 Последние логи:"
pm2 logs fonana --lines 20 --nostream

echo ""
success "Деплой завершен успешно! 🎉"
echo ""
echo "📌 Полезные команды:"
echo "  pm2 status          - статус приложения"
echo "  pm2 logs fonana     - просмотр логов"
echo "  pm2 monit           - мониторинг в реальном времени"
echo ""
echo "🔙 Для отката используйте:"
echo "  git reset --hard $CURRENT_COMMIT"
echo "  npm ci && npm run build"
echo "  pm2 restart fonana"
echo "" 