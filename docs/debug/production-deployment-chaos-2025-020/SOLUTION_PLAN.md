# 📋 SOLUTION PLAN v1: Доведение Standalone Setup до Production-Ready

**Задача**: Исправить 404 ошибки static files в standalone deployment  
**Подход**: Минимальные изменения, максимальная совместимость  
**Дата**: 2025-01-20  

## 🎯 ЦЕЛЬ

Standalone server должен находить и служить static files корректно без изменения общей архитектуры.

## 📊 ТЕКУЩЕЕ VS ЦЕЛЕВОЕ СОСТОЯНИЕ

### Текущее (сломанное):
```bash
Browser → Nginx → Standalone Server → ищет static в .next/standalone/.next/static/ ❌
```

### Целевое (рабочее):
```bash
Browser → Nginx → Standalone Server → находит static в .next/standalone/.next/static/ ✅
```

## 🔧 ПОШАГОВЫЙ ПЛАН

### **Этап 1: Копирование Static Files** (5 минут)
```bash
# 1.1 Создать папку static в standalone
ssh root@64.20.37.222 'mkdir -p /var/www/Fonana/.next/standalone/.next'

# 1.2 Копировать все static files
ssh root@64.20.37.222 'cp -r /var/www/Fonana/.next/static /var/www/Fonana/.next/standalone/.next/'

# 1.3 Проверить что файлы скопированы
ssh root@64.20.37.222 'ls -la /var/www/Fonana/.next/standalone/.next/static/chunks/ | head -5'
```

### **Этап 2: Обновление Ecosystem Config** (3 минуты)
```javascript
// ecosystem.config.js - исправить конфигурацию
{
  name: 'fonana-app',
  script: '.next/standalone/server.js',  // ← исправлено
  cwd: '/var/www/Fonana',
  env: {
    NODE_ENV: 'production',
    PORT: 3000
  }
}
```

### **Этап 3: Перезапуск с Валидацией** (5 минут)
```bash
# 3.1 Остановить текущий процесс
pm2 stop fonana-app

# 3.2 Запустить с новой конфигурацией
pm2 start ecosystem.config.js

# 3.3 Проверить статус
pm2 status

# 3.4 Валидация через curl
curl -I http://localhost:3000/_next/static/chunks/[test-file].js
```

### **Этап 4: Playwright MCP Валидация** (3 минуты)
```javascript
// Автоматизированная проверка через browser
await browser_navigate('https://fonana.me');
const console_messages = await browser_console_messages();
// Ожидаем: 0 ошибок 404 для static files
```

### **Этап 5: Автоматизация Build Process** (опционально)
```bash
# Добавить в package.json script для автоматического копирования
"build:standalone": "next build && cp -r .next/static .next/standalone/.next/"
```

## ⚡ БЫСТРАЯ ВАЛИДАЦИЯ ПЛАН

### Pre-flight проверки:
- ✅ Standalone server запущен
- ✅ Static files существуют в основной папке
- ✅ Доступ к серверу по SSH есть
- ✅ PM2 управление работает

### Post-implementation проверки:
- ✅ Static files доступны по HTTP
- ✅ CSS и JS загружаются в браузере
- ✅ Нет console errors 404
- ✅ React компоненты рендерятся

## 🔄 АЛЬТЕРНАТИВНЫЕ ВАРИАНТЫ (если Plan A не сработает)

### **Plan B: Nginx Static Serving**
```nginx
location /_next/static/ {
    alias /var/www/Fonana/.next/static/;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### **Plan C: Symlink вместо Copy**
```bash
# Если копирование занимает много места
ln -s /var/www/Fonana/.next/static /var/www/Fonana/.next/standalone/.next/static
```

## ⚠️ ПРЕДУПРЕЖДЕНИЯ И ОГРАНИЧЕНИЯ

### **Критические точки:**
- 🔴 **PM2 restart = downtime** (~10-15 секунд)
- 🔴 **Disk space**: Static files дублируются
- 🟡 **Build process**: Нужно копировать после каждого build

### **Безопасные предположения:**
- ✅ Standalone server работает корректно
- ✅ Nginx конфигурация стабильна
- ✅ Database не затрагивается
- ✅ SSL сертификаты не меняются

## 📊 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ

### **Performance метрики:**
- **CSS load time**: 404 → ~100ms
- **JS chunks load time**: 404 → ~200ms
- **First Paint**: broken → ~800ms
- **Interactive Time**: broken → ~1.5s

### **Error reduction:**
- **Console errors**: 8+ → 0
- **Network failed requests**: 8+ → 0
- **Page functionality**: 0% → 100%

## 🚀 EXECUTION READINESS

### **Риск уровень**: 🟢 **НИЗКИЙ**
- Минимальные изменения
- Обратимые операции
- Проверенный подход

### **Время выполнения**: ~15 минут
- Этап 1: 5 мин
- Этап 2: 3 мин  
- Этап 3: 5 мин
- Этап 4: 2 мин

### **Recovery план** (если что-то пойдет не так):
```bash
# Откат к текущему состоянию:
pm2 stop fonana-app
pm2 start .next/standalone/server.js --name fonana-app
# Система вернется к текущему (сломанному но стабильному) состоянию
```

---
**NEXT**: Создать IMPACT_ANALYSIS.md для оценки рисков 