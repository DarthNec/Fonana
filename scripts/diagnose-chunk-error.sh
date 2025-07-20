#!/bin/bash

echo "🔍 FONANA CHUNK LOAD ERROR DIAGNOSTICS"
echo "======================================"

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📍 Checking static chunks structure...${NC}"

# Проверяем структуру static chunks
CHUNK_PATHS=(
    "/var/www/Fonana/.next/static/chunks"
    "/var/www/Fonana/.next/standalone/.next/static/chunks"
)

for path in "${CHUNK_PATHS[@]}"; do
    if [ -d "$path" ]; then
        FILE_COUNT=$(ls -1 "$path" 2>/dev/null | wc -l)
        echo -e "${GREEN}✅ $path (файлов: $FILE_COUNT)${NC}"
        
        # Показываем последние файлы
        echo -e "${BLUE}   Последние 5 файлов:${NC}"
        ls -lt "$path" | head -6 | tail -5 | while read -r line; do
            echo -e "     $line"
        done
    else
        echo -e "${RED}❌ $path (не существует)${NC}"
    fi
done

echo -e "${YELLOW}📍 Searching for specific chunk 9487...${NC}"

# Ищем конкретный chunk, который вызывает ошибку
CHUNK_PATTERN="*9487*"
find /var/www/Fonana -name "$CHUNK_PATTERN" -type f 2>/dev/null | while read -r file; do
    if [ -f "$file" ]; then
        SIZE=$(ls -lh "$file" | awk '{print $5}')
        echo -e "${GREEN}✅ Found: $file ($SIZE)${NC}"
    fi
done

if [ -z "$(find /var/www/Fonana -name "$CHUNK_PATTERN" -type f 2>/dev/null)" ]; then
    echo -e "${RED}❌ Chunk 9487 not found anywhere${NC}"
fi

echo -e "${YELLOW}📍 Testing static file access via HTTP...${NC}"

# Тестируем доступность static files через HTTP
TEST_URLS=(
    "https://fonana.me/_next/static/chunks"
    "https://fonana.me/_next/static/chunks/9487-fab326537be7215a.js"
)

for url in "${TEST_URLS[@]}"; do
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}:%{content_type}" "$url")
    HTTP_CODE=$(echo "$RESPONSE" | cut -d':' -f1)
    CONTENT_TYPE=$(echo "$RESPONSE" | cut -d':' -f2)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ $url${NC}"
        echo -e "   Status: $HTTP_CODE, Content-Type: $CONTENT_TYPE"
    else
        echo -e "${RED}❌ $url${NC}"
        echo -e "   Status: $HTTP_CODE, Content-Type: $CONTENT_TYPE"
    fi
done

echo -e "${YELLOW}📍 Checking Nginx configuration for /_next/static/...${NC}"

# Проверяем Nginx конфигурацию
NGINX_CONFIG="/etc/nginx/sites-available/fonana"
if [ -f "$NGINX_CONFIG" ]; then
    echo -e "${BLUE}Nginx static file configuration:${NC}"
    grep -A 5 -B 5 "_next\|static" "$NGINX_CONFIG" 2>/dev/null || echo "No specific _next/static configuration found"
else
    echo -e "${RED}❌ Nginx config file not found: $NGINX_CONFIG${NC}"
fi

echo -e "${YELLOW}📍 Checking PM2 process and logs...${NC}"

# Проверяем PM2 и логи
pm2 list | grep fonana
echo ""

echo -e "${BLUE}Recent PM2 logs (last 10 lines):${NC}"
pm2 logs fonana-app --lines 10 --nostream 2>/dev/null || echo "No PM2 logs available"

echo -e "${YELLOW}📍 Checking build artifacts comparison...${NC}"

# Сравниваем build artifacts
SOURCE_CHUNKS="/var/www/Fonana/.next/static/chunks"
TARGET_CHUNKS="/var/www/Fonana/.next/standalone/.next/static/chunks"

if [ -d "$SOURCE_CHUNKS" ] && [ -d "$TARGET_CHUNKS" ]; then
    SOURCE_COUNT=$(ls -1 "$SOURCE_CHUNKS" 2>/dev/null | wc -l)
    TARGET_COUNT=$(ls -1 "$TARGET_CHUNKS" 2>/dev/null | wc -l)
    
    echo -e "${BLUE}Source chunks: $SOURCE_COUNT files${NC}"
    echo -e "${BLUE}Target chunks: $TARGET_COUNT files${NC}"
    
    if [ "$SOURCE_COUNT" -eq "$TARGET_COUNT" ]; then
        echo -e "${GREEN}✅ File counts match${NC}"
    else
        echo -e "${RED}❌ File count mismatch!${NC}"
        
        # Показываем различия
        echo -e "${YELLOW}Files in source but not in target:${NC}"
        comm -23 <(ls "$SOURCE_CHUNKS" | sort) <(ls "$TARGET_CHUNKS" | sort) | head -5
        
        echo -e "${YELLOW}Files in target but not in source:${NC}"  
        comm -13 <(ls "$SOURCE_CHUNKS" | sort) <(ls "$TARGET_CHUNKS" | sort) | head -5
    fi
fi

echo -e "${YELLOW}📍 Checking build IDs...${NC}"

# Проверяем build ID consistency
BUILD_ID_SOURCE=""
BUILD_ID_TARGET=""

if [ -f "/var/www/Fonana/.next/BUILD_ID" ]; then
    BUILD_ID_SOURCE=$(cat "/var/www/Fonana/.next/BUILD_ID")
    echo -e "${BLUE}Source BUILD_ID: $BUILD_ID_SOURCE${NC}"
fi

if [ -f "/var/www/Fonana/.next/standalone/.next/BUILD_ID" ]; then
    BUILD_ID_TARGET=$(cat "/var/www/Fonana/.next/standalone/.next/BUILD_ID")
    echo -e "${BLUE}Target BUILD_ID: $BUILD_ID_TARGET${NC}"
fi

if [ "$BUILD_ID_SOURCE" = "$BUILD_ID_TARGET" ] && [ ! -z "$BUILD_ID_SOURCE" ]; then
    echo -e "${GREEN}✅ Build IDs match${NC}"
else
    echo -e "${RED}❌ Build ID mismatch or missing!${NC}"
fi

echo -e "${YELLOW}📍 Recommendations...${NC}"

echo -e "${BLUE}Based on diagnostics:${NC}"
echo "1. If chunks are missing in standalone → Copy chunks manually"
echo "2. If HTTP 404 for chunks → Check Nginx routing"
echo "3. If build ID mismatch → Rebuild and redeploy"
echo "4. If MIME type wrong → Check Nginx mime.types"
echo "5. If all else fails → Consider Next.js downgrade to 13.3.4"

echo -e "${GREEN}🎉 DIAGNOSTICS COMPLETE!${NC}"
echo "==================================" 