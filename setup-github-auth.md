# Настройка GitHub аутентификации

## Способ 1: Personal Access Token (Рекомендуется)

1. Зайдите на GitHub.com
2. Нажмите на ваш аватар → Settings
3. Слева внизу выберите "Developer settings"
4. Выберите "Personal access tokens" → "Tokens (classic)"
5. Нажмите "Generate new token" → "Generate new token (classic)"
6. Дайте название токену: "Fonana Push"
7. Выберите срок действия (рекомендую 90 дней)
8. Отметьте права:
   - ✅ repo (полный доступ к репозиториям)
   - ✅ workflow (если планируете использовать GitHub Actions)
9. Нажмите "Generate token"
10. **ВАЖНО**: Скопируйте токен сразу! Он больше не покажется

### Использование токена:

Когда git попросит пароль при push, используйте:
- Username: DukeDeSouth
- Password: ВАШ_ТОКЕН (не пароль от GitHub!)

## Способ 2: SSH ключ

1. Проверьте, есть ли у вас SSH ключ:
```bash
ls -la ~/.ssh/id_*.pub
```

2. Если нет, создайте новый:
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

3. Добавьте ключ в ssh-agent:
```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

4. Скопируйте публичный ключ:
```bash
pbcopy < ~/.ssh/id_ed25519.pub
```

5. Добавьте на GitHub:
   - Settings → SSH and GPG keys → New SSH key
   - Вставьте скопированный ключ

6. Измените remote на SSH:
```bash
git remote set-url origin git@github.com:DukeDeSouth/Fonana.git
```

## Способ 3: GitHub CLI (gh)

1. Установите GitHub CLI:
```bash
brew install gh
```

2. Авторизуйтесь:
```bash
gh auth login
```

3. Следуйте инструкциям в терминале

После этого push будет работать автоматически! 