# 🏗️ ARCHITECTURE CONTEXT: Production Deployment Components

**Дата**: 2025-01-20  
**Статус**: 🔍 Полное картирование завершено  

## 🎯 КОРНЕВАЯ ПРИЧИНА НАЙДЕНА

**ГЛАВНАЯ ПРОБЛЕМА**: Standalone build запущен, но static files не скопированы и не служатся

## 📊 ТЕКУЩАЯ АРХИТЕКТУРА (СЛОМАННАЯ)

### 1. **Next.js Configuration**
```javascript
// /var/www/Fonana/next.config.js
output: 'standalone'  // ✅ Правильно настроен для production
```

### 2. **PM2 Process Manager**
```bash
# Реальный PM2 процесс:
script path: /var/www/Fonana/.next/standalone/server.js ✅
name: fonana-app
status: online

# Но ecosystem.config.js НЕ СООТВЕТСТВУЕТ:
args: 'npm run dev'  // ❌ Конфигурация для development
```

### 3. **Nginx Reverse Proxy**
```nginx
# /etc/nginx/sites-available/fonana
location / {
    proxy_pass http://127.0.0.1:3000;  // ✅ Правильный проксинг
}

# ❌ ОТСУТСТВУЕТ: location для /_next/static/
```

### 4. **Static Files Problem**
```bash
# Static files есть в основной папке:
/var/www/Fonana/.next/static/chunks/*.js ✅

# НО в standalone НЕТ:
/var/www/Fonana/.next/standalone/.next/static/ ❌

# Standalone server НЕ МОЖЕТ найти static files!
```

## 🔄 FLOW ДИАГРАММА (ТЕКУЩАЯ СЛОМАННАЯ)

```
Browser → HTTPS → Nginx → Proxy → Standalone Server
                                      ↓
                               Ищет static files в:
                               .next/standalone/.next/static/ ❌ НЕТ
                                      ↓
                               404 для всех /_next/static/*
```

## 🎭 КОНФЛИКТЫ КОНФИГУРАЦИЙ

### **Конфликт #1: PM2 vs Ecosystem.config.js**
```diff
- ecosystem.config.js: 'npm run dev' (development)
+ PM2 реально запущен: '.next/standalone/server.js' (production)
```

### **Конфликт #2: Static Files Location**
```diff
- Standalone server ожидает: .next/standalone/.next/static/
+ Файлы существуют в: .next/static/
```

### **Конфликт #3: Build Method vs Runtime**
```diff
- Выполняем: 'npm run build' (создает обычный build)
+ PM2 запускает: standalone server (ожидает standalone build)
```

## 🔍 АРХЕОЛОГИЯ: КТО ЭТО НАСТРОИЛ?

### **Признаки предыдущих deployment попыток:**
1. **next.config.js** с `output: 'standalone'` - кто-то знал что делает
2. **ecosystem.config.js** настроен на dev - возможно старая версия
3. **PM2 запущен вручную** с standalone server - быстрый фикс
4. **Nginx без static location** - незавершенная настройка

### **Возможный сценарий:**
1. Кто-то настроил standalone mode в next.config.js
2. Запустил build и PM2 вручную для тестирования
3. Забыл настроить static files serving
4. ecosystem.config.js остался старый

## 📁 ФАЙЛОВАЯ СТРУКТУРА DEPLOYMENT

```
/var/www/Fonana/
├── .next/
│   ├── static/chunks/*.js ✅ (есть, но не используется)
│   └── standalone/
│       ├── server.js ✅ (PM2 запускает это)
│       ├── .next/ ❌ (НЕТ static папки)
│       └── public/ ✅ (есть)
├── next.config.js ✅ (output: 'standalone')
├── ecosystem.config.js ❌ (устаревший, на dev)
└── package.json ✅
```

## 🔧 ЗАВИСИМОСТИ И ИНТЕГРАЦИИ

### **Внешние зависимости:**
- ✅ **PM2**: Работает корректно
- ✅ **Nginx**: Proxy работает
- ✅ **SSL/HTTPS**: Сертификаты работают
- ❌ **Static Files**: Главная проблема

### **Связанные системы:**
- ✅ **Database**: PostgreSQL работает
- ✅ **WebSocket Server**: Настроен отдельно
- ✅ **Domain/DNS**: fonana.me резолвится

## 🎯 ВАРИАНТЫ РЕШЕНИЯ

### **Вариант A: Доделать Standalone Setup** ⭐ (Рекомендуемый)
```bash
# 1. Копировать static files в standalone
cp -r .next/static .next/standalone/.next/

# 2. Обновить ecosystem.config.js для standalone
script: '.next/standalone/server.js'
```

### **Вариант B: Nginx Static Serving**
```nginx
# Добавить в nginx конфиг:
location /_next/static/ {
    alias /var/www/Fonana/.next/static/;
}
```

### **Вариант C: Переключиться на Normal Build**
```javascript
// next.config.js
// output: 'standalone' → убрать
// + обновить PM2 на 'npm start'
```

## ⚠️ РИСКИ

### **Критические риски:**
- 🔴 **Downtime**: Любые изменения PM2 = перезапуск
- 🔴 **SSL Breaking**: Неправильные nginx изменения
- 🔴 **Database Loss**: Если сломать окружение

### **Средние риски:**
- 🟡 **Cache Issues**: После изменения static serving
- 🟡 **Performance**: Неоптимальная настройка static files

## 📋 СЛЕДУЮЩИЕ ШАГИ

1. ✅ **DISCOVERY завершен**
2. ✅ **ARCHITECTURE завершен** 
3. 🔄 **ROOT CAUSE identified**: Static files не в standalone
4. 🔄 **SOLUTION PLAN**: Выбрать вариант A (доделать standalone)
5. 🔄 **IMPACT ANALYSIS**: Оценить риски каждого варианта

## 🚀 РЕКОМЕНДАЦИЯ

**Вариант A (Доделать Standalone)** - минимальный риск, максимальная совместимость с существующей настройкой.

---
**NEXT**: Создать SOLUTION_PLAN.md с детальным планом исправления 