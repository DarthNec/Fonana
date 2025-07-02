## 🧪 [Staging Debug для React Error #185: sourcemap + isolated build]

### Контекст
Ошибка React #185 ("Invalid hook call") стабильно воспроизводится на проде. Стандартная отладка невозможна, так как в прод-билде код минифицирован. Для точной локализации требуется staging-окружение с sourcemaps.

---

### Цель
Создать отдельный staging-билд с читаемыми stack trace, без влияния на production.

---

### Шаги

#### 1. Создать ветку staging
```bash
git checkout -b staging-debug
```

#### 2. Включить sourcemaps в `next.config.js`
Добавить:
```js
productionBrowserSourceMaps: true
```

#### 3. Установить staging-флаг
В `.env.production.local` или `.env.staging`:
```env
NEXT_PUBLIC_NODE_ENV=staging
```

#### 4. Собрать staging-билд
```bash
npm run build
```

---

#### 5. PM2 конфигурация

Создать файл `ecosystem.staging.config.js`:

```js
module.exports = {
  apps: [
    {
      name: 'fonana-debug',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3011',
      cwd: '/var/www/fonana',
      env: {
        NODE_ENV: 'production',
        PORT: 3011
      }
    }
  ]
}
```

#### 6. Запустить staging на сервере
```bash
ssh -p 43988 root@69.10.59.234

# В папке /var/www/fonana
pm2 start ecosystem.staging.config.js
pm2 save
```

#### 7. Прокинуть порт (временно) или открыть напрямую:
```bash
curl http://localhost:3011
# Или проксировать через nginx на /staging
```

---

### Проверка
- Открыть `http://<сервер>:3011`
- Включить DevTools → Console → Ошибка React #185 теперь должна содержать путь и строку
- Локализовать баг

---

### Завершение
После фикса:
```bash
pm2 stop fonana-debug
pm2 delete fonana-debug
```

---

### Критерии успеха

✅ Ошибка #185 теперь показывает читаемый stack trace  
✅ Отладка компонента возможна  
✅ Продакшн не затронут  
✅ После фикса staging можно удалить без побочных эффектов