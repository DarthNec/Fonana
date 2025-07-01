#!/bin/bash

# Генерируем новую версию на основе timestamp
VERSION="v-$(date +%s)000"
TIMESTAMP="$(date +%s)000"

# Обновляем версию в layout.tsx (убраны ссылки на force-refresh.js)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/force-refresh.js?v=[0-9]*/force-refresh.js?v=$TIMESTAMP/g" app/layout.tsx || true
    sed -i '' "s/force-update-sw.js?v=[0-9]*/force-update-sw.js?v=$TIMESTAMP/g" app/layout.tsx || true
else
    # Linux
    sed -i "s/force-refresh.js?v=[0-9]*/force-refresh.js?v=$TIMESTAMP/g" app/layout.tsx || true
    sed -i "s/force-update-sw.js?v=[0-9]*/force-update-sw.js?v=$TIMESTAMP/g" app/layout.tsx || true
fi

echo "Cache version updated to: $VERSION" 