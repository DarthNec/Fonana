#!/bin/bash

echo "🧪 Запускаем проверки перед деплоем оптимизации изображений..."

# Проверка 1: Тестируем локально что все работает
echo "1️⃣ Проверяем сборку проекта..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Ошибка сборки! Исправьте перед деплоем."
    exit 1
fi
echo "✅ Сборка успешна"

# Проверка 2: Проверяем что sharp установлен локально
echo "2️⃣ Проверяем установку sharp..."
if npm list sharp | grep -q "sharp@"; then
    echo "✅ Sharp установлен"
else
    echo "❌ Sharp не установлен!"
    exit 1
fi

# Проверка 3: Проверяем синтаксис TypeScript
echo "3️⃣ Проверяем TypeScript..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
    echo "❌ Ошибки TypeScript! Исправьте перед деплоем."
    exit 1
fi
echo "✅ TypeScript проверка пройдена"

# Проверка 4: Анализируем изменения
echo "4️⃣ Анализируем изменения..."
echo "Измененные файлы:"
git diff --name-only
echo ""

# Проверка 5: Проверяем критичные файлы
echo "5️⃣ Проверяем критичные изменения..."
CRITICAL_FILES=(
    "app/api/posts/route.ts"
    "app/api/posts/upload/route.ts"
    "components/PostCard.tsx"
)

for file in "${CRITICAL_FILES[@]}"; do
    if git diff --name-only | grep -q "$file"; then
        echo "⚠️  Изменен критичный файл: $file"
        echo "   Убедитесь в обратной совместимости!"
    fi
done

echo ""
echo "✅ Все проверки пройдены!"
echo ""
echo "📋 Контрольный список перед деплоем:"
echo "   [ ] Протестировали локально загрузку изображений"
echo "   [ ] Проверили отображение старых постов"
echo "   [ ] Убедились что OptimizedImage обрабатывает отсутствие preview"
echo "   [ ] Проверили что API возвращает корректные данные"
echo ""
echo "Если все проверено, запустите: ./scripts/deploy-image-optimization.sh" 