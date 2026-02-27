# Metrics Table Migration

**Date**: 19.02.2026  
**Purpose**: Отслеживание создания гостевых пользователей с полной аналитикой

---

## 📊 Что добавляет эта миграция:

### **Новая таблица: `metrics`**

Хранит информацию о каждом созданном гостевом пользователе:

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | TEXT | Primary key (cuid) |
| `userId` | TEXT | ID созданного пользователя (nullable) |
| `nickname` | TEXT | Никнейм пользователя |
| `deviceId` | TEXT | Device ID |
| `wallet` | TEXT | Fake wallet (FK_...) |
| `location` | TEXT | Геолокация (город, регион, страна) |
| `ip` | TEXT | IP адрес |
| `source` | TEXT | Источник регистрации (будет добавлено позже) |
| `userAgent` | TEXT | User Agent браузера |
| `createdAt` | TIMESTAMP | Дата и время создания |

### **Индексы:**
- `metrics_userId_idx` — для быстрого поиска по userId
- `metrics_deviceId_idx` — для быстрого поиска по deviceId
- `metrics_createdAt_idx` — для аналитики по времени

---

## 🚀 Как применить миграцию:

### **Шаг 1: Применить миграцию к БД**
```bash
npx prisma migrate deploy
```

### **Шаг 2: Регенерировать Prisma Client**
```bash
npx prisma generate
```

### **Шаг 3: Перезапустить сервер**
```bash
npm run dev
# или
npm start
```

---

## 📈 Что это даёт:

### **Аналитика:**
- ✅ Отслеживание каждого нового гостевого пользователя
- ✅ Геолокация (откуда пользователи)
- ✅ User Agent (какие устройства/браузеры)
- ✅ Timeline создания пользователей

### **Debugging:**
- ✅ Полная история создания пользователей
- ✅ Связь deviceId → userId → wallet
- ✅ IP адреса для fraud detection

### **Будущее:**
- 🔜 `source` поле для tracking источников (ads, organic, referral)
- 🔜 Analytics dashboard
- 🔜 Conversion tracking

---

## 🔍 Примеры запросов:

### **Количество регистраций за сегодня:**
```sql
SELECT COUNT(*) 
FROM metrics 
WHERE "createdAt" >= CURRENT_DATE;
```

### **Топ-5 городов по регистрациям:**
```sql
SELECT location, COUNT(*) as count 
FROM metrics 
GROUP BY location 
ORDER BY count DESC 
LIMIT 5;
```

### **Регистрации по часам (24h):**
```sql
SELECT 
  DATE_TRUNC('hour', "createdAt") as hour,
  COUNT(*) as registrations
FROM metrics
WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour;
```

---

## ⚠️ ВАЖНО:

1. **Не забудь `prisma generate`** после `migrate deploy`
2. **Метрики сохраняются только для НОВЫХ пользователей** (не для существующих)
3. **Если сохранение метрик упадёт** — пользователь всё равно создастся (graceful degradation)
4. **`source` поле пока `null`** — будет добавлено в следующем апдейте

---

**Status**: ✅ Ready to deploy  
**Backward Compatible**: ✅ Yes (новая таблица, не трогает существующие)  
**Breaking Changes**: ❌ None
