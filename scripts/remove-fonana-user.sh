#!/bin/bash

echo "🗑️  Удаление пользователя fonana с сервера"
echo "==========================================="

# Проверяем, что скрипт запущен от root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Этот скрипт должен быть запущен от root"
    exit 1
fi

# Проверяем существование пользователя
if ! id "fonana" &>/dev/null; then
    echo "✅ Пользователь fonana не найден (уже удален)"
    exit 0
fi

echo "👤 Информация о пользователе fonana:"
id fonana
echo ""

# Проверяем активные процессы пользователя
echo "🔍 Проверка активных процессов пользователя..."
PROCESSES=$(ps -u fonana -o pid= 2>/dev/null | wc -l)
if [ "$PROCESSES" -gt 0 ]; then
    echo "⚠️  Найдены активные процессы пользователя fonana:"
    ps -u fonana -o pid,cmd
    echo ""
    echo "Завершаем все процессы..."
    pkill -u fonana
    sleep 2
    pkill -9 -u fonana 2>/dev/null
fi

# Проверяем домашнюю директорию
if [ -d "/home/fonana" ]; then
    echo "📁 Домашняя директория: /home/fonana"
    echo "   Размер: $(du -sh /home/fonana 2>/dev/null | cut -f1)"
fi

# Проверяем записи в sudoers
echo ""
echo "🔐 Проверка sudo привилегий..."
if grep -q "fonana" /etc/sudoers 2>/dev/null; then
    echo "⚠️  Найдены записи в /etc/sudoers"
fi

if [ -f "/etc/sudoers.d/fonana" ]; then
    echo "⚠️  Найден файл /etc/sudoers.d/fonana"
fi

# Удаляем пользователя
echo ""
echo "🗑️  Удаление пользователя fonana..."

# Удаляем из sudoers если есть
if [ -f "/etc/sudoers.d/fonana" ]; then
    rm -f /etc/sudoers.d/fonana
    echo "✅ Удален файл /etc/sudoers.d/fonana"
fi

# Удаляем пользователя вместе с домашней директорией
userdel -r fonana 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Пользователь fonana успешно удален"
else
    echo "⚠️  Удаление пользователя с ошибкой, пробуем форсированное удаление..."
    userdel -f -r fonana 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ Пользователь fonana удален (форсированно)"
    else
        echo "❌ Не удалось удалить пользователя"
    fi
fi

# Дополнительная очистка
echo ""
echo "🧹 Дополнительная очистка..."

# Удаляем домашнюю директорию если осталась
if [ -d "/home/fonana" ]; then
    rm -rf /home/fonana
    echo "✅ Удалена домашняя директория /home/fonana"
fi

# Проверяем и чистим записи в файлах
for file in /etc/passwd /etc/shadow /etc/group /etc/gshadow; do
    if grep -q "fonana" "$file" 2>/dev/null; then
        echo "⚠️  Найдены записи в $file, очищаем..."
        sed -i '/fonana/d' "$file"
    fi
done

# Проверяем SSH ключи
if [ -d "/home/fonana/.ssh" ]; then
    rm -rf /home/fonana/.ssh
    echo "✅ Удалены SSH ключи"
fi

# Финальная проверка
echo ""
echo "📊 Финальная проверка:"
if id "fonana" &>/dev/null; then
    echo "❌ Пользователь fonana все еще существует!"
else
    echo "✅ Пользователь fonana полностью удален"
fi

if [ -d "/home/fonana" ]; then
    echo "❌ Домашняя директория все еще существует!"
else
    echo "✅ Домашняя директория удалена"
fi

echo ""
echo "✅ Очистка завершена!" 