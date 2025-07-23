# 🔍 M7 PHASE 2: DISCOVER - Системное исследование Nginx

**Дата:** 2025-01-21  
**Фаза:** DISCOVER - Исследование корневых причин  
**Цель:** Найти ВСЕ возможные причины проблемы с Nginx proxy

## 🏗️ ТЕКУЩАЯ АРХИТЕКТУРА

### **Что мы знаем о настройке:**
1. **Next.js API**: Работает на localhost:3000  
2. **Nginx**: Должен проксировать к Next.js
3. **PM2**: Запущен и работает
4. **Location /api/**: Добавлен в конфиг, но не работает

## 🔍 СИСТЕМНОЕ ИССЛЕДОВАНИЕ

### **1. Проверим Nginx конфигурацию структурно**
```bash
ssh fonana-prod 'grep -n "location" /etc/nginx/sites-available/fonana'
```

**Результат:**
```
7:    location /api/ {
47:    location /internal/ {
76:    location / {
```

### **2. Анализ location блоков (КРИТИЧНО)**

**Location /api/ (строка 7):**
- ✅ Существует
- ✅ Добавлен ПЕРЕД location /
- ❓ Нужно проверить содержимое

**Location /internal/ (строка 47):**
- ⚠️ Может содержать regex перехватчики
- ❓ Проверить regex patterns для .jpg/.webp

**Location / (строка 76):**
- ⚠️ Может иметь try_files с статическими файлами
- ❓ Проверить приоритеты

### **3. Диагностические команды для выполнения**

#### **A. Проверить содержимое /api/ location:**
```bash
ssh fonana-prod 'sed -n "7,20p" /etc/nginx/sites-available/fonana'
```

#### **B. Проверить /internal/ location на regex:**
```bash
ssh fonana-prod 'sed -n "47,65p" /etc/nginx/sites-available/fonana'
```

#### **C. Проверить location / блок:**
```bash
ssh fonana-prod 'sed -n "76,95p" /etc/nginx/sites-available/fonana'
```

#### **D. Найти ВСЕ regex patterns:**
```bash
ssh fonana-prod 'grep -n "location.*~" /etc/nginx/sites-available/fonana'
```

#### **E. Проверить try_files директивы:**
```bash
ssh fonana-prod 'grep -n "try_files" /etc/nginx/sites-available/fonana'
```

## 🎯 ГИПОТЕЗЫ ДЛЯ ПРОВЕРКИ

### **Гипотеза 1: Location порядок проблема**
- **Возможно**: `/api/` внутри другого блока
- **Проверка**: Структурный анализ вложенности

### **Гипотеза 2: Regex location перехватывает**
- **Возможно**: `location ~ \.(jpg|jpeg|webp)$` перехватывает все .jpg
- **Проверка**: Поиск regex patterns

### **Гипотеза 3: try_files в location /**
- **Возможно**: `try_files $uri $uri/ =404` отдает статику до proxy
- **Проверка**: Анализ try_files директив

### **Гипотеза 4: Proxy_pass синтаксис**
- **Возможно**: Неправильный proxy_pass URL
- **Проверка**: Содержимое location /api/

### **Гипотеза 5: Nginx cache/modules**
- **Возможно**: Nginx модули или кэш мешают
- **Проверка**: nginx -V, активные модули

## 📊 ПЛАН ДИАГНОСТИКИ

### **Этап 1: Сбор данных (5 команд выше)**
### **Этап 2: Анализ конфигурации**
### **Этап 3: Проверка Nginx logs**
```bash
ssh fonana-prod 'tail -f /var/log/nginx/access.log /var/log/nginx/error.log'
```

### **Этап 4: Тест с curl + nginx logs одновременно**

## 🚨 ВАЖНЫЕ ВОПРОСЫ ДЛЯ ИССЛЕДОВАНИЯ

1. **Есть ли вложенные location блоки?**
2. **Какие regex patterns активны?**
3. **В каком порядке Nginx оценивает locations?**
4. **Есть ли try_files в location /?**
5. **Правильный ли proxy_pass URL?**

---

**Следующий шаг:** Выполнить диагностические команды и создать EXECUTION PLAN 