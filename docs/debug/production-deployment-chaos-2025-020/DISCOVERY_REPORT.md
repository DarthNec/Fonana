# 🔍 DISCOVERY REPORT: Production Deployment Chaos Analysis

**Задача**: Понять почему production сайт сломан и как исправить без breaking changes  
**Дата**: 2025-01-20  
**Статус**: 🚨 КРИТИЧЕСКИЙ - сайт не работает  

## 🚨 КРИТИЧЕСКИЕ НАХОДКИ

### 1. **STANDALONE BUILD MODE АКТИВЕН**
```bash
# PM2 запускает standalone server
script path: /var/www/Fonana/.next/standalone/server.js

# Но статические файлы не служатся:
HTTP/1.1 404 Not Found для /_next/static/chunks/*.js
```

### 2. **ДВОЙНАЯ КОНФИГУРАЦИЯ NGINX**
```nginx
# Все запросы проксируются на localhost:3000
location / {
    proxy_pass http://127.0.0.1:3000;
}
# Нет отдельного serving для /_next/static/
```

### 3. **НЕСООТВЕТСТВИЕ BUILD МЕТОДА**
```bash
# Выполняли: npm run build (обычный build)
# PM2 ожидает: standalone build с отдельным static serving
```

## 📊 PLAYWRIGHT MCP НАХОДКИ

### Console Errors (критические):
- ❌ `Failed to load resource: 404` для CSS и JS chunks
- ❌ `Refused to execute script` - CSP блокирует
- ❌ `Refused to apply style` - MIME type ошибки

### Network Analysis:
- ✅ HTML страницы загружаются (200 OK)
- ❌ Все `/_next/static/*` ресурсы = 404
- ❌ JavaScript не загружается → React не работает

## 🔍 АНАЛИЗ СУЩЕСТВУЮЩИХ РЕШЕНИЙ

### A. **Локальное окружение** (работает):
- `npm run dev` - development server
- Serving через Next.js dev server на localhost:3000

### B. **Production на сервере** (сломано):
- PM2 → standalone server
- Nginx → proxy_pass к localhost:3000
- **ПРОБЛЕМА**: standalone не serves static files сам

### C. **Правильный production setup** (должно быть):
```bash
# Вариант 1: Standalone + Nginx static
standalone build + nginx serves /_next/static/

# Вариант 2: Normal build + PM2
npm run build + pm2 start npm -- start + nginx proxy

# Вариант 3: Standalone полный
standalone build + копирование static в nginx root
```

## 🔄 ВОЗМОЖНЫЕ ПРИЧИНЫ ХАОСА

1. **Кто-то ранее настроил standalone** без понимания архитектуры
2. **Смешали два подхода**: normal build команды + standalone PM2 config
3. **Отсутствие документации** по deployment процессу
4. **Быстрые фиксы без анализа** (как я только что делал 🤦‍♂️)

## ⚡ НЕМЕДЛЕННЫЕ НАХОДКИ (Playwright MCP)

### Homepage (https://fonana.me):
```yaml
Status: Загружается HTML, но без стилей/JS
Errors: 8+ failed resources (CSS, JS chunks)
Visual: Белая страница с базовым HTML
```

### Static Resources:
```bash
# Файлы существуют на сервере:
/var/www/Fonana/.next/static/chunks/3513-e74e0943a2287f8d.js ✅

# Но не доступны через HTTP:
curl http://localhost:3000/_next/static/chunks/3513-e74e0943a2287f8d.js → 404 ❌
```

## 🎯 КЛЮЧЕВЫЕ ВОПРОСЫ ДЛЯ РЕШЕНИЯ

1. **Кто и когда настраивал standalone mode?** 
2. **Есть ли next.config.js с output: 'standalone'?**
3. **Почему nginx не настроен для static files?**
4. **Какой был изначальный working deployment?**

## 📋 СЛЕДУЮЩИЕ ШАГИ (НЕ КОДИТЬ ЕЩЕ!)

1. ✅ **DISCOVERY завершен** - проблема идентифицирована
2. 🔄 **ARCHITECTURE_CONTEXT** - картирование всех компонентов
3. 🔄 **IDENTIFY root cause** - standalone vs normal build conflict
4. 🔄 **SOLUTION_PLAN** - план исправления без breaking changes

## 🚫 ЧТО НЕ ДЕЛАТЬ

- ❌ Не менять PM2 конфиг случайно
- ❌ Не трогать nginx без анализа
- ❌ Не делать `npm run build` пока не понимаем конфиг
- ❌ Не копировать файлы без понимания архитектуры

## ✅ ВЫВОДЫ

**ГЛАВНАЯ ПРОБЛЕМА**: Standalone server запущен, но не настроен для serving static files.  
**РЕШЕНИЕ НАПРАВЛЕНИЕ**: Либо доделать standalone setup, либо переключиться на normal build.  
**РИСК**: Любые изменения могут сломать рабочие части системы.

---
**NEXT**: Создать ARCHITECTURE_CONTEXT.md для полного картирования deployment 