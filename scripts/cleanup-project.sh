#!/bin/bash

# Скрипт для очистки проекта от временных файлов
# Автор: Fonana Team
# Дата: 2025-06-18

echo "🧹 Starting project cleanup..."

# Проверяем, что мы в корневой директории проекта
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in project root directory!"
    exit 1
fi

# Создаем директорию для архивов если её нет
mkdir -p .cleanup-archive

# Текущая дата для архива
ARCHIVE_DATE=$(date +%Y%m%d_%H%M%S)
ARCHIVE_NAME=".cleanup-archive/cleanup_${ARCHIVE_DATE}.tar.gz"

echo "📦 Archiving temporary files to ${ARCHIVE_NAME}..."

# Список файлов для архивации и удаления
FILES_TO_ARCHIVE=$(find . -maxdepth 1 \( \
    -name "*.backup*" -o \
    -name "backup-*" -o \
    -name "*.sh" -o \
    -name "*.md" -o \
    -name "nginx-*.conf" -o \
    -name "*.sql" -o \
    -name "*.tar.gz" -o \
    -name "*.tsx.backup*" -o \
    -name "*.js.backup*" -o \
    -name "page.tsx" -o \
    -name "route.ts" -o \
    -name "CreatePostModal.tsx" -o \
    -name "current" \
\) ! -name "README.md" ! -name "setup-database.md" ! -name "setup-github-auth.md" ! -path "./scripts/*" -type f)

# Подсчитываем количество файлов
FILE_COUNT=$(echo "$FILES_TO_ARCHIVE" | grep -v '^$' | wc -l)

if [ $FILE_COUNT -eq 0 ]; then
    echo "✅ No temporary files found. Project is clean!"
    exit 0
fi

echo "📊 Found $FILE_COUNT temporary files"

# Архивируем файлы
tar -czf "$ARCHIVE_NAME" $FILES_TO_ARCHIVE 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Files archived successfully"
    
    # Удаляем файлы после успешной архивации
    echo "🗑️  Removing temporary files..."
    echo "$FILES_TO_ARCHIVE" | xargs rm -f
    
    echo "✅ Cleanup completed! Removed $FILE_COUNT files"
    echo "📁 Archive saved to: $ARCHIVE_NAME"
else
    echo "❌ Error creating archive. Files not removed."
    exit 1
fi

# Очистка старых архивов (оставляем только последние 5)
echo "🧹 Cleaning old archives..."
cd .cleanup-archive
ls -t cleanup_*.tar.gz 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null
cd ..

echo "✨ Project cleanup completed!" 