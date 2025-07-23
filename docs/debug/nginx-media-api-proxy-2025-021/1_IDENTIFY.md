# 🔍 M7 PHASE 1: IDENTIFY - Nginx Media API Proxy Issue

**Дата создания:** 2025-01-21  
**Проблема:** Nginx не проксирует /api/media/ запросы к Next.js на production  
**Статус:** 🔴 КРИТИЧЕСКАЯ - блокирует Media API доступ

## 📋 ТОЧНОЕ ОПИСАНИЕ ПРОБЛЕМЫ

### 🎯 **Что НЕ работает:**
1. **Production API endpoints**: `https://fonana.me/api/media/*` возвращают 200 OK, но БЕЗ кастомных headers
2. **Отсутствуют headers**: `X-Has-Access`, `X-Should-Blur`, `X-Should-Dim`, `X-Upgrade-Prompt`
3. **Nginx отдает статику напрямую**: Запросы не доходят до Next.js API

### ✅ **Что работает:**
1. **Localhost API**: `http://localhost:3000/api/media/*` работает идеально с всеми headers
2. **Другие API**: `https://fonana.me/api/version` работает корректно
3. **PM2 приложение**: Next.js запущен и отвечает на :3000
4. **SSH доступ**: Настроен без passphrase

## 🔬 СОБРАННЫЕ ДОКАЗАТЕЛЬСТВА

### **Тест 1: Production API (FAIL)**
```bash
curl -I https://fonana.me/api/media/posts/images/0612cc5b000dcff7ed9879dbc86942cf.JPG
HTTP/1.1 200 OK
Server: nginx/1.18.0
Content-Type: image/jpeg
# ❌ НЕТ кастомных headers!
```

### **Тест 2: Localhost API (PASS)**
```bash
curl -I http://localhost:3000/api/media/posts/images/0612cc5b000dcff7ed9879dbc86942cf.JPG
HTTP/1.1 200 OK
X-Has-Access: true
X-Should-Blur: false
X-Access-Type: free
# ✅ ВСЕ headers присутствуют!
```

### **Тест 3: Другие API (PASS)**
```bash
curl -I https://fonana.me/api/version
HTTP/1.1 200 OK
# ✅ Проксируется корректно
```

## 🔍 КОНКРЕТНАЯ ПРОБЛЕМА

**Nginx НЕ проксирует `/api/media/` к Next.js, а отдает статические файлы напрямую**

### Возможные причины:
1. **Location блок порядок**: `/api/` location добавлен неправильно или перехватывается другими
2. **Regex location conflicts**: Старые regex блоки перехватывают .jpg/.webp файлы
3. **Static file priorities**: Nginx static обработка имеет приоритет над API proxy

## 📊 ВЛИЯНИЕ НА СИСТЕМУ

### 🔴 **Критические последствия:**
- **Нет access control**: Все файлы доступны без ограничений
- **Нет blur logic**: Restricted content показывается без размытия  
- **Нарушена безопасность**: Обход системы подписок и платежей

### 🎯 **Метрики для измерения успеха:**
- [ ] `X-Has-Access` header присутствует в production
- [ ] `X-Should-Blur` работает для restricted content
- [ ] Все `/api/media/` запросы проходят через Next.js
- [ ] Нет регрессии для других API endpoints

## 🚨 БЛОКЕРЫ

- **SSH настроен** ✅ 
- **PM2 запущен** ✅
- **API файлы на сервере** ✅
- **Готов к системному дебагу** ✅

---

**Следующий шаг:** DISCOVER phase - системное исследование Nginx конфигурации 