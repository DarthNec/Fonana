# 🔍 DISCOVERY REPORT: Upload 413 Error After Standalone Fix

**Задача:** Исправить 413 ошибку при upload изображений  
**Дата:** 2025-01-23  
**Методология:** IDEAL M7  
**Триггер:** Появилась после удаления `output: 'standalone'` из next.config.js

## 📊 ПРОБЛЕМА

### 🚨 Симптомы из браузера:
```
POST https://fonana.me/api/posts/upload 413 (Request Entity Too Large)
Upload error: SyntaxError: Unexpected token '<', "<html><h"... is not valid JSON
[CreatePostModal] Post create error: Error: Failed to upload file
```

### 🔍 Context:
- **Когда появилось**: Сразу после исправления WebP проблемы
- **Что изменилось**: Убрали `output: 'standalone'` из next.config.js
- **User action**: Попытка загрузить изображение через CreatePostModal
- **Wallet state**: ✅ Корректный (connected: true, publicKey exists)
- **Upload state**: ✅ Правильно переключается (isUploading: true → false)

## 🎯 ROOT CAUSE ГИПОТЕЗЫ

### 🎯 **Гипотеза 1: Nginx client_max_body_size**
- **Описание**: Nginx блокирует большие файлы после изменений
- **Вероятность**: HIGH
- **Доказательства**: HTTP 413 - классическая Nginx ошибка для больших файлов
- **Проверка**: Посмотреть nginx config и логи

### 🎯 **Гипотеза 2: Next.js body size limits**  
- **Описание**: Удаление standalone mode изменило лимиты тела запроса
- **Вероятность**: MEDIUM
- **Доказательства**: HTML ошибка вместо JSON (Next.js error page)
- **Проверка**: Проверить Next.js API route конфигурацию

### 🎯 **Гипотеза 3: PM2 изменения**
- **Описание**: PM2 restart мог повлиять на memory/body limits
- **Вероятность**: LOW  
- **Доказательства**: Timing совпадает с PM2 restart
- **Проверка**: PM2 logs и конфигурация

### 🎯 **Гипотеза 4: Upload API route проблема**
- **Описание**: Сам API route поломался или не обрабатывает большие файлы
- **Вероятность**: MEDIUM
- **Доказательства**: `Failed to upload file` error
- **Проверка**: Тестировать API route напрямую

## 🧪 PLANNED INVESTIGATION

### Phase 1: Context7 Research
- [ ] Изучить Next.js body size configuration (Context7 MCP)
- [ ] Найти best practices для file upload в Next.js 14
- [ ] Проверить известные проблемы с standalone → standard переходом

### Phase 2: Server Infrastructure Analysis  
- [ ] Проверить Nginx client_max_body_size настройки
- [ ] Анализ Nginx error logs для 413 ошибок
- [ ] PM2 process limits и memory configuration
- [ ] Disk space и temporary file permissions

### Phase 3: Playwright MCP Upload Testing
- [ ] Автоматизировать upload процесс в браузере
- [ ] Тестировать разные размеры файлов
- [ ] Сравнить network requests до и после изменений
- [ ] Собрать точные error messages и headers

### Phase 4: API Route Investigation
- [ ] Проверить `/api/posts/upload/route.ts` код
- [ ] Тестировать API endpoint напрямую (curl)
- [ ] Проверить middleware и body parsing
- [ ] Валидировать file size limits в коде

## 📋 INVESTIGATION PLAN

### 🔍 **Step 1: Quick Nginx Check**
```bash
# Проверить nginx конфигурацию
ssh root@64.20.37.222 "nginx -T | grep client_max_body_size"
ssh root@64.20.37.222 "tail -50 /var/log/nginx/error.log | grep 413"
```

### 🔍 **Step 2: API Route Analysis**  
```bash
# Проверить upload route код
cat app/api/posts/upload/route.ts
# Тестировать малым файлом
curl -X POST https://fonana.me/api/posts/upload -F "file=@small_test.jpg"
```

### 🔍 **Step 3: File Size Testing**
- Протестировать upload файлов разных размеров
- Найти точный лимит где происходит 413 ошибка
- Сравнить с предыдущими работающими uploads

### 🔍 **Step 4: Server State Validation**
```bash
# PM2 процессы и memory usage
ssh root@64.20.37.222 "pm2 list && pm2 logs fonana-app --lines 20"
# Disk space 
ssh root@64.20.37.222 "df -h && du -sh /tmp"
```

## ⚠️ CRITICAL REQUIREMENTS

### 🚨 **Immediate Impact Assessment:**
- **User Experience**: BROKEN - пользователи не могут создавать посты с изображениями
- **Business Impact**: HIGH - core functionality сломана  
- **Timing**: Нужно исправить быстро, но систематично

### 🎯 **Success Criteria:**
- [ ] Upload работает для изображений ≤ 10MB
- [ ] Нет 413 ошибок в браузере
- [ ] API возвращает корректный JSON response  
- [ ] Не ломаем исправленную WebP functionality

### 🔄 **Rollback Strategy:**
```javascript
// Если проблема в standalone removal:
// Временно вернуть в next.config.js:
output: 'standalone',
// Но нужно будет решить WebP проблему по-другому
```

## 📊 EXPECTED FINDINGS

### 🎯 **Most Likely Causes:**
1. **Nginx client_max_body_size** слишком мал (например, 1MB по умолчанию)
2. **Next.js API route** не настроен для больших файлов
3. **Temporary file handling** проблемы после standalone removal

### 🎯 **Less Likely:**
- PM2 process limits изменились
- Disk space проблемы
- Network/proxy configuration changes

**Status:** 🔄 Ready to begin systematic investigation

---

**Next Phase:** Context7 research + Server analysis 