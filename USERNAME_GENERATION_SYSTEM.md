# Система генерации английских имен пользователей

## Проблема
- Новые пользователи создавались без никнеймов
- Некоторые пользователи могли иметь русские имена/описания

## Решение

### 1. Модуль генерации имен (`lib/usernames.ts`)
Создан модуль для генерации забавных английских никнеймов:
- **Формат**: `[adjective][noun][number]`
- **Примеры**: `happysloth1234`, `electricraccoon6948`, `cosmicunicorn777`
- **Компоненты**:
  - 40+ прилагательных: happy, lazy, cosmic, neon, epic и т.д.
  - 40+ существительных: panda, dragon, ninja, trader, creator и т.д.
  - Случайное число от 0 до 9999

### 2. Генерация био
100 готовых английских описаний профиля с разнообразными темами:
- "Just vibing in the digital realm 🌟"
- "Creating magic one post at a time ✨"
- "Living my best decentralized life 🚀"
- "Professional overthinker, casual creator 🤔"
- "Building bridges in the digital divide 🌉"
- "Making the metaverse more meta 🌐"
- И еще 94 уникальных варианта!

### 3. Обновление API (`app/api/user/route.ts`)
При создании нового пользователя:
1. Генерируется уникальный никнейм
2. Проверяется уникальность в базе данных
3. Генерируется fullName на основе никнейма
4. Добавляется случайное био из 100 вариантов

### 4. Миграция существующих пользователей
Обновлены 3 пользователя без никнеймов:
- `electricraccoon6948` - "Turning ideas into reality in Web3 💡"
- `epicalpaca4533` - "Professional dreamer, amateur reality checker 🌙"
- `gigglydragon2978` - "Explorer of virtual worlds and NFT realms 🗺️"

## Результат
- Все новые пользователи автоматически получают забавные английские никнеймы
- Никнеймы уникальны и легко запоминаются
- Профили выглядят заполненными и дружелюбными
- Система полностью на английском языке
- 100 уникальных био обеспечивают разнообразие профилей 