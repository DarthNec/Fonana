# 🚀 Быстрая настройка SSH для сервера Fonana

## 📋 Что создано:

✅ **4 скрипта для настройки SSH:**
- `setup-ssh-complete.sh` - **Главный скрипт** (полная настройка)
- `setup-ssh-keys.sh` - Только генерация ключей
- `setup-ssh-config.sh` - Только конфигурация SSH
- `setup-ssh-client-windows.bat` - Настройка клиента Windows

✅ **Документация:**
- `SSH_SETUP_README.md` - Полное руководство

## 🎯 Быстрый старт:

### 1. На сервере (209.97.149.137):
```bash
# Загрузите главный скрипт
wget https://raw.githubusercontent.com/your-repo/setup-ssh-complete.sh
chmod +x setup-ssh-complete.sh
sudo ./setup-ssh-complete.sh
```

### 2. На клиентской машине (Windows):
```cmd
# Запустите скрипт настройки
setup-ssh-client-windows.bat
```

### 3. Тест подключения:
```cmd
ssh fonana-server "echo 'SSH подключение успешно!'; whoami; hostname"
```

## 🔑 Что делают скрипты:

### `setup-ssh-complete.sh` (Главный):
- Обновляет систему
- Устанавливает пакеты (openssh-server, ufw, curl, wget, nano, htop)
- Настраивает файрвол (порты 22, 80, 443)
- Создает SSH ключи (ed25519)
- Настраивает authorized_keys
- Конфигурирует SSH сервис
- Перезапускает SSH сервис
- Тестирует подключение

### `setup-ssh-client-windows.bat`:
- Создает SSH ключ для клиента
- Настраивает SSH конфигурацию
- Показывает публичный ключ для копирования

## 🛠️ Команды для сервера:

```bash
# Проверка статуса SSH
systemctl status ssh

# Проверка конфигурации
sshd -t

# Просмотр логов
journalctl -u ssh -f

# Проверка файрвола
ufw status
```

## 🔒 Безопасность:

- ✅ Аутентификация по ключам включена
- ✅ Аутентификация по паролю отключена
- ✅ Файрвол настроен
- ✅ Строгие права доступа
- ✅ Ограничения сессий

## 📞 Если что-то не работает:

1. **Проверьте логи**: `journalctl -u ssh -f`
2. **Проверьте конфигурацию**: `sshd -t`
3. **Проверьте права**: `ls -la /root/.ssh/`
4. **Проверьте файрвол**: `ufw status`

---

**Готово к использованию!** 🎉
