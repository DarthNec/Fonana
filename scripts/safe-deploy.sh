#!/bin/bash

# 🚀 БЕЗОПАСНЫЙ СКРИПТ ДЕПЛОЯ FONANA
# Версия: 3.0
# Дата: 2024-12-17
# 
# Этот скрипт обеспечивает безопасный деплой с автоматическим откатом
# при любых ошибках. Всегда создает бэкап перед изменениями.

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Функции вывода
success() { echo -e "${GREEN}✅ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; exit 1; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
info() { echo -e "ℹ️  $1"; }

# Функция восстановления
restore_backup() {
    warning "Восстанавливаем из бэкапа..."
    cp -r "/backup/fonana-backup-$(date +%Y%m%d)" "/var/www/Fonana" || error "Не удалось восстановить бэкап"
    pm2 restart fonana
    error "Деплой отменен, система восстановлена"
}

# Проверка, что мы на сервере
if [ ! -d "/var/www/Fonana" ]; then
    error "Этот скрипт должен запускаться на продакшн сервере!"
fi

# Переход в директорию проекта
cd /var/www/Fonana || error "Не могу перейти в директорию проекта"

# Сохраняем текущий коммит для возможности отката
CURRENT_COMMIT=$(git rev-parse HEAD)
info "Текущий коммит: $CURRENT_COMMIT"

# Создаем бэкап
BACKUP_DIR="/backup/fonana-backup-$(date +%Y%m%d-%H%M%S)"
info "Создаем бэкап в $BACKUP_DIR..."
mkdir -p /backup
cp -r "/var/www/Fonana" "$BACKUP_DIR" || error "Не удалось создать бэкап"
success "Бэкап создан"

# Проверяем статус Git
info "Проверяем Git статус..."
if [[ -n $(git status --porcelain) ]]; then
    warning "Обнаружены незакоммиченные изменения!"
    git status
    echo ""
    read -p "Продолжить? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Деплой отменен пользователем"
    fi
fi

# Обновляем код
info "Обновляем код из Git..."
git fetch origin || error "Не удалось получить изменения из Git"
git pull origin main || {
    restore_backup
}

# Проверяем, есть ли изменения
NEW_COMMIT=$(git rev-parse HEAD)
if [[ "$CURRENT_COMMIT" == "$NEW_COMMIT" ]]; then
    info "Новых изменений нет"
    exit 0
fi

success "Код обновлен до коммита: $NEW_COMMIT"

# Устанавливаем зависимости
info "Обновляем зависимости..."
npm ci || {
    restore_backup
}

# Применяем миграции БД (если есть)
if [ -f "prisma/schema.prisma" ]; then
    info "Применяем миграции БД..."
    read -p "Применить миграции Prisma? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npx prisma migrate deploy || {
            restore_backup
        }
        success "Миграции применены"
    fi
fi

# Билдим приложение
info "🏗️  Собираем приложение..."
NODE_ENV=production npm run build || {
    restore_backup
}

success "Приложение собрано"

# Проверяем, что .next директория создана
if [ ! -d ".next" ]; then
    restore_backup
fi

# Перезапускаем приложение
info "🔄 Перезапускаем приложение..."
pm2 reload fonana --update-env || {
    warning "PM2 reload не удался, пробуем restart..."
    pm2 restart fonana || {
        restore_backup
    }
}

# Ждем немного для инициализации
sleep 5

# Проверяем здоровье приложения
info "🔍 Проверяем здоровье приложения..."
if pm2 list | grep -q "fonana.*online"; then
    success "Приложение запущено успешно"
else
    restore_backup
fi

# Проверяем HTTP-ответ
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")
if [[ "$HTTP_CODE" == "200" ]]; then
    success "HTTP проверка пройдена"
else
    warning "HTTP проверка не пройдена (код: $HTTP_CODE)"
    restore_backup
fi

# Очищаем старые бэкапы (оставляем последние 5)
info "Очищаем старые бэкапы..."
ls -t /backup/fonana-backup-* | tail -n +6 | xargs -r rm -rf

# Обновляем кеш Next.js (опционально)
if [ -d ".next/cache" ]; then
    info "Очищаем кеш Next.js..."
    rm -rf .next/cache
fi

success "🎉 Деплой завершен успешно!"
success "🔗 Приложение доступно на https://fonana.me"

# Показываем статус
info "📊 Статус PM2:"
pm2 status

# Показываем последние логи
info "📋 Последние логи (10 строк):"
pm2 logs fonana --lines 10 --nostream

# Подсказки для администратора
echo ""
info "💡 Полезные команды:"
echo "   • Логи: pm2 logs fonana"
echo "   • Статус: pm2 status"
echo "   • Рестарт: pm2 restart fonana"
echo "   • Откат: git reset --hard $CURRENT_COMMIT && npm run build && pm2 restart fonana"
echo ""

# Сохраняем информацию о деплое
echo "$(date): Deploy completed. Commit: $NEW_COMMIT" >> /var/log/fonana-deploys.log

success "Деплой завершен! 🚀" 