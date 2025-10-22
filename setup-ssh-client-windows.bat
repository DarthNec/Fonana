@echo off
REM Скрипт для настройки SSH ключей на клиентской машине (Windows)
REM Автор: AI Assistant

echo 🔑 Настройка SSH ключей для подключения к серверу Fonana
echo ========================================================

REM Проверяем наличие SSH
where ssh >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] SSH не найден. Установите OpenSSH или Git for Windows
    pause
    exit /b 1
)

echo [INFO] SSH найден, продолжаем настройку...

REM Создаем директорию .ssh если не существует
if not exist "%USERPROFILE%\.ssh" (
    mkdir "%USERPROFILE%\.ssh"
    echo [INFO] Создана директория .ssh
)

REM Генерируем SSH ключ если не существует
if not exist "%USERPROFILE%\.ssh\id_ed25519_fonana" (
    echo [INFO] Генерация SSH ключа для Fonana...
    ssh-keygen -t ed25519 -f "%USERPROFILE%\.ssh\id_ed25519_fonana" -N "" -C "fonana-client-$(date /t)"
    echo [SUCCESS] SSH ключ создан
) else (
    echo [WARNING] SSH ключ уже существует
)

REM Показываем публичный ключ
echo.
echo [SUCCESS] Публичный ключ для добавления на сервер:
echo ================================================
type "%USERPROFILE%\.ssh\id_ed25519_fonana.pub"
echo ================================================

REM Создаем SSH конфигурацию
echo.
echo [INFO] Создание SSH конфигурации...

REM Проверяем существование config файла
if not exist "%USERPROFILE%\.ssh\config" (
    echo # SSH Configuration for Fonana > "%USERPROFILE%\.ssh\config"
    echo Host fonana-server >> "%USERPROFILE%\.ssh\config"
    echo     HostName 209.97.149.137 >> "%USERPROFILE%\.ssh\config"
    echo     User root >> "%USERPROFILE%\.ssh\config"
    echo     Port 22 >> "%USERPROFILE%\.ssh\config"
    echo     IdentityFile %USERPROFILE%\.ssh\id_ed25519_fonana >> "%USERPROFILE%\.ssh\config"
    echo     ServerAliveInterval 60 >> "%USERPROFILE%\.ssh\config"
    echo     ServerAliveCountMax 3 >> "%USERPROFILE%\.ssh\config"
    echo     TCPKeepAlive yes >> "%USERPROFILE%\.ssh\config"
    echo     Compression yes >> "%USERPROFILE%\.ssh\config"
    echo     StrictHostKeyChecking yes >> "%USERPROFILE%\.ssh\config"
    echo     UserKnownHostsFile %USERPROFILE%\.ssh\known_hosts >> "%USERPROFILE%\.ssh\config"
    echo [SUCCESS] SSH конфигурация создана
) else (
    echo [WARNING] SSH конфигурация уже существует
)

REM Устанавливаем права доступа
icacls "%USERPROFILE%\.ssh" /inheritance:r /grant:r "%USERNAME%:(OI)(CI)F" >nul 2>nul
icacls "%USERPROFILE%\.ssh\id_ed25519_fonana" /inheritance:r /grant:r "%USERNAME%:F" >nul 2>nul
icacls "%USERPROFILE%\.ssh\id_ed25519_fonana.pub" /inheritance:r /grant:r "%USERNAME%:F" >nul 2>nul
icacls "%USERPROFILE%\.ssh\config" /inheritance:r /grant:r "%USERNAME%:F" >nul 2>nul

echo.
echo [SUCCESS] Настройка SSH ключей завершена!
echo.
echo [INFO] Следующие шаги:
echo 1. Скопируйте публичный ключ выше на сервер
echo 2. Добавьте его в /root/.ssh/authorized_keys на сервере
echo 3. Протестируйте подключение: ssh fonana-server
echo.
echo [INFO] Файлы созданы:
echo - Приватный ключ: %USERPROFILE%\.ssh\id_ed25519_fonana
echo - Публичный ключ: %USERPROFILE%\.ssh\id_ed25519_fonana.pub
echo - Конфигурация: %USERPROFILE%\.ssh\config
echo.
echo [WARNING] ВАЖНО: Сохраните приватный ключ в безопасном месте!

pause
