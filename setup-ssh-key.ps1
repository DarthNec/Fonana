# PowerShell скрипт для настройки SSH ключа на сервере Fonana
# Автоматизирует процесс передачи публичного ключа и настройки

Write-Host "=== Настройка SSH ключа для сервера Fonana ===" -ForegroundColor Green

# Путь к публичному ключу
$publicKeyPath = "C:\Users\blitz\.ssh\id_ed25519_fonana.pub"

# Проверить существование ключа
if (-not (Test-Path $publicKeyPath)) {
    Write-Host "Ошибка: Публичный ключ не найден по пути $publicKeyPath" -ForegroundColor Red
    exit 1
}

# Прочитать публичный ключ
$publicKey = Get-Content $publicKeyPath
Write-Host "Публичный ключ: $publicKey" -ForegroundColor Yellow

# Создать команды для выполнения на сервере
$serverCommands = @"
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo '$publicKey' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
ls -la ~/.ssh/
"@

Write-Host "=== Команды для выполнения на сервере ===" -ForegroundColor Cyan
Write-Host $serverCommands

Write-Host "`n=== Инструкции ===" -ForegroundColor Green
Write-Host "1. Подключитесь к серверу: ssh root@64.20.37.222" -ForegroundColor White
Write-Host "2. Выполните команды выше на сервере" -ForegroundColor White
Write-Host "3. Или скопируйте публичный ключ вручную:" -ForegroundColor White
Write-Host "   echo '$publicKey' >> ~/.ssh/authorized_keys" -ForegroundColor Gray
Write-Host "4. Установите права доступа:" -ForegroundColor White
Write-Host "   chmod 600 ~/.ssh/authorized_keys" -ForegroundColor Gray
Write-Host "   chmod 700 ~/.ssh" -ForegroundColor Gray

Write-Host "`n=== После настройки на сервере ===" -ForegroundColor Green
Write-Host "Тестирование подключения:" -ForegroundColor White
Write-Host "ssh fonana-server 'echo SSH key authentication successful'" -ForegroundColor Gray

Write-Host "`n=== Готово! ===" -ForegroundColor Green














































