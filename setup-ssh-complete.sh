#!/bin/bash

# Главный скрипт для полной настройки SSH на сервере Fonana
# Автор: AI Assistant

echo "🚀 Полная настройка SSH для сервера Fonana"
echo "========================================="

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Функция для выполнения команд с проверкой
run_command() {
    local cmd="$1"
    local description="$2"
    
    log_info "$description"
    if eval "$cmd"; then
        log_success "$description - выполнено"
        return 0
    else
        log_error "$description - ошибка"
        return 1
    fi
}

# 1. Обновление системы
log_info "Обновление системы..."
apt update && apt upgrade -y

# 2. Установка необходимых пакетов
log_info "Установка необходимых пакетов..."
apt install -y openssh-server ufw curl wget nano htop

# 3. Настройка файрвола
log_info "Настройка файрвола..."
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw status

# 4. Создание SSH ключей
log_info "Создание SSH ключей..."
mkdir -p /root/.ssh
chmod 700 /root/.ssh

if [ ! -f /root/.ssh/id_ed25519 ]; then
    ssh-keygen -t ed25519 -f /root/.ssh/id_ed25519 -N "" -C "fonana-server-$(date +%Y%m%d)"
    log_success "SSH ключи созданы"
else
    log_warning "SSH ключи уже существуют"
fi

# 5. Настройка authorized_keys
log_info "Настройка authorized_keys..."
cp /root/.ssh/id_ed25519.pub /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
chown root:root /root/.ssh/authorized_keys

# 6. Показываем публичный ключ
log_success "Публичный ключ для клиентских машин:"
echo "=========================================="
cat /root/.ssh/id_ed25519.pub
echo "=========================================="

# 7. Настройка SSH конфигурации
log_info "Настройка SSH конфигурации..."
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%Y%m%d_%H%M%S)

# Создаем новую конфигурацию
cat > /etc/ssh/sshd_config << 'EOF'
# SSH Configuration for Fonana Server
Port 22
Protocol 2

# Аутентификация
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
PasswordAuthentication no
PermitEmptyPasswords no
ChallengeResponseAuthentication no
UsePAM no

# Безопасность
PermitRootLogin yes
StrictModes yes
MaxAuthTries 3
MaxSessions 10

# Соединение
ClientAliveInterval 300
ClientAliveCountMax 2
TCPKeepAlive yes

# Логирование
SyslogFacility AUTH
LogLevel INFO

# Дополнительные настройки
X11Forwarding no
PrintMotd no
PrintLastLog yes
AcceptEnv LANG LC_*
Compression yes
EOF

# 8. Проверка конфигурации
log_info "Проверка SSH конфигурации..."
if sshd -t; then
    log_success "SSH конфигурация корректна"
else
    log_error "Ошибка в SSH конфигурации!"
    exit 1
fi

# 9. Перезапуск SSH сервиса
log_info "Перезапуск SSH сервиса..."
systemctl restart ssh 2>/dev/null || systemctl restart sshd 2>/dev/null

# 10. Проверка статуса
log_info "Проверка статуса SSH сервиса..."
if systemctl is-active --quiet ssh || systemctl is-active --quiet sshd; then
    log_success "SSH сервис активен"
else
    log_error "SSH сервис не активен!"
fi

# 11. Тест локального подключения
log_info "Тестирование SSH подключения..."
if ssh -o ConnectTimeout=5 -o BatchMode=yes localhost "echo 'SSH test successful'" 2>/dev/null; then
    log_success "SSH подключение работает локально"
else
    log_warning "SSH подключение не работает локально"
fi

# 12. Показываем информацию о сервере
log_info "Информация о сервере:"
echo "IP адрес: $(hostname -I | awk '{print $1}')"
echo "Hostname: $(hostname)"
echo "OS: $(lsb_release -d | cut -f2)"
echo "Uptime: $(uptime -p)"

# 13. Финальная информация
log_success "Настройка SSH завершена!"
echo ""
log_info "Следующие шаги:"
echo "1. Скопируйте публичный ключ выше на клиентские машины"
echo "2. Протестируйте подключение: ssh root@$(hostname -I | awk '{print $1}')"
echo "3. Убедитесь, что подключение работает перед отключением сессии"

echo ""
log_info "Команды для клиентских машин:"
echo "ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_fonana"
echo "ssh-copy-id -i ~/.ssh/id_ed25519_fonana.pub root@$(hostname -I | awk '{print $1}')"
echo "ssh -i ~/.ssh/id_ed25519_fonana root@$(hostname -I | awk '{print $1}')"

echo ""
log_warning "ВАЖНО: Сохраните приватный ключ в безопасном месте!"
echo "Приватный ключ: /root/.ssh/id_ed25519"
echo "Публичный ключ: /root/.ssh/id_ed25519.pub"
