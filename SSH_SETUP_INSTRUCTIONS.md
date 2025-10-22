# ИНСТРУКЦИЯ: Настройка SSH ключа на сервере Fonana

## 🎯 Цель
Настроить безарольный SSH доступ к серверу 64.20.37.222

## 📋 Пошаговая инструкция

### Шаг 1: Подключение к серверу
1. Откройте отдельный терминал (не в Cursor)
2. Выполните команду:
   ```bash
   ssh root@64.20.37.222
   ```
3. Введите пароль когда потребуется

### Шаг 2: Настройка SSH ключа на сервере
Выполните эти команды на сервере:

```bash
# Создать директорию SSH
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Добавить публичный ключ
echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIH203TA1liL4SjCAQV9B6oFZW/n/kjcPoLn461+xIlyq blitz@DarthNec' >> ~/.ssh/authorized_keys

# Установить права доступа
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh

# Проверить результат
ls -la ~/.ssh/
cat ~/.ssh/authorized_keys
```

### Шаг 3: Тестирование
После настройки на сервере, вернитесь к Cursor и выполните:

```powershell
ssh fonana-server "echo SSH key authentication successful"
```

## 🔧 Альтернативный способ

Если команды выше не работают, можете скопировать файл `setup-server-ssh.sh` на сервер и выполнить:

```bash
chmod +x setup-server-ssh.sh
./setup-server-ssh.sh
```

## ✅ Ожидаемый результат

После выполнения:
- SSH подключение будет работать без пароля
- Команда `ssh fonana-server` будет работать
- Терминал в Cursor не будет зависать

## 🆘 Если что-то не работает

1. Проверьте права доступа: `ls -la ~/.ssh/`
2. Проверьте содержимое: `cat ~/.ssh/authorized_keys`
3. Проверьте логи SSH: `tail -f /var/log/auth.log`

---

**Ваш публичный ключ:**
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIH203TA1liL4SjCAQV9B6oFZW/n/kjcPoLn461+xIlyq blitz@DarthNec
```

