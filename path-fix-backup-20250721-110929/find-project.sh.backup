#!/bin/bash

echo "🔍 Ищем проект Fonana на сервере..."

ssh -p 43988 root@fonana.me << 'ENDSSH'
echo "📂 Проверяем возможные директории:"
echo ""

# Проверяем стандартные директории
DIRS=(
    "/var/www/fonana"
    "/var/www/Fonana"
    "/root/fonana"
    "/root/Fonana"
    "/home/fonana"
    "/home/Fonana"
    "/opt/fonana"
    "/opt/Fonana"
)

for dir in "${DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ Найдена директория: $dir"
        if [ -d "$dir/.git" ]; then
            echo "   └─ Git репозиторий: ДА"
            cd "$dir"
            echo "   └─ Текущая ветка: $(git branch --show-current)"
            echo "   └─ Последний коммит: $(git log -1 --oneline)"
        else
            echo "   └─ Git репозиторий: НЕТ"
        fi
        
        if [ -f "$dir/package.json" ]; then
            echo "   └─ package.json: ДА"
        fi
        
        if [ -d "$dir/.next" ]; then
            echo "   └─ Собранное приложение: ДА"
        fi
        echo ""
    fi
done

# Ищем через PM2
echo "🔎 Проверяем PM2 процессы:"
pm2 list | grep -E "(fonana|Fonana)" || echo "Не найдено процессов fonana в PM2"
echo ""

# Проверяем где реально запущен процесс
echo "🔎 Ищем запущенные процессы Node.js:"
ps aux | grep -E "node.*fonana|node.*Fonana" | grep -v grep || echo "Не найдено запущенных процессов"
echo ""

# Проверяем systemd сервисы
echo "🔎 Проверяем systemd сервисы:"
systemctl list-units --type=service | grep -i fonana || echo "Не найдено systemd сервисов"
echo ""

# Ищем файлы проекта
echo "🔎 Поиск файлов проекта по всей системе (может занять время):"
find / -name "fonana" -type d 2>/dev/null | head -20
ENDSSH 