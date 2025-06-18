# Быстрый старт для AI ассистента

## Что сказать в начале нового чата:

### Вариант 1 (самый простой):
```
Проект Fonana, приватный GitHub репозиторий DukeDeSouth/Fonana
Деплой через SCP на сервер 69.10.59.234 порт 43988
Путь на сервере: /var/www/fonana
```

### Вариант 2 (если настроите GitHub token):
```
Проект Fonana, используй GitHub token: ghp_ваш_токен_здесь
Репозиторий: https://github.com/DukeDeSouth/Fonana
```

## Быстрый деплой

После внесения изменений просто запустите:
```bash
./deploy-to-production.sh
```

## Полезные команды

### Проверить статус на сервере:
```bash
ssh -p 43988 root@69.10.59.234 "pm2 status"
```

### Посмотреть логи:
```bash
ssh -p 43988 root@69.10.59.234 "pm2 logs fonana --lines 50"
```

### Быстрый рестарт:
```bash
ssh -p 43988 root@69.10.59.234 "pm2 restart fonana"
```

## Структура проекта для AI:
- Next.js 14 приложение
- База данных PostgreSQL с Prisma ORM
- Solana Web3 интеграция
- PM2 для управления процессом
- Nginx как reverse proxy 