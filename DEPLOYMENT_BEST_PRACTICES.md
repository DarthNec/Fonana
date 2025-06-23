# Deployment Best Practices для Fonana

## 1. Предотвращение двойного запуска приложения

### Проблема
Иногда systemd service и PM2 могут запускать приложение одновременно на разных портах (3000 и 3001), что вызывает конфликты.

### Решение

#### A. Проверка перед деплоем
```bash
# Добавить в начало deploy-to-production.sh
echo "🔍 Checking for duplicate processes..."
ssh -p 43988 root@69.10.59.234 "ps aux | grep -E 'node|next' | grep -v grep | wc -l"
ssh -p 43988 root@69.10.59.234 "lsof -i :3000 -i :3001 | grep LISTEN"
```

#### B. Отключение systemd service навсегда
```bash
ssh -p 43988 root@69.10.59.234 "systemctl stop fonana.service && systemctl disable fonana.service && rm /etc/systemd/system/fonana.service"
```

#### C. Использование только PM2
```bash
# ecosystem.config.js должен содержать:
module.exports = {
  apps: [{
    name: 'fonana',
    script: 'npm',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

## 2. Автоматическое версионирование

### Добавление версии в футер
```bash
# В deploy-to-production.sh после git pull
VERSION=$(date +%Y%m%d-%H%M%S)
COMMIT=$(git rev-parse --short HEAD)
echo "export const APP_VERSION = '$VERSION-$COMMIT';" > lib/version.ts
```

### Отображение в футере
```typescript
// components/Footer.tsx
import { APP_VERSION } from '@/lib/version'

export function Footer() {
  return (
    <footer className="text-xs text-gray-500">
      v{APP_VERSION}
    </footer>
  )
}
```

## 3. Полный чеклист деплоя

1. **Перед деплоем:**
   - [ ] Проверить нет ли двойных процессов
   - [ ] Проверить статус PM2
   - [ ] Убедиться что systemd service отключен

2. **Во время деплоя:**
   - [ ] Остановить ВСЕ node процессы
   - [ ] Очистить кэш Next.js
   - [ ] Обновить версию
   - [ ] Запустить только через PM2

3. **После деплоя:**
   - [ ] Проверить что запущен только один процесс
   - [ ] Проверить логи на ошибки
   - [ ] Проверить доступность сайта

## Команды для диагностики

```bash
# Проверить все node процессы
ssh -p 43988 root@69.10.59.234 "ps aux | grep -E 'node|next' | grep -v grep"

# Проверить какие порты заняты
ssh -p 43988 root@69.10.59.234 "lsof -i :3000 -i :3001"

# Убить все node процессы
ssh -p 43988 root@69.10.59.234 "pkill -f node"

# Проверить systemd services
ssh -p 43988 root@69.10.59.234 "systemctl list-units --type=service | grep fonana"
``` 