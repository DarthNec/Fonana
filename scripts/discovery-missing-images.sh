#!/bin/bash

echo "🖼️ Searching for Missing Images"
echo "=============================="

MISSING_IMAGES=(
    "46df699c12de1061a5abf3f081413878.JPG"
    "7261f29f25bb07707f4510f8ee6ad231.JPG"
    "96f04989ac3a101a32d64f46f82438d6.png"
    "4f427d79954f4bdd6349622e0ee09be1.jpeg"
)

for img in "${MISSING_IMAGES[@]}"; do
    echo -e "\n📁 Searching for: $img"
    ssh fonana "find /var/www/Fonana -name '$img' 2>/dev/null"
    
    # Check if it exists with different case
    base_name="${img%.*}"
    echo "  Alternative search (case insensitive):"
    ssh fonana "find /var/www/Fonana -iname '*$base_name*' -type f 2>/dev/null | head -5"
done

echo -e "\n📊 Images Directory Statistics"
echo "==============================="
ssh fonana "ls -la /var/www/Fonana/public/posts/images/ | wc -l"
ssh fonana "du -sh /var/www/Fonana/public/posts/images/"

echo -e "\n📋 Latest Images in Directory"
echo "============================"
ssh fonana "ls -lt /var/www/Fonana/public/posts/images/ | head -10"

echo -e "\n🔍 Database Check for Missing Images"
echo "==================================="
ssh fonana "cd /var/www/Fonana && psql -U fonana_user -d fonana -h localhost -c \"SELECT id, mediaUrl FROM posts WHERE mediaUrl LIKE '%46df699c12de1061a5abf3f081413878%' OR mediaUrl LIKE '%7261f29f25bb07707f4510f8ee6ad231%' OR mediaUrl LIKE '%96f04989ac3a101a32d64f46f82438d6%' OR mediaUrl LIKE '%4f427d79954f4bdd6349622e0ee09be1%' LIMIT 10;\" 2>/dev/null" || echo "Database query failed"
