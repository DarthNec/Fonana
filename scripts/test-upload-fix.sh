#!/bin/bash

echo "🧪 FONANA UPLOAD FIX TEST SCRIPT"
echo "================================="

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📍 Проверяем структуру папок для загрузки...${NC}"

PATHS=(
    "/var/www/Fonana/public/posts/images"
    "/var/www/Fonana/public/posts/videos" 
    "/var/www/Fonana/public/posts/audio"
    "/var/www/Fonana/.next/standalone/public/posts/images"
    "/var/www/Fonana/.next/standalone/public/posts/videos"
    "/var/www/Fonana/.next/standalone/public/posts/audio"
)

for path in "${PATHS[@]}"; do
    if [ -d "$path" ]; then
        FILE_COUNT=$(ls -1 "$path" 2>/dev/null | wc -l)
        echo -e "${GREEN}✅ $path (файлов: $FILE_COUNT)${NC}"
    else
        echo -e "${RED}❌ $path (не существует)${NC}"
        echo -e "${YELLOW}   Создаем папку...${NC}"
        mkdir -p "$path"
        if [ -d "$path" ]; then
            echo -e "${GREEN}   ✅ Папка создана${NC}"
        else
            echo -e "${RED}   ❌ Ошибка создания папки${NC}"
        fi
    fi
done

echo -e "${YELLOW}📍 Проверяем права доступа...${NC}"
for path in "${PATHS[@]}"; do
    if [ -d "$path" ]; then
        PERMS=$(ls -ld "$path" | awk '{print $1}')
        OWNER=$(ls -ld "$path" | awk '{print $3":"$4}')
        echo -e "${BLUE}📁 $path${NC}"
        echo -e "   Права: $PERMS, Владелец: $OWNER"
        
        # Проверяем возможность записи
        if [ -w "$path" ]; then
            echo -e "${GREEN}   ✅ Запись разрешена${NC}"
        else
            echo -e "${RED}   ❌ Нет прав на запись${NC}"
            echo -e "${YELLOW}   Исправляем права...${NC}"
            chmod 755 "$path"
            chown www-data:www-data "$path" 2>/dev/null || chown root:root "$path"
        fi
    fi
done

echo -e "${YELLOW}📍 Тестируем API endpoint загрузки...${NC}"
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS http://localhost:3000/api/posts/upload)
echo -e "API /api/posts/upload статус: $API_STATUS"

if [ "$API_STATUS" = "200" ] || [ "$API_STATUS" = "405" ]; then
    echo -e "${GREEN}✅ API endpoint доступен${NC}"
else
    echo -e "${RED}❌ API endpoint недоступен${NC}"
fi

echo -e "${YELLOW}📍 Проверяем placeholder файлы...${NC}"
PLACEHOLDER_FILES=(
    "/var/www/Fonana/.next/standalone/public/placeholder-image.png"
    "/var/www/Fonana/.next/standalone/public/placeholder-video-enhanced.png"
    "/var/www/Fonana/.next/standalone/public/placeholder-audio.png"
)

for file in "${PLACEHOLDER_FILES[@]}"; do
    if [ -f "$file" ]; then
        SIZE=$(ls -lh "$file" | awk '{print $5}')
        echo -e "${GREEN}✅ $(basename $file) ($SIZE)${NC}"
    else
        echo -e "${RED}❌ $(basename $file) (отсутствует)${NC}"
    fi
done

echo -e "${YELLOW}📍 Проверяем последние загруженные файлы...${NC}"
LATEST_FILES=$(find /var/www/Fonana/public/posts/images -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -5 | cut -d' ' -f2-)
if [ ! -z "$LATEST_FILES" ]; then
    echo -e "${BLUE}Последние 5 файлов:${NC}"
    echo "$LATEST_FILES" | while read file; do
        if [ -f "$file" ]; then
            SIZE=$(ls -lh "$file" | awk '{print $5}')
            BASENAME=$(basename "$file")
            echo -e "  📄 $BASENAME ($SIZE)"
        fi
    done
else
    echo -e "${YELLOW}⚠️ Нет загруженных файлов${NC}"
fi

echo -e "${YELLOW}📍 Проверяем проблемные посты из БД...${NC}"
echo "Проверяем посты Lafufu и BettyPoop..."

# Проверяем файлы из БД
FILES_TO_CHECK=(
    "/var/www/Fonana/public/posts/images/4f427d79954f4bdd6349622e0ee09be1.jpeg"
    "/var/www/Fonana/public/posts/images/96f04989ac3a101a32d64f46f82438d6.png"
    "/var/www/Fonana/public/posts/images/thumb_4f427d79954f4bdd6349622e0ee09be1.webp"
    "/var/www/Fonana/public/posts/images/thumb_96f04989ac3a101a32d64f46f82438d6.webp"
)

for file in "${FILES_TO_CHECK[@]}"; do
    if [ -f "$file" ]; then
        SIZE=$(ls -lh "$file" | awk '{print $5}')
        echo -e "${GREEN}✅ $(basename $file) ($SIZE)${NC}"
    else
        echo -e "${RED}❌ $(basename $file) (не найден)${NC}"
    fi
done

echo -e "${GREEN}🎉 ТЕСТ ЗАВЕРШЕН!${NC}"
echo "================================="
echo -e "${BLUE}Результат:${NC}"
echo "- Новый API использует путь: /var/www/Fonana/public/posts/images/"
echo "- Placeholder файлы проверены"
echo "- Права доступа к папкам проверены"
echo ""
echo -e "${YELLOW}Теперь можно тестировать загрузку изображений в постах!${NC}" 