# 🔑 Настройка SSH ключей для сервера Fonana

> **Полное руководство по настройке SSH ключей для безопасного подключения к серверу Fonana**

## 📋 Обзор

Этот набор скриптов обеспечивает полную настройку SSH ключей для безопасного подключения к серверу Fonana (IP: 209.97.149.137).

## 🚀 Быстрый старт

### На сервере (Linux):
```bash
# Скачайте и запустите главный скрипт
wget https://raw.githubusercontent.com/your-repo/setup-ssh-complete.sh
chmod +x setup-ssh-complete.sh
sudo ./setup-ssh-complete.sh
```

### На клиентской машине (Windows):
```cmd
# Запустите скрипт настройки клиента
setup-ssh-client-windows.bat
```

## 📁 Файлы в пакете

| Файл | Описание | Использование |
|------|----------|---------------|
| `setup-ssh-complete.sh` | **Главный скрипт** | Полная настройка SSH на сервере |
| `setup-ssh-keys.sh` | Генерация ключей | Только создание SSH ключей |
| `setup-ssh-config.sh` | Конфигурация SSH | Только настройка SSH конфигурации |
| `setup-ssh-client-windows.bat` | Клиент Windows | Настройка SSH на Windows |

## 🔧 Детальная инструкция

### 1. Настройка сервера

#### Вариант A: Полная настройка (рекомендуется)
```bash
# Загрузите и запустите главный скрипт
curl -O https://raw.githubusercontent.com/your-repo/setup-ssh-complete.sh
chmod +x setup-ssh-complete.sh
sudo ./setup-ssh-complete.sh
```

**Что делает скрипт:**
- ✅ Обновляет систему
- ✅ Устанавливает необходимые пакеты
- ✅ Настраивает файрвол (UFW)
- ✅ Создает SSH ключи
- ✅ Настраивает authorized_keys
- ✅ Конфигурирует SSH сервис
- ✅ Перезапускает SSH сервис
- ✅ Тестирует подключение

#### Вариант B: Пошаговая настройка
```bash
# 1. Только ключи
sudo ./setup-ssh-keys.sh

# 2. Только конфигурация
sudo ./setup-ssh-config.sh
```

### 2. Настройка клиентской машины

#### Windows:
```cmd
# Запустите скрипт настройки
setup-ssh-client-windows.bat
```

#### Linux/macOS:
```bash
# Создайте SSH ключ
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_fonana -N "" -C "fonana-client"

# Скопируйте публичный ключ на сервер
ssh-copy-id -i ~/.ssh/id_ed25519_fonana.pub root@209.97.149.137

# Создайте SSH конфигурацию
cat >> ~/.ssh/config << 'EOF'
Host fonana-server
    HostName 209.97.149.137
    User root
    Port 22
    IdentityFile ~/.ssh/id_ed25519_fonana
    ServerAliveInterval 60
    ServerAliveCountMax 3
    TCPKeepAlive yes
    Compression yes
EOF
```

### 3. Тестирование подключения

#### С Windows:
```cmd
# Тест подключения
ssh fonana-server "echo 'SSH подключение успешно!'; whoami; hostname"
```

#### С Linux/macOS:
```bash
# Тест подключения
ssh fonana-server "echo 'SSH подключение успешно!'; whoami; hostname"
```

## 🔒 Безопасность

### Настройки безопасности в скриптах:

- ✅ **Аутентификация по ключам**: Включена
- ✅ **Аутентификация по паролю**: Отключена
- ✅ **Пустые пароли**: Запрещены
- ✅ **Строгие права**: Настроены
- ✅ **Ограничения сессий**: Максимум 10
- ✅ **Таймауты**: 300 секунд
- ✅ **Файрвол**: Настроен для SSH, HTTP, HTTPS

### Рекомендации:

1. **Сохраните приватные ключи** в безопасном месте
2. **Используйте сильные пароли** для защиты ключей
3. **Регулярно обновляйте** систему и SSH
4. **Мониторьте логи** SSH подключений
5. **Используйте VPN** для дополнительной безопасности

## 🛠️ Устранение неполадок

### Проблема: "Connection closed by remote host"
**Решение:**
```bash
# Проверьте статус SSH сервиса
systemctl status ssh

# Проверьте конфигурацию
sshd -t

# Проверьте логи
journalctl -u ssh -f
```

### Проблема: "Permission denied (publickey)"
**Решение:**
```bash
# Проверьте права доступа
ls -la /root/.ssh/
chmod 700 /root/.ssh
chmod 600 /root/.ssh/authorized_keys
```

### Проблема: "Host key verification failed"
**Решение:**
```bash
# Очистите known_hosts
ssh-keygen -R 209.97.149.137

# Или добавьте ключ вручную
ssh-keyscan -H 209.97.149.137 >> ~/.ssh/known_hosts
```

## 📊 Мониторинг

### Проверка активных SSH сессий:
```bash
# Показать активные SSH подключения
who
w

# Показать SSH логи
tail -f /var/log/auth.log
```

### Проверка SSH конфигурации:
```bash
# Проверить конфигурацию
sshd -T | grep -E "(pubkey|password|permitroot)"

# Показать открытые порты
ss -tlnp | grep :22
```

## 🔄 Обновление ключей

### Создание новых ключей:
```bash
# На сервере
sudo ./setup-ssh-keys.sh

# На клиенте
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_fonana_new -N "" -C "fonana-client-new"
```

### Ротация ключей:
```bash
# 1. Создайте новые ключи
# 2. Добавьте новые публичные ключи в authorized_keys
# 3. Протестируйте подключение
# 4. Удалите старые ключи
```

## 📞 Поддержка

При возникновении проблем:

1. **Проверьте логи**: `journalctl -u ssh -f`
2. **Проверьте конфигурацию**: `sshd -t`
3. **Проверьте права доступа**: `ls -la /root/.ssh/`
4. **Проверьте файрвол**: `ufw status`

## 📝 Changelog

- **v1.0** - Первоначальная версия
  - Полная настройка SSH
  - Поддержка Windows и Linux
  - Автоматическая конфигурация безопасности

---

<div align="center">
  <strong>🔑 SSH Keys Setup for Fonana Server</strong><br>
  <em>Secure connection made simple</em>
</div>
