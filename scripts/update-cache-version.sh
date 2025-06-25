#!/bin/bash

# Генерируем новую версию на основе timestamp
VERSION="v-$(date +%s)000"
TIMESTAMP="$(date +%s)000"

# Обновляем версию в force-refresh.js (совместимо с macOS и Linux)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/var currentVersion = 'v-[0-9]*'/var currentVersion = '$VERSION'/g" public/force-refresh.js
    sed -i '' "s/force-refresh.js?v=[0-9]*/force-refresh.js?v=$TIMESTAMP/g" app/layout.tsx
else
    # Linux
    sed -i "s/var currentVersion = 'v-[0-9]*'/var currentVersion = '$VERSION'/g" public/force-refresh.js
    sed -i "s/force-refresh.js?v=[0-9]*/force-refresh.js?v=$TIMESTAMP/g" app/layout.tsx
fi

echo "Cache version updated to: $VERSION" 