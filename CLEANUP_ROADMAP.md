# 🧹 ПЛАН ОЧИСТКИ И РЕФАКТОРИНГА ПРОЕКТА FONANA

## 📊 Общая статистика
- **Рудиментарных файлов**: 48
- **Неиспользуемых компонентов**: 18
- **Дублирующихся скриптов**: 16
- **Костылей в коде**: ~30
- **Проблемных путей**: множество

## 📋 ЭТАПЫ ОЧИСТКИ

### ЭТАП 1: Удаление дублирующихся скриптов деплоя
**Оставляем**: `deploy-to-server.sh` (основной)

**Удаляем**:
- [ ] `clean-and-deploy.sh`
- [ ] `deploy-fonana.sh`
- [ ] `deploy-server.sh`
- [ ] `deploy.sh`
- [ ] `full-redeploy.sh`

### ЭТАП 2: Удаление скриптов исправлений
**Все удаляем** (проблемы уже решены):
- [ ] `fix-database.sh` ⚠️ (опасный - удаляет данные)
- [ ] `fix-file-paths.sh`
- [ ] `fix-local-permissions.sh`
- [ ] `fix-nginx-paths.sh`
- [ ] `fix-nginx-static-files.sh`
- [ ] `fix_server.sh`
- [ ] `quick-fix-nginx.sh`
- [ ] `server-complete-fix.sh`

### ЭТАП 3: Очистка конфигов nginx
**Оставляем**: `nginx-fonana-production.conf` (актуальный)

**Удаляем**:
- [ ] `nginx-fonana.conf`
- [ ] `nginx-fonana-clean.conf`
- [ ] `nginx-fonana-final.conf`
- [ ] `nginx-fonana-fixed-domain.conf`
- [ ] `nginx-fonana-fixed-paths.conf`
- [ ] `nginx-fonana-fixed.conf`
- [ ] `nginx-fonana-fonts-fixed.conf`
- [ ] `nginx-fonana-ssl-fix.conf`
- [ ] `nginx-fonana-static-fix.conf`

### ЭТАП 4: Удаление тестовых скриптов
**Все удаляем**:
- [ ] `check-server.sh`
- [ ] `server-full-checklist.sh`
- [ ] `scripts/check-and-clean-users.js`
- [ ] `scripts/check-dogwater-subscription.js`
- [ ] `scripts/check-posts-images.js`
- [ ] `scripts/check-real-users-subs.js`
- [ ] `scripts/check-russian-bio.js`
- [ ] `scripts/check-subscription-issues.js`
- [ ] `scripts/create-test-user-subscriptions.js`
- [ ] `scripts/test-post-creation.js`
- [ ] `scripts/test-subscription-logic.js`
- [ ] `scripts/test-subscription-system.js`
- [ ] `scripts/fix-dogwater-pal-subscription.js`
- [ ] `scripts/fix-null-nicknames.js`
- [ ] `scripts/fix-subscription-display.js`

### ЭТАП 5: Удаление неиспользуемых компонентов
**Проверить и удалить если точно не используются**:
- [ ] `components/AvatarFallback.tsx`
- [ ] `components/AvatarGenerator.tsx`
- [ ] `components/ClientOnly.tsx`
- [ ] `components/ContentCreator.tsx`
- [ ] `components/CreatorContentUpload.tsx`
- [ ] `components/CreatorPosts.tsx`
- [ ] `components/CreatorShowcase.tsx`
- [ ] `components/CreatorsFeed.tsx`
- [ ] `components/Features.tsx`
- [ ] `components/Footer.tsx`
- [ ] `components/Header.tsx`
- [ ] `components/Hero.tsx`
- [ ] `components/PaymentModal.tsx`
- [ ] `components/ProfileSetupModal.tsx`
- [ ] `components/SubscriptionNFTs.tsx`
- [ ] `components/TopicsCloud.tsx`
- [ ] `components/WalletBalance.tsx`
- [ ] `components/WalletButton.tsx`

### ЭТАП 6: Удаление прочих ненужных файлов
- [ ] `.env.backup`
- [ ] `fonana-fixed.tar.gz`
- [ ] `fonana-update.tar.gz`
- [ ] `install-postgresql-auto.sh`
- [ ] `install-postgresql.sh`
- [ ] `server-install.sh`
- [ ] `server-total-clean-install.sh`
- [ ] `update-database.sh`
- [ ] `update_server.sh`

### ЭТАП 7: Исправление костылей в коде
1. **Заменить все setTimeout(0)** (9 мест)
   - Найти причину и исправить правильно

2. **Убрать TypeScript any** (12 мест)
   - Добавить правильные типы

3. **Решить TODO/FIXME** (7 мест)
   - Либо исправить, либо удалить если неактуально

4. **Убрать @ts-ignore** (1 место)
   - Исправить типизацию

### ЭТАП 8: Стандартизация путей
1. **На сервере**:
   - Убрать символическую ссылку `current`
   - Определиться с единой структурой: `/var/www/fonana/public/`
   - Обновить скрипт деплоя

2. **В коде**:
   - Проверить все пути к `/avatars/` и `/backgrounds/`
   - Убедиться что используются относительные пути

### ЭТАП 9: Документация
1. **Создать**:
   - [ ] `.env.example` - пример переменных окружения
   - [ ] `DEPLOYMENT_GUIDE.md` - инструкция по деплою
   - [ ] `ARCHITECTURE.md` - архитектура проекта

2. **Обновить**:
   - [ ] `README.md` - актуальная информация
   - [ ] Удалить устаревшие инструкции

### ЭТАП 10: Финальная проверка
1. **Локально**:
   - [ ] Проект собирается без ошибок
   - [ ] Все функции работают

2. **На продакшне**:
   - [ ] Деплой проходит чисто
   - [ ] Нет 404 ошибок на изображения
   - [ ] Все пользователи могут войти

## 🎯 Результат
После выполнения всех этапов:
- Проект будет чистым и структурированным
- Не будет дублирующихся файлов
- Код будет без костылей
- Деплой будет простым и понятным
- Документация будет актуальной

## ⏱️ Оценка времени
- Этапы 1-6: ~30 минут (простое удаление)
- Этап 7: ~2 часа (рефакторинг кода)
- Этап 8: ~1 час (исправление путей)
- Этап 9: ~1 час (документация)
- Этап 10: ~30 минут (проверка)

**Итого**: ~5 часов на полную очистку 