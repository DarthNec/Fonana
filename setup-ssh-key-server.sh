# Скрипт для настройки SSH ключа на сервере Fonana
# Этот скрипт нужно выполнить на сервере после передачи публичного ключа

echo "=== Настройка SSH ключа на сервере Fonana ==="

# Создать директорию .ssh если её нет
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Добавить публичный ключ в authorized_keys
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIH203TA1liL4SjCAQV9B6oFZW/n/kjcPoLn461+xIlyq blitz@DarthNec" >> ~/.ssh/authorized_keys

# Установить правильные права доступа
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh

# Проверить результат
echo "=== Проверка настройки ==="
ls -la ~/.ssh/
echo "=== Содержимое authorized_keys ==="
cat ~/.ssh/authorized_keys

echo "=== Настройка завершена ==="
echo "Теперь можно подключаться без пароля используя SSH ключ"


















































