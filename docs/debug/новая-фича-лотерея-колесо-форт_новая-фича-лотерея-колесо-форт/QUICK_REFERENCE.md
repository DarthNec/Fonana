# ⚡ LOTTERY WHEEL - QUICK REFERENCE

**5-минутное резюме для быстрого понимания**

---

## 🎯 **ЧТО ДЕЛАЕМ**

Добавляем **колесо фортуны** с призами:
- 🪙 **Solana** (0.005-0.01 SOL)
- 📄 **Платные посты** (доступ к premium контенту)
- 🎁 **DogWater Tokens** (10-100 токенов)

---

## ✅ **ЧТО УЖЕ ЕСТЬ**

| Система | Статус | Использование |
|---------|--------|---------------|
| **Solana payments** | ✅ Готова | Переиспользуем для SOL призов |
| **Post purchase** | ✅ Готова | Переиспользуем для post prizes |
| **Modal UI patterns** | ✅ Готовы | Копируем pattern |
| **DogWater tokens** | ✅ Готовы | Используем для token prizes |
| **Animation (Framer Motion)** | ✅ В проекте | Используем для wheel rotation |

---

## 🆕 **ЧТО ДОБАВЛЯЕМ**

### **1. Database** (3 новые таблицы)
```
lottery_prizes       // Конфигурация призов
lottery_spins        // История розыгрышей
lottery_user_limits  // Лимиты пользователей
```

### **2. Backend API** (4 новых endpoint)
```
POST   /api/lottery/spin      // Крутить колесо
GET    /api/lottery/prizes    // Получить конфигурацию
GET    /api/lottery/history   // История юзера
GET/POST /api/lottery/config  // Админка (опционально)
```

### **3. Frontend Components** (3 новых)
```
LotteryWheel.tsx          // Колесо с анимацией
LotteryModal.tsx          // Модалка с колесом
LotteryPrizeAnimation.tsx // Confetti + prize reveal
```

### **4. Integration** (2 изменения)
```
LeftSidebar.tsx    // + кнопка "🎰 Lottery"
(опционально) Profile page  // + lottery stats
```

---

## 🎨 **DESIGN**

**Wheel**: 8 секторов, purple gradient (brand colors)  
**Animation**: 3-5s spin (accelerate → decelerate)  
**Prizes**:
- 0.01 SOL (15%)
- 0.005 SOL (25%)
- Premium Post (10%)
- 100 Tokens (20%)
- 50 Tokens (20%)
- 10 Tokens (10%)

---

## 🔐 **SECURITY**

**Лимиты**:
- ✅ 5 спинов в день
- ✅ 2 спина в час
- ✅ 5 минут между спинами

**Protection**:
- ✅ Все расчёты на сервере (не клиенте)
- ✅ Require wallet connection
- ✅ Transaction validation

---

## ⏱️ **TIME ESTIMATE**

| Task | Time |
|------|------|
| Database schema | 1-2 hours |
| Backend API | 1-2 days |
| Wheel UI | 2-3 days |
| Animations | 1 day |
| Integration | 0.5 day |
| Testing | 1 day |
| **TOTAL** | **6-10 days** |

---

## 💰 **COSTS & RISKS**

**🔴 Risk: SOL Costs**
- Solution: Max 0.01 SOL per prize (~$1.50)
- Daily budget: 0.1 SOL (~$15/day)
- If budget exceeded → disable SOL prizes

**🟡 Risk: Abuse**
- Solution: Require 24h old account + 5 interactions
- Cooldowns between spins

---

## 📈 **EXPECTED IMPACT**

```
+30% user engagement (daily returns)
+20% time on platform
+15% content discovery
+10% creator revenue
```

---

## 🛠️ **TECHNOLOGY STACK**

- **Frontend**: React + Framer Motion (уже есть)
- **Backend**: Next.js API routes (существующий pattern)
- **Database**: Prisma + PostgreSQL (существующая setup)
- **Blockchain**: Solana Web3.js (уже интегрировано)

---

## 📋 **IMPLEMENTATION PLAN**

### **Phase 1: MVP** (Week 1)
1. ✅ Database schema + migration
2. ✅ Backend API (spin + prizes)
3. ✅ Wheel UI (simple 8-sector)
4. ✅ Basic animation
5. ✅ Prize distribution logic

### **Phase 2: Polish** (Week 2)
6. ✅ History panel
7. ✅ Confetti animations
8. ✅ Sound effects (optional)
9. ✅ Admin config panel

---

## 🎯 **KEY DECISIONS**

| Decision | Choice | Reason |
|----------|--------|--------|
| **Wheel tech** | Framer Motion | Already in project, simple API |
| **Prize selection** | Server-side ONLY | Security critical |
| **Animation** | 3-5s spin | Good UX balance |
| **Limits** | 5/day | Prevent abuse, keep engagement |

---

## 🚀 **READY TO START?**

**Next steps**:
1. ✅ Review discovery report (10 min)
2. ✅ Create Prisma migration (30 min)
3. ✅ Build backend API (1-2 days)
4. ✅ Build wheel UI (2-3 days)
5. ✅ Integration + testing (1-2 days)

---

**Full Report:** [DISCOVERY_REPORT.md](./DISCOVERY_REPORT.md)  
**Status:** 🟢 Ready for Implementation
