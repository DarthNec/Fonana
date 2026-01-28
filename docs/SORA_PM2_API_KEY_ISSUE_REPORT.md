# ОТЧЕТ О ПРОБЛЕМЕ С ЗАПУСКОМ SORA В PM2

## 🚨 Обнаруженная проблема

### Статус анализа:
**Дата**: 21 октября 2025  
**Проблема**: Sora-checker не запускается в PM2 из-за отсутствия API ключа  
**Статус**: ❌ **КРИТИЧЕСКАЯ ПРОБЛЕМА**

---

## 🔍 Анализ проблемы

### **1. Корневая причина**
**Отсутствует переменная окружения `NEXT_PUBLIC_OPENAI_API_KEY`**

### **2. Места использования API ключа в sorachecker.js**
```javascript
// Строка 13: Получение API ключа из переменных окружения
const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY

// Строка 64: Использование в запросе статуса видео
'Authorization': `Bearer ${OPENAI_API_KEY}`

// Строка 88: Использование в запросе контента видео
'Authorization': `Bearer ${OPENAI_API_KEY}`

// Строка 200: Использование в запросе статуса видео
'Authorization': `Bearer ${OPENAI_API_KEY}`
```

### **3. Конфигурация PM2**
```javascript
// ecosystem.config.js - строка 47
env_file: './.env',  // PM2 читает переменные из .env файла

// ecosystem.config.js - строки 48-50
env: {
  NODE_ENV: 'production'
  // НЕТ NEXT_PUBLIC_OPENAI_API_KEY!
}
```

---

## 📊 Детальный анализ

### **Проблема 1: Отсутствует переменная в .env**
- **Файл**: `.env` (не существует)
- **Требуется**: `NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here`
- **Статус**: ❌ **ОТСУТСТВУЕТ**

### **Проблема 2: Отсутствует переменная в env.example**
- **Файл**: `env.example`
- **Проблема**: Нет примера переменной `NEXT_PUBLIC_OPENAI_API_KEY`
- **Статус**: ❌ **НЕ ДОКУМЕНТИРОВАНО**

### **Проблема 3: PM2 конфигурация не содержит API ключ**
- **Файл**: `ecosystem.config.js`
- **Проблема**: В секции `env` нет `NEXT_PUBLIC_OPENAI_API_KEY`
- **Статус**: ❌ **НЕ НАСТРОЕНО**

---

## 🎯 Решение проблемы

### **Шаг 1: Создать файл .env**
```bash
# Создать файл .env в корне проекта
touch .env
```

### **Шаг 2: Добавить переменную в .env**
```env
# OpenAI API Configuration
NEXT_PUBLIC_OPENAI_API_KEY=your_actual_openai_api_key_here
```

### **Шаг 3: Обновить env.example**
```env
# OpenAI API Configuration
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
```

### **Шаг 4: Обновить PM2 конфигурацию (опционально)**
```javascript
// ecosystem.config.js
env: {
  NODE_ENV: 'production',
  NEXT_PUBLIC_OPENAI_API_KEY: process.env.NEXT_PUBLIC_OPENAI_API_KEY
}
```

---

## 🔧 Команды для исправления

### **На сервере:**
```bash
# 1. Создать файл .env
cd /var/www/Fonana
touch .env

# 2. Добавить API ключ в .env
echo "NEXT_PUBLIC_OPENAI_API_KEY=your_actual_api_key" >> .env

# 3. Перезапустить PM2
pm2 restart sora-checker

# 4. Проверить логи
pm2 logs sora-checker --lines 20
```

### **Проверка статуса:**
```bash
# Проверить статус PM2 процессов
pm2 status

# Проверить переменные окружения для sora-checker
pm2 show sora-checker
```

---

## 📋 Чек-лист исправления

### **Обязательные действия:**
- [ ] **Создать файл `.env`** в корне проекта
- [ ] **Добавить `NEXT_PUBLIC_OPENAI_API_KEY`** в .env файл
- [ ] **Обновить `env.example`** с примером переменной
- [ ] **Перезапустить PM2 процесс** sora-checker
- [ ] **Проверить логи** на отсутствие ошибок

### **Рекомендуемые действия:**
- [ ] **Обновить `ecosystem.config.js`** для явного указания переменной
- [ ] **Добавить валидацию** API ключа в sorachecker.js
- [ ] **Создать документацию** по настройке переменных окружения

---

## 🚨 Критические моменты

### **1. Безопасность**
- **НЕ коммитить** файл `.env` в Git
- **Использовать** реальный API ключ OpenAI
- **Проверить** права доступа к файлу .env

### **2. Производительность**
- **API ключ должен быть валидным** для работы с OpenAI API
- **Проверить лимиты** API ключа
- **Мониторить** использование API

### **3. Мониторинг**
- **Настроить логирование** ошибок API
- **Мониторить** статус PM2 процессов
- **Отслеживать** использование API ключа

---

## 📊 Ожидаемый результат

### **После исправления:**
- ✅ **PM2 процесс sora-checker запустится** без ошибок
- ✅ **API запросы к OpenAI** будут работать
- ✅ **Генерация видео** будет функционировать
- ✅ **Логи не будут содержать** ошибок с API ключом

### **Проверка успешности:**
```bash
# Проверить статус процесса
pm2 status sora-checker

# Проверить логи
pm2 logs sora-checker --lines 10

# Ожидаемый результат: нет ошибок с API ключом
```

---

<div align="center">
  <strong>🔧 Проблема идентифицирована!</strong><br>
  <em>Требуется создание файла .env с API ключом OpenAI</em>
</div>






















































