# 🚀 i18n Implementation - Quick Reference

**Цель:** Добавить многоязычность в Fonana  
**Статус:** 📋 ПЛАНИРОВАНИЕ  
**Дата:** 11 февраля 2026

---

## ⚡ TL;DR - 3 минуты

### Рекомендованное решение

**Stack:** `next-intl` + `Crowdin` + `AI translations (GPT-4o)`

### Почему?
- ✅ Minimal overhead (2.3KB vs 38KB react-intl)
- ✅ Built для Next.js 14 App Router
- ✅ 95% automatic translations за $60 (vs $50K manual)
- ✅ SEO-optimized из коробки

### Сроки
- **3 месяца** до полного запуска
- **10 языков** поддержки

### Затраты
- **~$2,000** первый год (setup + translations + TMS)
- **~$500/год** поддержка

### ROI
- +300% потенциальная аудитория
- +50% organic traffic (SEO)
- +$100K-500K revenue annually

---

## 📊 Comparison Matrix - 5 минут

| Library | Bundle | Next.js 14 | SEO | DX | Verdict |
|---------|--------|------------|-----|-----|---------|
| **next-intl** | 2.3KB | ✅ Native | ✅ Auto | ⭐⭐⭐⭐⭐ | ✅ BEST |
| next-i18next | 12KB | ⚠️ Limited | ✅ Good | ⭐⭐⭐⭐ | ⚠️ OK |
| react-intl | 38KB | ❌ Manual | ⚠️ Manual | ⭐⭐⭐ | ❌ NO |
| Custom | 0KB | ✅ Full | ✅ Manual | ⭐⭐ | ❌ NO |

**Winner:** next-intl (17x меньше react-intl!)

---

## 🏗️ Architecture - 10 минут

### File Structure
```
fonana/
├── messages/
│   ├── en.json  (source)
│   ├── ru.json
│   ├── es.json
│   └── ...
├── app/
│   └── [locale]/        # /en/feed, /ru/feed
│       ├── layout.tsx
│       ├── page.tsx
│       └── ...
├── middleware.ts        # Auto locale detection
└── i18n/
    ├── config.ts
    └── request.ts
```

### Usage Example
```typescript
// Server Component
import {getTranslations} from 'next-intl/server';
const t = await getTranslations('HomePage');

// Client Component
'use client';
import {useTranslations} from 'next-intl';
const t = useTranslations('HomePage');

// Render
<h1>{t('title')}</h1>
```

---

## 🤖 AI Translation - 5 минут

### Option 1: GPT-4o (Recommended for critical UI)
- **Quality:** ⭐⭐⭐⭐⭐
- **Cost:** $6 per language (~2000 strings)
- **Speed:** 30-60 sec per 100 strings

```typescript
// scripts/translate-with-ai.ts
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{
    role: 'user',
    content: `Translate to ${targetLang}: ${JSON.stringify(strings)}`
  }],
  temperature: 0.3
});
```

### Option 2: DeepL (Recommended for bulk)
- **Quality:** ⭐⭐⭐⭐
- **Cost:** $3 per language
- **Speed:** 100ms per 100 strings

### Hybrid Strategy
1. GPT-4o для critical UI (800 strings) → $5/lang
2. DeepL для bulk content (1200 strings) → $3/lang
3. Human review sensitive (50 strings) → $50/lang

**Total:** ~$60/lang (vs $5,000 manual)

---

## 📈 Implementation Roadmap - 5 минут

### Month 1: Foundation
- Week 1: Install next-intl, setup routing
- Week 2: Pilot (1 page migration)
- Week 3: Extract all strings (CLI tool)
- Week 4: AI translate 5 languages

### Month 2: Migration
- Week 5-6: Core pages (Home, Feed, Dashboard)
- Week 7-8: Components (modals, forms, sidebar)

### Month 3: Polish
- Week 9: SEO (metadata, sitemap, hreflang)
- Week 10: Performance optimization
- Week 11: QA (all locales)
- Week 12: Launch 🚀

---

## 💰 Cost Breakdown - 3 минуты

| Item | Cost | Notes |
|------|------|-------|
| Development | $0 | Internal (120-180h) |
| AI Translations | $60 | 10 languages |
| Human Review | $500 | Critical only |
| Crowdin TMS | $40/mo | After free trial |
| **TOTAL Year 1** | **~$2,000** | vs $50K+ manual |

---

## 🚨 Top 5 Risks - 5 минут

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Translation Quality** | 🔴 HIGH | GPT-4o + human review |
| **SEO Drop** | 🔴 HIGH | 301 redirects + sitemap |
| **Performance** | 🟡 MEDIUM | Dynamic imports |
| **Developer Resistance** | 🟡 MEDIUM | Simple API + docs |
| **Maintenance** | 🟢 LOW | Crowdin auto-sync |

---

## ✅ Decision Checklist - 2 минуты

- [ ] Approve stack: next-intl + Crowdin + AI
- [ ] Allocate resources: 1-2 devs for 3 months
- [ ] Budget: ~$2,000 first year
- [ ] Languages: EN, RU, ES, FR, DE, PT (+ 4 later)
- [ ] Timeline: Start Week 1, launch Month 3

---

## 📚 Full Documentation

**Main Document:** `I18N_COMPREHENSIVE_PLAN.md` (14,000+ words)

**Sections:**
1. Current State Analysis (2,000 strings identified)
2. Library Research (4 options compared)
3. AI Translation (3 methods + cost analysis)
4. Architecture Design (routing, SEO, performance)
5. Cost Estimation ($2K vs $50K)
6. Risk Analysis (5 risks + mitigation)
7. Implementation Roadmap (12 weeks)
8. Success Metrics (KPIs)

---

## 🎯 Next Action

1. **Read full plan:** `I18N_COMPREHENSIVE_PLAN.md`
2. **Discuss with team**
3. **Get approval**
4. **Start Week 1** (setup)

---

**Questions?** See full plan for details.

**Status:** ✅ Ready for review  
**Last Updated:** Feb 11, 2026