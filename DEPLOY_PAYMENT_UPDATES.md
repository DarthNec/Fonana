# Развертывание обновлений системы платежей

## Шаги для развертывания на сервере

### 1. Подключитесь к серверу
```bash
ssh root@fonana.me
```

### 2. Перейдите в директорию проекта
```bash
cd /var/www/fonana
```

### 3. Получите последние изменения
```bash
git pull origin main
```

### 4. Установите зависимости (если есть новые)
```bash
npm install
```

### 5. Примените миграцию базы данных
```bash
npx prisma migrate deploy
```

### 6. Сгенерируйте Prisma клиент
```bash
npx prisma generate
```

### 7. Пересоберите приложение
```bash
npm run build
```

### 8. Перезапустите приложение
```bash
pm2 restart fonana
```

## Проверка

После развертывания проверьте:

1. **Миграция БД применена**
   ```bash
   npx prisma migrate status
   ```

2. **Приложение работает**
   ```bash
   pm2 status fonana
   pm2 logs fonana --lines 50
   ```

3. **Новые функции доступны**
   - Перейдите на https://fonana.me/dashboard/referrals
   - Проверьте отображение статистики по заработку
   - Попробуйте купить платный пост (распределение средств)

## Откат в случае проблем

Если что-то пошло не так:

```bash
# Откатить код
git reset --hard HEAD~1
git pull origin main

# Пересобрать
npm run build

# Перезапустить
pm2 restart fonana
```

## Важные замечания

1. **Кошелек платформы**: Убедитесь, что в переменной окружения `NEXT_PUBLIC_PLATFORM_WALLET` указан правильный кошелек для получения комиссий платформы.

2. **RPC Solana**: Проверьте, что `NEXT_PUBLIC_SOLANA_RPC_HOST` указывает на работающий RPC endpoint.

3. **База данных**: Миграция добавляет новую таблицу `post_purchases` и обновляет enum `TransactionType`. Убедитесь, что миграция прошла успешно.

4. **Типы TypeScript**: После `npx prisma generate` могут потребоваться перезапуск TypeScript сервера в VSCode для обновления типов. 