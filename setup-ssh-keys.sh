#!/bin/bash

# Скрипт для настройки SSH ключей на сервере Fonana
# Автор: AI Assistant
# Дата: $(date)

echo "🔑 Настройка SSH ключей для сервера Fonana"
echo "=========================================="

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка прав root
if [ "$EUID" -ne 0 ]; then
    log_error "Этот скрипт должен запускаться от имени root"
    exit 1
fi

log_info "Начинаем настройку SSH ключей..."

# 1. Создание директории .ssh если не существует
log_info "Создание директории /root/.ssh..."
mkdir -p /root/.ssh
chmod 700 /root/.ssh

# 2. Генерация SSH ключей если не существуют
if [ ! -f /root/.ssh/id_ed25519 ]; then
    log_info "Генерация новых SSH ключей..."
    ssh-keygen -t ed25519 -f /root/.ssh/id_ed25519 -N "" -C "fonana-server-$(date +%Y%m%d)"
    log_success "SSH ключи сгенерированы"
else
    log_warning "SSH ключи уже существуют, пропускаем генерацию"
fi

# 3. Создание authorized_keys с публичным ключом
log_info "Настройка authorized_keys..."
cp /root/.ssh/id_ed25519.pub /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
chown root:root /root/.ssh/authorized_keys

# 4. Показываем публичный ключ для копирования
log_success "Публичный ключ для добавления на клиентские машины:"
echo "=========================================="
cat /root/.ssh/id_ed25519.pub
echo "=========================================="

# 5. Проверка конфигурации SSH
log_info "Проверка конфигурации SSH..."
if [ -f /etc/ssh/sshd_config ]; then
    log_info "Текущая конфигурация SSH:"
    echo "PubkeyAuthentication: $(grep -E '^PubkeyAuthentication' /etc/ssh/sshd_config || echo 'не настроено')"
    echo "AuthorizedKeysFile: $(grep -E '^AuthorizedKeysFile' /etc/ssh/sshd_config || echo 'не настроено')"
    echo "PasswordAuthentication: $(grep -E '^PasswordAuthentication' /etc/ssh/sshd_config || echo 'не настроено')"
fi

# 6. Проверка статуса SSH сервиса
log_info "Проверка статуса SSH сервиса..."
if systemctl is-active --quiet ssh; then
    log_success "SSH сервис активен"
elif systemctl is-active --quiet sshd; then
    log_success "SSH сервис (sshd) активен"
else
    log_warning "SSH сервис не активен, пытаемся запустить..."
    systemctl start ssh 2>/dev/null || systemctl start sshd 2>/dev/null
fi

# 7. Проверка файрвола
log_info "Проверка файрвола..."
if command -v ufw >/dev/null 2>&1; then
    ufw_status=$(ufw status | grep "22/tcp" || echo "не настроено")
    log_info "UFW статус для SSH: $ufw_status"
fi

# 8. Создание backup конфигурации
log_info "Создание backup конфигурации SSH..."
if [ -f /etc/ssh/sshd_config ]; then
    cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%Y%m%d_%H%M%S)
    log_success "Backup создан"
fi

# 9. Рекомендации по безопасности
log_info "Рекомендации по безопасности:"
echo "1. Убедитесь, что PubkeyAuthentication yes в /etc/ssh/sshd_config"
echo "2. Рассмотрите отключение PasswordAuthentication для root"
echo "3. Настройте AllowUsers или AllowGroups если необходимо"
echo "4. Перезапустите SSH сервис: systemctl restart ssh"

# 10. Тест подключения
log_info "Тестирование SSH подключения..."
if ssh -o ConnectTimeout=5 -o BatchMode=yes localhost "echo 'SSH test successful'" 2>/dev/null; then
    log_success "SSH подключение работает локально"
else
    log_warning "SSH подключение не работает локально"
fi

# 11. Показываем информацию о ключах
log_info "Информация о созданных ключах:"
echo "Приватный ключ: /root/.ssh/id_ed25519"
echo "Публичный ключ: /root/.ssh/id_ed25519.pub"
echo "Authorized keys: /root/.ssh/authorized_keys"

# 12. Права доступа
log_info "Установка правильных прав доступа..."
chmod 700 /root/.ssh
chmod 600 /root/.ssh/id_ed25519
chmod 644 /root/.ssh/id_ed25519.pub
chmod 600 /root/.ssh/authorized_keys
chown -R root:root /root/.ssh

log_success "Настройка SSH ключей завершена!"
echo ""
log_info "Следующие шаги:"
echo "1. Скопируйте публичный ключ выше на клиентские машины"
echo "2. Проверьте конфигурацию SSH: nano /etc/ssh/sshd_config"
echo "3. Перезапустите SSH: systemctl restart ssh"
echo "4. Протестируйте подключение с клиентской машины"

echo ""
log_info "Для тестирования с клиентской машины используйте:"
echo "ssh -i /path/to/private/key root@$(hostname -I | awk '{print $1}')"
