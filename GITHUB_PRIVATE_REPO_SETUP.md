# Работа с приватным GitHub репозиторием

## Для будущих AI-ассистентов

В начале чата укажите один из способов доступа:

### Способ 1: Personal Access Token (рекомендуется)
```
"Используй GitHub token: ghp_ваш_токен_здесь для репозитория https://github.com/DukeDeSouth/Fonana"
```

### Способ 2: Прямой деплой через SCP
```
"Деплой через SCP: сервер 69.10.59.234, порт 43988, путь /var/www/fonana"
```

## Настройка Deploy Key на сервере (одноразовая настройка)

### Шаг 1: Создать SSH ключ на сервере
```bash
ssh -p 43988 root@69.10.59.234
cd ~/.ssh
ssh-keygen -t ed25519 -C "fonana-deploy" -f fonana_deploy_key
# Нажмите Enter для пустого пароля
cat fonana_deploy_key.pub
```

### Шаг 2: Добавить ключ в GitHub
1. Откройте https://github.com/DukeDeSouth/Fonana/settings/keys
2. Нажмите "Add deploy key"
3. Название: "Fonana Production Server"
4. Вставьте содержимое fonana_deploy_key.pub
5. НЕ ставьте галочку "Allow write access" (только чтение)

### Шаг 3: Настроить Git на сервере
```bash
cd /var/www/fonana
git remote set-url origin git@github.com:DukeDeSouth/Fonana.git

# Настроить SSH для использования правильного ключа
cat >> ~/.ssh/config << EOF
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/fonana_deploy_key
  IdentitiesOnly yes
EOF

# Протестировать
ssh -T git@github.com
git pull origin main
```

## Создание Personal Access Token

1. Перейдите на https://github.com/settings/tokens
2. Generate new token (classic)
3. Название: "Fonana Development"
4. Выберите права:
   - `repo` - Full control of private repositories
5. Срок действия: выберите подходящий
6. Generate token
7. **ВАЖНО**: Скопируйте токен сразу, он больше не будет показан!

## Использование токена локально

```bash
# Вариант 1: В URL репозитория
git clone https://<TOKEN>@github.com/DukeDeSouth/Fonana.git

# Вариант 2: Глобальная настройка
git config --global url."https://<TOKEN>@github.com/".insteadOf "https://github.com/"

# Вариант 3: Через переменную окружения
export GITHUB_TOKEN=ghp_ваш_токен
git config --global url."https://${GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"
```

## Безопасность

1. **Никогда не коммитьте токены в код!**
2. Храните токены в менеджере паролей
3. Используйте разные токены для разработки и продакшена
4. Регулярно обновляйте токены
5. Ограничивайте права токенов минимально необходимыми

## Скрипт автоматического деплоя

Создайте файл `deploy.sh`:
```bash
#!/bin/bash
SERVER="root@69.10.59.234"
PORT="43988"
REMOTE_PATH="/var/www/fonana"

echo "🚀 Starting deployment..."

# Build locally
echo "📦 Building project..."
npm run build

# Copy files
echo "📤 Uploading files..."
rsync -avz -e "ssh -p $PORT" \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env.local' \
  --exclude '.next/cache' \
  ./ $SERVER:$REMOTE_PATH/

# Install deps and restart
echo "🔄 Restarting application..."
ssh -p $PORT $SERVER "cd $REMOTE_PATH && npm install --production && npm run build && pm2 restart fonana"

echo "✅ Deployment complete!"
```

Сделайте скрипт исполняемым: `chmod +x deploy.sh` 