# Скрипт для настройки SSH ключа на сервере Fonana
# Выполните эти команды на сервере после подключения

echo "=== Настройка SSH ключа на сервере Fonana ==="

# Проверить текущую директорию
pwd
whoami

# Создать директорию .ssh если её нет
echo "Создание директории .ssh..."
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Проверить существование authorized_keys
echo "Проверка существующих ключей..."
if [ -f ~/.ssh/authorized_keys ]; then
    echo "Файл authorized_keys уже существует"
    echo "Текущее содержимое:"
    cat ~/.ssh/authorized_keys
    echo ""
    echo "Добавляем новый ключ..."
else
    echo "Файл authorized_keys не существует, создаем новый"
fi

# Добавить публичный ключ
echo "Добавление публичного ключа..."
echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIH203TA1liL4SjCAQV9B6oFZW/n/kjcPoLn461+xIlyq blitz@DarthNec' >> ~/.ssh/authorized_keys

# Установить правильные права доступа
echo "Установка прав доступа..."
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh

# Проверить результат
echo "=== Проверка настройки ==="
echo "Содержимое директории .ssh:"
ls -la ~/.ssh/

echo ""
echo "Содержимое authorized_keys:"
cat ~/.ssh/authorized_keys

echo ""
echo "=== Настройка завершена ==="
echo "Теперь можно подключаться без пароля используя SSH ключ"
echo "Для тестирования выполните на локальном компьютере:"
echo "ssh fonana-server 'echo SSH key authentication successful'"













