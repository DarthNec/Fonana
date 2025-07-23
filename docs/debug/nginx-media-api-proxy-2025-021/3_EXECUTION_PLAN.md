# 🎯 M7 PHASE 3: EXECUTION PLAN - Nginx Regex Priority Fix

**Дата:** 2025-01-21  
**Фаза:** EXECUTION PLAN - Точное решение проблемы  
**Корневая причина:** Regex location перехватывает /api/media/*.jpg

## 🔍 НАЙДЕННАЯ КОРНЕВАЯ ПРИЧИНА

### **❌ ПРОБЛЕМА: Nginx Location Priority**

```nginx
# 1. Prefix location (правильный)
location /api/ {
    proxy_pass http://localhost:3000;  # ✅ Настроен правильно
}

# 2. Regex location (ПЕРЕХВАТЫВАЕТ!)  
location /internal/ {
    location ~ \.(jpg|jpeg|png|gif|webp|svg|ico)$ {  # ❌ ВИНОВНИК!
        expires 1y;
        # Статическая обработка без proxy!
    }
}
```

### **🔬 Nginx Location Evaluation Order:**
1. **Exact match** (`=`)
2. **Longest prefix** (`/api/`)  
3. **Regex match** (`~`) ← **ПЕРЕХВАТЫВАЕТ ЗДЕСЬ!**
4. **Default prefix** (`/`)

**Результат:** `/api/media/file.jpg` → попадает в regex `\.(jpg)$` → статическая обработка без headers.

## 📋 РЕШЕНИЕ: 3 ВАРИАНТА

### **🥇 ВАРИАНТ 1: Исключение /api/ из regex (РЕКОМЕНДУЕМЫЙ)**

**Преимущества:**
- ✅ Минимальные изменения
- ✅ Сохраняет существующую логику
- ✅ Безопасно для других статических файлов

**Решение:**
```nginx
# Добавить negative lookahead в regex
location ~ ^(?!/api/).*\.(jpg|jpeg|png|gif|webp|svg|ico)$ {
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable" always;
}
```

### **🥈 ВАРИАНТ 2: Specific location для API (БЕЗОПАСНЫЙ)**

**Преимущества:**
- ✅ Максимальная безопасность
- ✅ Явное управление приоритетами
- ✅ Легко тестируется

**Решение:**
```nginx
# Добавить ПЕРЕД regex блоками
location ~ ^/api/media/.*\.(jpg|jpeg|png|gif|webp|svg|ico)$ {
    proxy_pass http://localhost:3000;
    # ... все proxy headers ...
}
```

### **🥉 ВАРИАНТ 3: Удаление regex (РАДИКАЛЬНЫЙ)**

**Недостатки:**
- ❌ Потеря кэширования для статических файлов
- ❌ Может повлиять на производительность

## 🎯 ВЫБРАННОЕ РЕШЕНИЕ: ВАРИАНТ 1

**Исключение /api/ из regex с negative lookahead**

### **Шаги выполнения:**

#### **1. Создать backup**
```bash
ssh fonana-prod 'cp /etc/nginx/sites-available/fonana /etc/nginx/sites-available/fonana.backup-regex-fix'
```

#### **2. Найти и заменить regex**
```bash
# Старый regex:
location ~ \.(jpg|jpeg|png|gif|webp|svg|ico)$ {

# Новый regex (исключает /api/):
location ~ ^(?!/api/).*\.(jpg|jpeg|png|gif|webp|svg|ico)$ {
```

#### **3. Тестировать и применить**
```bash
nginx -t && systemctl reload nginx
```

#### **4. Валидация**
```bash
curl -I https://fonana.me/api/media/posts/images/0612cc5b000dcff7ed9879dbc86942cf.JPG
# Ожидаем: X-Has-Access: true
```

## 🔬 ДЕТАЛЬНЫЙ ПЛАН ИМПЛЕМЕНТАЦИИ

### **Команда для замены regex:**
```bash
ssh fonana-prod '
sed -i "s|location ~ \\\\.(jpg|jpeg|png|gif|webp|svg|ico)\\$|location ~ ^(?!/api/).*\\\\.(jpg|jpeg|png|gif|webp|svg|ico)\\$|g" /etc/nginx/sites-available/fonana &&
nginx -t &&
systemctl reload nginx
'
```

### **Альтернативная команда (если sed сложный):**
```bash
# 1. Найти строку с regex
ssh fonana-prod 'grep -n "location.*jpg" /etc/nginx/sites-available/fonana'

# 2. Заменить вручную через vim/nano
ssh fonana-prod 'nano /etc/nginx/sites-available/fonana'
```

## ✅ КРИТЕРИИ УСПЕХА

1. **✅ API headers присутствуют:**
   ```bash
   curl -I https://fonana.me/api/media/posts/images/0612cc5b000dcff7ed9879dbc86942cf.JPG | grep "X-Has-Access"
   ```

2. **✅ Restricted content работает:**
   ```bash
   curl -I https://fonana.me/api/media/posts/images/thumb_4ebaa29d1704bd3c33e7e10b28a06ab0.webp | grep "X-Should-Blur"
   ```

3. **✅ Статические файлы кэшируются:**
   ```bash
   curl -I https://fonana.me/favicon.ico | grep "Cache-Control"
   ```

4. **✅ Нет регрессии других API:**
   ```bash
   curl -I https://fonana.me/api/version
   ```

## ⚠️ РИСКИ И МИТИГАЦИЯ

### **🟡 Риск: Negative lookahead не поддерживается**
- **Митигация:** Использовать ВАРИАНТ 2 (specific location)

### **🟡 Риск: Другие regex conflicts**
- **Митигация:** Проверить ВСЕ regex patterns до применения

### **🟢 Риск: Минимальный downtime**
- **Митигация:** `nginx -t` перед `reload`

---

**Следующий шаг:** ARCHITECTURE - Анализ влияния на систему 