#!/bin/bash

echo "🚨 EMERGENCY CHUNK LOAD ERROR FIX"
echo "=================================="

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📍 Step 1: Checking current status...${NC}"

cd /var/www/Fonana

# Проверяем текущее состояние
if [ -d ".next/static/chunks" ]; then
    SOURCE_COUNT=$(ls -1 .next/static/chunks/ | wc -l)
    echo -e "${GREEN}✅ Source chunks found: $SOURCE_COUNT files${NC}"
else
    echo -e "${RED}❌ Source chunks directory not found!${NC}"
    exit 1
fi

if [ -d ".next/standalone/.next/static/chunks" ]; then
    TARGET_COUNT=$(ls -1 .next/standalone/.next/static/chunks/ | wc -l)
    echo -e "${YELLOW}⚠️ Target chunks already exist: $TARGET_COUNT files${NC}"
else
    echo -e "${BLUE}📁 Target chunks directory missing - will create${NC}"
fi

echo -e "${YELLOW}📍 Step 2: Creating target directory...${NC}"

# Создаем директорию для chunks в standalone
mkdir -p .next/standalone/.next/static/chunks
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Target directory created${NC}"
else
    echo -e "${RED}❌ Failed to create target directory${NC}"
    exit 1
fi

echo -e "${YELLOW}📍 Step 3: Copying chunks...${NC}"

# Копируем все chunks
cp -r .next/static/chunks/* .next/standalone/.next/static/chunks/
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Chunks copied successfully${NC}"
else
    echo -e "${RED}❌ Failed to copy chunks${NC}"
    exit 1
fi

echo -e "${YELLOW}📍 Step 4: Verifying copy...${NC}"

# Проверяем результат копирования
COPIED_COUNT=$(ls -1 .next/standalone/.next/static/chunks/ | wc -l)
echo -e "${BLUE}Copied chunks count: $COPIED_COUNT${NC}"

if [ "$SOURCE_COUNT" -eq "$COPIED_COUNT" ]; then
    echo -e "${GREEN}✅ All chunks copied successfully${NC}"
else
    echo -e "${RED}❌ Chunk count mismatch! Source: $SOURCE_COUNT, Copied: $COPIED_COUNT${NC}"
fi

# Проверяем конкретный проблемный chunk
PROBLEM_CHUNK="9487-fab326537be7215a.js"
if [ -f ".next/standalone/.next/static/chunks/$PROBLEM_CHUNK" ]; then
    SIZE=$(ls -lh ".next/standalone/.next/static/chunks/$PROBLEM_CHUNK" | awk '{print $5}')
    echo -e "${GREEN}✅ Problem chunk $PROBLEM_CHUNK copied ($SIZE)${NC}"
else
    echo -e "${RED}❌ Problem chunk $PROBLEM_CHUNK NOT found!${NC}"
fi

echo -e "${YELLOW}📍 Step 5: Setting permissions...${NC}"

# Устанавливаем правильные права доступа
chmod -R 644 .next/standalone/.next/static/chunks/
chown -R root:root .next/standalone/.next/static/chunks/
echo -e "${GREEN}✅ Permissions set${NC}"

echo -e "${YELLOW}📍 Step 6: Testing HTTP access...${NC}"

# Тестируем доступность через HTTP
echo -e "${BLUE}Testing chunk availability...${NC}"
TEST_URL="https://fonana.me/_next/static/chunks/$PROBLEM_CHUNK"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}:%{content_type}" "$TEST_URL")
HTTP_CODE=$(echo "$RESPONSE" | cut -d':' -f1)
CONTENT_TYPE=$(echo "$RESPONSE" | cut -d':' -f2)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ HTTP Test: $TEST_URL${NC}"
    echo -e "${GREEN}   Status: $HTTP_CODE, Content-Type: $CONTENT_TYPE${NC}"
else
    echo -e "${RED}❌ HTTP Test: $TEST_URL${NC}"
    echo -e "${RED}   Status: $HTTP_CODE, Content-Type: $CONTENT_TYPE${NC}"
    echo -e "${YELLOW}   This might be normal - PM2 needs restart${NC}"
fi

echo -e "${YELLOW}📍 Step 7: Restarting PM2...${NC}"

# Перезапускаем PM2 для обновления static file routing
pm2 restart fonana-app
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ PM2 restarted${NC}"
else
    echo -e "${RED}❌ PM2 restart failed${NC}"
    exit 1
fi

echo -e "${YELLOW}📍 Step 8: Final verification...${NC}"

# Ждем немного и тестируем снова
sleep 3

FINAL_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}:%{content_type}" "$TEST_URL")
FINAL_HTTP_CODE=$(echo "$FINAL_RESPONSE" | cut -d':' -f1)
FINAL_CONTENT_TYPE=$(echo "$FINAL_RESPONSE" | cut -d':' -f2)

echo -e "${BLUE}Final HTTP test results:${NC}"
echo -e "URL: $TEST_URL"
echo -e "Status: $FINAL_HTTP_CODE"
echo -e "Content-Type: $FINAL_CONTENT_TYPE"

if [ "$FINAL_HTTP_CODE" = "200" ] && [[ "$FINAL_CONTENT_TYPE" == *"javascript"* ]]; then
    echo -e "${GREEN}🎉 SUCCESS! Chunk load error should be fixed!${NC}"
    echo -e "${GREEN}✅ Status: $FINAL_HTTP_CODE${NC}"
    echo -e "${GREEN}✅ Content-Type: $FINAL_CONTENT_TYPE${NC}"
elif [ "$FINAL_HTTP_CODE" = "200" ]; then
    echo -e "${YELLOW}⚠️ PARTIAL SUCCESS: File loads but content-type might be wrong${NC}"
    echo -e "${YELLOW}   Status: $FINAL_HTTP_CODE${NC}"
    echo -e "${YELLOW}   Content-Type: $FINAL_CONTENT_TYPE${NC}"
    echo -e "${YELLOW}   This should still fix the ChunkLoadError${NC}"
else
    echo -e "${RED}❌ FAILED: File still not accessible${NC}"
    echo -e "${RED}   Status: $FINAL_HTTP_CODE${NC}"
    echo -e "${RED}   Content-Type: $FINAL_CONTENT_TYPE${NC}"
    echo -e "${YELLOW}   May need Nginx configuration or additional troubleshooting${NC}"
fi

echo -e "${BLUE}📊 Summary:${NC}"
echo -e "- Source chunks: $SOURCE_COUNT files"
echo -e "- Copied chunks: $COPIED_COUNT files"
echo -e "- Final HTTP status: $FINAL_HTTP_CODE"
echo -e "- Final content-type: $FINAL_CONTENT_TYPE"

echo ""
echo -e "${GREEN}🚨 EMERGENCY FIX COMPLETED!${NC}"
echo "=================================="
echo -e "${BLUE}Next steps:${NC}"
echo "1. Test website - click on placeholder images"
echo "2. Check browser console for ChunkLoadError"
echo "3. If still issues, may need Nginx configuration"
echo ""
echo -e "${YELLOW}For permanent fix, update build process to copy chunks automatically${NC}" 