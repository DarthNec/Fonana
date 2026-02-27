# Migration: Add availableWheelSpins to User

**Date:** 2026-02-25  
**Type:** Schema Addition  
**Impact:** Low (non-breaking change)

---

## 📋 Changes

### Added Field

**Table:** `users`  
**Field:** `availableWheelSpins`  
**Type:** `INTEGER`  
**Default:** `1`  
**Nullable:** `NOT NULL`

---

## 🎯 Purpose

Добавлено поле `availableWheelSpins` для отслеживания доступного количества вращений колеса фортуны (lottery feature).

**Use Cases:**
- Пользователь получает wheel spins за определённые действия (регистрация, депозит, активность)
- Система проверяет `availableWheelSpins > 0` перед разрешением вращения
- После вращения счётчик уменьшается на 1

---

## 🔧 Schema Changes

```sql
ALTER TABLE "users" ADD COLUMN "availableWheelSpins" INTEGER NOT NULL DEFAULT 1;
```

---

## 📊 Migration Details

### Default Value: `1`

**Reasoning:**
- Новые пользователи начинают с 1 бесплатным спином
- Existing пользователи получат 1 спин автоматически
- Хороший onboarding - каждый может попробовать lottery бесплатно

---

## ✅ Safety

**Non-Breaking:**
- ✅ Default value установлен (`0`)
- ✅ NOT NULL constraint безопасен (есть default)
- ✅ Existing rows получат default value автоматически
- ✅ No data loss
- ✅ No downtime required

---

## 🚀 Deployment

### Apply Migration

```bash
# Development
npx prisma migrate dev

# Production
npx prisma migrate deploy
```

---

## 🧪 Testing

### Verify Migration

```sql
-- Check field exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name = 'availableWheelSpins';

-- Check existing users have default value
SELECT id, nickname, "availableWheelSpins" 
FROM "users" 
LIMIT 5;
```

**Expected Result:**
- Field exists with type `integer`
- Default value is `1`
- All existing users have `availableWheelSpins = 1`

---

## 📝 Related Files

**Updated:**
- ✅ `prisma/schema.prisma` - Added `availableWheelSpins Int @default(0)` to User model

**Integration Points:**
- `components/LotteryPage.tsx` - Check if user has spins available
- `app/api/lottery/spin/route.ts` - Decrement counter after spin (to be implemented)
- `app/api/user/add-spins/route.ts` - Increment counter for rewards (to be implemented)

---

## 🎯 Next Steps

**После применения миграции:**

1. ✅ Verify migration applied successfully
2. ⏳ Update `LotteryPage.tsx` to check `user.availableWheelSpins > 0`
3. ⏳ Create backend API for spin logic
4. ⏳ Add admin interface to grant spins
5. ⏳ Implement rewards system (grant spins for actions)

---

**Migration Ready** ✅  
**Status:** Ready to apply  
**Risk:** 🟢 Minimal (non-breaking, default value set)
