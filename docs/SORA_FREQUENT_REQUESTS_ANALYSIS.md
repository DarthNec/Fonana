# АНАЛИЗ ПРОБЛЕМЫ: Sora-checker отправляет запросы каждую секунду

## 🔍 Анализ конфигурации

### Статус анализа:
**Дата**: 21 октября 2025  
**Проблема**: Sora-checker отправляет запросы каждую секунду вместо раз в минуту  
**Статус**: 🔍 **АНАЛИЗ ЗАВЕРШЕН**

---

## 📊 Результаты анализа

### **1. PM2 Конфигурация (ecosystem.config.js)**
```javascript
{
  name: 'sora-checker',
  script: './sorachecker.js',
  instances: 1,
  exec_mode: 'fork',
  cron_restart: '*/1 * * * *', // ✅ Запускается каждые 1 минуту
  autorestart: true,           // ❌ ПРОБЛЕМА: Автоперезапуск включен
  env_file: './.env',
  env: {
    NODE_ENV: 'production'
  }
}
```

### **2. Код sorachecker.js**
```javascript
// ✅ Скрипт выполняется ОДИН раз и завершается
async function main() {
  // Получает посты
  const posts = await getPendingAIVideoPosts()
  
  // Обрабатывает каждый пост
  for (const post of posts) {
    await processPost(post)
    // Задержка 1 секунда между постами
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  // ✅ Завершается с process.exit(0)
  process.exit(0)
}
```

---

## 🚨 НАЙДЕННАЯ ПРОБЛЕМА

### **Корневая причина: `autorestart: true`**

**Проблема**: В PM2 конфигурации включен `autorestart: true`, что означает:
- PM2 перезапускает процесс **каждый раз, когда он завершается**
- Скрипт `sorachecker.js` **завершается после выполнения** (`process.exit(0)`)
- PM2 **сразу же перезапускает** завершившийся процесс
- Результат: **бесконечный цикл перезапусков**

### **Логика работы:**
1. **Cron запускает** sora-checker каждую минуту
2. **Скрипт выполняется** и обрабатывает посты
3. **Скрипт завершается** с `process.exit(0)`
4. **PM2 видит завершение** и перезапускает процесс (`autorestart: true`)
5. **Новый процесс запускается** сразу же
6. **Цикл повторяется** каждую секунду

---

## 🔧 РЕШЕНИЕ ПРОБЛЕМЫ

### **Вариант 1: Отключить autorestart (РЕКОМЕНДУЕТСЯ)**
```javascript
{
  name: 'sora-checker',
  script: './sorachecker.js',
  instances: 1,
  exec_mode: 'fork',
  cron_restart: '*/1 * * * *',
  autorestart: false,  // ✅ Отключаем автоперезапуск
  env_file: './.env',
  env: {
    NODE_ENV: 'production'
  }
}
```

### **Вариант 2: Изменить логику скрипта**
```javascript
// Вместо process.exit(0) использовать бесконечный цикл
async function main() {
  while (true) {
    // Обработка постов
    await processPosts()
    
    // Ждем 1 минуту
    await new Promise(resolve => setTimeout(resolve, 60000))
  }
}
```

---

## 📋 Команды для исправления

### **На сервере:**
```bash
# 1. Остановить текущий процесс
pm2 stop sora-checker

# 2. Отредактировать ecosystem.config.js
# Изменить autorestart: true на autorestart: false

# 3. Перезапустить PM2
pm2 restart ecosystem.config.js

# 4. Проверить статус
pm2 status sora-checker

# 5. Проверить логи
pm2 logs sora-checker --lines 20
```

---

## 🎯 Ожидаемый результат

### **После исправления:**
- ✅ **Процесс запускается** только по cron (каждую минуту)
- ✅ **Процесс завершается** после обработки постов
- ✅ **PM2 НЕ перезапускает** завершившийся процесс
- ✅ **Запросы отправляются** только раз в минуту

### **Проверка:**
```bash
# Проверить время последнего запуска
pm2 show sora-checker

# Проверить логи - должны быть записи раз в минуту
pm2 logs sora-checker --lines 50
```

---

## 🔍 Дополнительная диагностика

### **Если проблема сохраняется:**
1. **Проверить другие процессы PM2** - возможно, есть дублирующие процессы
2. **Проверить cron задачи** системы - возможно, есть дополнительные cron задачи
3. **Проверить логи системы** - возможно, есть другие процессы, запускающие скрипт

### **Команды диагностики:**
```bash
# Проверить все процессы PM2
pm2 list

# Проверить cron задачи
crontab -l

# Проверить системные логи
tail -f /var/log/syslog | grep sora
```

---

<div align="center">
  <strong>🔧 Проблема найдена!</strong><br>
  <em>Нужно отключить autorestart в PM2 конфигурации</em>
</div>








































