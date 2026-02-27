# Migration: Remove location and ip, add ads_from to metrics table

**Date**: 2026-02-19  
**Name**: `20260219_metrics_remove_location_ip_add_ads_from`

---

## 📋 Changes

### Removed columns:
- ❌ `location` (TEXT) - геолокация больше не нужна
- ❌ `ip` (TEXT) - IP адрес больше не нужен

### Added columns:
- ✅ `ads_from` (TEXT, nullable) - рекламная кампания из URL параметра `campaign`

---

## 🎯 Purpose

Упрощение метрик пользователей:
- Убраны IP и geolocation (не нужны для аналитики)
- Добавлено поле `ads_from` для отслеживания рекламных кампаний
- `source` хранит источник (facebook_ad, twitter_bio, etc)
- `ads_from` хранит campaign (nft_creators, influencer_promo, etc)

---

## 📊 Schema before:

```prisma
model Metrics {
  id         String   @id @default(cuid())
  userId     String?
  nickname   String
  deviceId   String
  wallet     String
  location   String   // ← Удаляется
  ip         String   // ← Удаляется
  source     String?
  userAgent  String?
  createdAt  DateTime @default(now())
}
```

---

## 📊 Schema after:

```prisma
model Metrics {
  id         String   @id @default(cuid())
  userId     String?
  nickname   String
  deviceId   String
  wallet     String
  source     String?  // facebook_ad, twitter_bio, etc
  ads_from   String?  // ← Добавлено: nft_creators, influencer_promo, etc
  userAgent  String?
  createdAt  DateTime @default(now())
}
```

---

## 🚀 How to apply:

```bash
# 1. Применить миграцию
npx prisma migrate deploy

# 2. Сгенерировать Prisma Client
npx prisma generate
```

---

## ⚠️ Important notes:

1. **Data loss**: Existing `location` and `ip` data will be permanently deleted
2. **Nullable**: `ads_from` is nullable (можно NULL если нет campaign)
3. **Backend updated**: All API routes updated to not collect IP/location
4. **Frontend updated**: UTM tracking passes `campaign` to backend as `ads_from`

---

## 🔍 Testing:

After migration:

```sql
-- Проверить структуру таблицы
\d metrics

-- Проверить что старые колонки удалены
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'metrics' AND column_name IN ('location', 'ip');
-- Должно вернуть 0 строк

-- Проверить что новая колонка добавлена
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'metrics' AND column_name = 'ads_from';
-- Должно вернуть 1 строку

-- Посмотреть последние записи
SELECT source, ads_from, "createdAt" FROM metrics ORDER BY "createdAt" DESC LIMIT 5;
```

---

## 📈 Example data:

**Old format**:
```
source: "facebook_ad"
location: "🌍 Moscow, Moscow, Russia"
ip: "192.168.1.1"
```

**New format**:
```
source: "facebook_ad"
ads_from: "nft_creators"
```

---

**Status**: ✅ Ready to apply
