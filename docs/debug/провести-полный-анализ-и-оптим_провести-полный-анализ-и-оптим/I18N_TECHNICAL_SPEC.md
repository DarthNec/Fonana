# 🔧 i18n Technical Specification

**Версия:** 1.0  
**Дата:** 11 февраля 2026  
**Статус:** 📋 PLANNING  
**Для:** Development Team

---

## 1. Technology Stack

### Core Library
```bash
npm install next-intl@3.24.0
```

**Dependencies:**
- `next-intl` (2.3KB gzipped)
- No additional peer dependencies required

### Development Tools
```bash
npm install --save-dev @formatjs/cli  # String extraction
```

### Translation Management
- **Crowdin** (GitHub integration)
- Free tier: 60K strings (достаточно для нас)

---

## 2. File Structure

```
fonana/
├── messages/                      # Translation files
│   ├── en.json                   # English (source of truth)
│   ├── ru.json                   # Russian
│   ├── es.json                   # Spanish
│   ├── fr.json                   # French
│   ├── de.json                   # German
│   ├── pt.json                   # Portuguese
│   ├── ja.json                   # Japanese
│   ├── ko.json                   # Korean
│   ├── zh.json                   # Chinese
│   └── ar.json                   # Arabic (Phase 2)
│
├── app/
│   ├── [locale]/                 # Localized routes
│   │   ├── layout.tsx            # Root layout with IntlProvider
│   │   ├── page.tsx              # Home
│   │   ├── feed/
│   │   │   └── page.tsx          # /en/feed, /ru/feed
│   │   ├── profile/
│   │   │   └── [id]/
│   │   │       └── page.tsx      # /en/profile/123
│   │   ├── dashboard/
│   │   ├── messages/
│   │   └── ...
│   │
│   ├── api/                      # NO locale prefix
│   │   ├── posts/
│   │   ├── users/
│   │   └── ...
│   │
│   └── not-found.tsx             # 404 page
│
├── middleware.ts                  # Locale detection & routing
├── i18n/
│   ├── config.ts                 # Locales config
│   ├── request.ts                # Server-side helper
│   └── navigation.ts             # Typed Link, useRouter
│
├── scripts/
│   ├── extract-strings.ts        # Extract hardcoded strings
│   ├── translate-with-ai.ts      # AI translation script
│   └── validate-translations.ts  # Check completeness
│
├── next.config.js                # next-intl plugin
└── crowdin.yml                   # Crowdin config
```

---

## 3. Configuration Files

### 3.1 `i18n/config.ts`

```typescript
export const locales = ['en', 'ru', 'es', 'fr', 'de', 'pt', 'ja', 'ko', 'zh'] as const;
export const defaultLocale = 'en' as const;

export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português',
  ja: '日本語',
  ko: '한국어',
  zh: '中文'
};

export const localeFlags: Record<Locale, string> = {
  en: '🇺🇸',
  ru: '🇷🇺',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  pt: '🇵🇹',
  ja: '🇯🇵',
  ko: '🇰🇷',
  zh: '🇨🇳'
};
```

---

### 3.2 `middleware.ts`

```typescript
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';

export default createMiddleware({
  // List of all locales
  locales,
  
  // Default locale (used when no locale in URL)
  defaultLocale,
  
  // Locale detection strategy
  localeDetection: true, // Auto-detect from Accept-Language header
  
  // Locale prefix strategy
  localePrefix: 'as-needed' // Don't prefix default locale
  // Example: /feed → /en/feed redirect
  //          /ru/feed → stays as is
});

export const config = {
  // Match all pathnames except:
  // - /api (API routes)
  // - /_next (Next.js internals)
  // - /static (static files)
  // - Media files (.jpg, .png, .svg, etc.)
  matcher: [
    '/((?!api|_next|static|.*\\..*).*)'
  ]
};
```

---

### 3.3 `i18n/request.ts`

```typescript
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => {
  // Validate locale
  if (!['en', 'ru', 'es', 'fr', 'de', 'pt', 'ja', 'ko', 'zh'].includes(locale)) {
    return { messages: {} };
  }

  return {
    messages: (await import(`../messages/${locale}.json`)).default,
    
    // Optional: Time zone (можно брать из user settings)
    timeZone: 'UTC',
    
    // Optional: Now for time formatting
    now: new Date()
  };
});
```

---

### 3.4 `i18n/navigation.ts`

```typescript
import { createSharedPathnamesNavigation } from 'next-intl/navigation';
import { locales } from './config';

export const { Link, redirect, usePathname, useRouter } = 
  createSharedPathnamesNavigation({ locales });
```

**Usage:**
```typescript
import { Link } from '@/i18n/navigation';

// Automatically adds locale prefix
<Link href="/feed">Feed</Link>
// Renders: /en/feed or /ru/feed depending on current locale
```

---

### 3.5 `next.config.js`

```javascript
const withNextIntl = require('next-intl/plugin')(
  './i18n/request.ts'
);

module.exports = withNextIntl({
  // Your existing config
  reactStrictMode: true,
  // ... other settings
});
```

---

### 3.6 `crowdin.yml`

```yaml
project_id: "fonana"

files:
  - source: /messages/en.json
    translation: /messages/%two_letters_code%.json
    update_option: update_as_unapproved
    
preserve_hierarchy: true

# Commit messages
commit_message: "New translations from Crowdin"

# Auto-sync with GitHub
```

---

## 4. Translation File Format

### 4.1 Structure (Nested)

```json
{
  "common": {
    "buttons": {
      "save": "Save",
      "cancel": "Cancel",
      "delete": "Delete",
      "edit": "Edit",
      "back": "Back",
      "next": "Next",
      "submit": "Submit",
      "close": "Close"
    },
    "errors": {
      "generic": "Something went wrong. Please try again.",
      "network": "Network error. Check your connection.",
      "unauthorized": "You need to log in to perform this action.",
      "notFound": "The requested resource was not found."
    },
    "success": {
      "saved": "Changes saved successfully!",
      "deleted": "Deleted successfully!",
      "created": "Created successfully!"
    }
  },
  
  "pages": {
    "home": {
      "title": "Welcome to Fonana",
      "subtitle": "Premium adult content platform",
      "cta": "Get Started"
    },
    
    "feed": {
      "title": "Feed",
      "empty": "No posts yet",
      "loading": "Loading posts..."
    },
    
    "dashboard": {
      "title": "Dashboard",
      "stats": {
        "followers": "{count} followers",
        "posts": "{count} posts",
        "revenue": "${amount} revenue"
      }
    }
  },
  
  "components": {
    "createPost": {
      "title": "Create Post",
      "types": {
        "image": "Image",
        "video": "Video",
        "sora2": "AI Video (Sora-2)"
      },
      "accessTypes": {
        "free": "Free",
        "subscribers": "Subscribers Only",
        "premium": "Premium",
        "paid": "Paid",
        "vip": "VIP Only"
      },
      "form": {
        "titleLabel": "Title",
        "titlePlaceholder": "Enter post title...",
        "descriptionLabel": "Description",
        "descriptionPlaceholder": "Describe your post...",
        "priceLabel": "Price",
        "pricePlaceholder": "0.00"
      }
    },
    
    "navbar": {
      "home": "Home",
      "feed": "Feed",
      "explore": "Explore",
      "messages": "Messages",
      "notifications": "Notifications",
      "profile": "Profile",
      "dashboard": "Dashboard",
      "settings": "Settings",
      "logout": "Logout"
    }
  },
  
  "metadata": {
    "title": "Fonana - Premium Adult Content Platform",
    "description": "Join thousands of creators and fans on Fonana",
    "og": {
      "title": "Fonana",
      "description": "Premium adult content platform"
    }
  }
}
```

---

### 4.2 Variables & Formatting

```json
{
  "greeting": "Hello, {username}!",
  "postsCount": "You have {count} posts",
  "price": "Price: {amount, number, currency}",
  "lastUpdate": "Last update: {date, date, medium}",
  
  "plurals": {
    "followers": {
      "one": "{count} follower",
      "other": "{count} followers"
    }
  }
}
```

**Usage:**
```typescript
t('greeting', { username: 'Alice' })
// → "Hello, Alice!"

t('postsCount', { count: 5 })
// → "You have 5 posts"

t('price', { amount: 123.45 })
// EN: "Price: $123.45"
// RU: "Price: 123,45 ₽"

t('plurals.followers', { count: 1 })
// → "1 follower"

t('plurals.followers', { count: 5 })
// → "5 followers"
```

---

## 5. Component Migration Patterns

### 5.1 Server Component

**Before:**
```typescript
// app/feed/page.tsx
export default function FeedPage() {
  return (
    <div>
      <h1>Feed</h1>
      <p>See what's happening</p>
    </div>
  );
}
```

**After:**
```typescript
// app/[locale]/feed/page.tsx
import { getTranslations } from 'next-intl/server';

export default async function FeedPage() {
  const t = await getTranslations('pages.feed');
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('subtitle')}</p>
    </div>
  );
}
```

---

### 5.2 Client Component

**Before:**
```typescript
// components/CreateButton.tsx
'use client';

export function CreateButton() {
  return (
    <button onClick={handleClick}>
      Create Post
    </button>
  );
}
```

**After:**
```typescript
// components/CreateButton.tsx
'use client';
import { useTranslations } from 'next-intl';

export function CreateButton() {
  const t = useTranslations('common.buttons');
  
  return (
    <button onClick={handleClick}>
      {t('createPost')}
    </button>
  );
}
```

---

### 5.3 Form with Validation

**Before:**
```typescript
const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  price: z.number().min(0.01, 'Price must be at least 0.01')
});
```

**After:**
```typescript
'use client';
import { useTranslations } from 'next-intl';

function MyForm() {
  const t = useTranslations('forms.validation');
  
  const schema = z.object({
    title: z.string().min(1, t('titleRequired')),
    price: z.number().min(0.01, t('priceMinimum', { min: 0.01 }))
  });
  
  // ... rest of form
}
```

---

### 5.4 Toast Notifications

**Before:**
```typescript
toast.success('Post created successfully!');
toast.error('Failed to create post');
```

**After:**
```typescript
import { useTranslations } from 'next-intl';

const t = useTranslations('common.success');
const tError = useTranslations('common.errors');

toast.success(t('postCreated'));
toast.error(tError('postCreateFailed'));
```

---

### 5.5 Dynamic Metadata (SEO)

**Before:**
```typescript
// app/feed/page.tsx
export const metadata = {
  title: 'Feed - Fonana',
  description: 'See what creators are posting'
};
```

**After:**
```typescript
// app/[locale]/feed/page.tsx
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params: { locale } }) {
  const t = await getTranslations({ locale, namespace: 'metadata.feed' });
  
  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      languages: {
        'en': '/en/feed',
        'ru': '/ru/feed',
        'es': '/es/feed'
      }
    }
  };
}
```

---

### 5.6 Locale Switcher Component

```typescript
'use client';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { locales, localeNames, localeFlags } from '@/i18n/config';

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const handleLocaleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <select 
      value={locale} 
      onChange={(e) => handleLocaleChange(e.target.value)}
      className="px-3 py-2 rounded-lg"
    >
      {locales.map((loc) => (
        <option key={loc} value={loc}>
          {localeFlags[loc]} {localeNames[loc]}
        </option>
      ))}
    </select>
  );
}
```

---

## 6. Scripts & Automation

### 6.1 Extract Strings

```typescript
// scripts/extract-strings.ts
import { glob } from 'glob';
import fs from 'fs';

async function extractStrings() {
  const files = await glob('components/**/*.tsx');
  const strings = new Set<string>();

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Regex to find hardcoded strings
    const regex = /['"]([^'"]{3,})['"]/g;
    const matches = content.matchAll(regex);
    
    for (const match of matches) {
      strings.add(match[1]);
    }
  }

  // Generate JSON
  const json = {};
  strings.forEach((str, i) => {
    json[`string_${i}`] = str;
  });

  fs.writeFileSync(
    'messages/extracted.json',
    JSON.stringify(json, null, 2)
  );
  
  console.log(`✅ Extracted ${strings.size} strings`);
}

extractStrings();
```

---

### 6.2 AI Translation

```typescript
// scripts/translate-with-ai.ts
import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function translateToLanguage(
  sourceFile: string,
  targetLang: string,
  targetFile: string
) {
  const source = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));

  const prompt = `Translate this JSON from English to ${targetLang}.
Context: Adult content platform (Fonana). Maintain professional tone.
Preserve all variables like {username}, {count}, etc.

Input:
${JSON.stringify(source, null, 2)}

Output JSON only:`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    response_format: { type: 'json_object' }
  });

  const translated = JSON.parse(response.choices[0].message.content);
  
  fs.writeFileSync(targetFile, JSON.stringify(translated, null, 2));
  console.log(`✅ Translated to ${targetLang}`);
}

// Usage
translateToLanguage('messages/en.json', 'Russian', 'messages/ru.json');
translateToLanguage('messages/en.json', 'Spanish', 'messages/es.json');
// ... etc
```

---

### 6.3 Validate Translations

```typescript
// scripts/validate-translations.ts
import fs from 'fs';

function validateTranslations() {
  const en = JSON.parse(fs.readFileSync('messages/en.json', 'utf-8'));
  const locales = ['ru', 'es', 'fr', 'de', 'pt'];

  for (const locale of locales) {
    const file = `messages/${locale}.json`;
    if (!fs.existsSync(file)) {
      console.warn(`⚠️  Missing ${file}`);
      continue;
    }

    const translated = JSON.parse(fs.readFileSync(file, 'utf-8'));
    const missingKeys = findMissingKeys(en, translated);

    if (missingKeys.length > 0) {
      console.error(`❌ ${locale}: Missing keys:`, missingKeys);
    } else {
      console.log(`✅ ${locale}: Complete`);
    }
  }
}

function findMissingKeys(source: any, target: any, prefix = ''): string[] {
  const missing: string[] = [];

  for (const key in source) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (!(key in target)) {
      missing.push(fullKey);
    } else if (typeof source[key] === 'object') {
      missing.push(...findMissingKeys(source[key], target[key], fullKey));
    }
  }

  return missing;
}

validateTranslations();
```

---

## 7. Performance Optimization

### 7.1 Bundle Splitting

Instead of one large `messages/en.json`, split by namespace:

```
messages/
├── en/
│   ├── common.json      (2KB - buttons, errors)
│   ├── home.json        (1KB)
│   ├── feed.json        (1KB)
│   ├── dashboard.json   (3KB)
│   └── createPost.json  (5KB)
└── ru/
    ├── common.json
    └── ...
```

**Load only needed:**
```typescript
const t = useTranslations('createPost'); // Loads only createPost.json
```

---

### 7.2 Caching Strategy

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/messages/:locale/:namespace.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ];
  }
};
```

---

## 8. Testing Strategy

### 8.1 Unit Tests

```typescript
// __tests__/translations.test.ts
import { describe, it, expect } from 'vitest';
import en from '../messages/en.json';
import ru from '../messages/ru.json';

describe('Translations', () => {
  it('should have same keys in all locales', () => {
    expect(Object.keys(ru)).toEqual(Object.keys(en));
  });

  it('should have no empty values', () => {
    const checkEmpty = (obj: any, path = '') => {
      for (const key in obj) {
        const fullPath = path ? `${path}.${key}` : key;
        if (typeof obj[key] === 'object') {
          checkEmpty(obj[key], fullPath);
        } else if (!obj[key]) {
          throw new Error(`Empty value at ${fullPath}`);
        }
      }
    };

    expect(() => checkEmpty(en)).not.toThrow();
    expect(() => checkEmpty(ru)).not.toThrow();
  });
});
```

---

### 8.2 E2E Tests (Playwright)

```typescript
// e2e/locales.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Localization', () => {
  test('should switch to Russian', async ({ page }) => {
    await page.goto('/en/feed');
    
    // Click locale switcher
    await page.selectOption('select[aria-label="Language"]', 'ru');
    
    // Check URL changed
    await expect(page).toHaveURL('/ru/feed');
    
    // Check content translated
    await expect(page.locator('h1')).toHaveText('Лента');
  });

  test('should persist locale across navigation', async ({ page }) => {
    await page.goto('/ru/feed');
    await page.click('a[href="/profile"]');
    await expect(page).toHaveURL('/ru/profile');
  });
});
```

---

## 9. Deployment Checklist

### Pre-deployment
- [ ] All strings extracted and translated
- [ ] Translation coverage >95%
- [ ] Bundle size <265KB (target: <5% increase)
- [ ] FCP <1.3s (target: <10% regression)
- [ ] All tests passing
- [ ] Crowdin synced

### SEO
- [ ] Metadata translated for all pages
- [ ] Sitemap.xml generated with all locales
- [ ] Hreflang tags verified
- [ ] 301 redirects configured (old URLs → new)
- [ ] robots.txt updated

### Monitoring
- [ ] Google Analytics: Locale tracking
- [ ] Error tracking: Translation errors
- [ ] Performance: Bundle size alerts

---

## 10. Troubleshooting

### Issue: "Locale not detected"

**Symptom:** Always shows English

**Fix:**
```typescript
// middleware.ts
export const config = {
  matcher: ['/((?!api|_next|static|.*\\..*).*)']; // ✅ Correct
  // NOT: matcher: ['/'] // ❌ Too narrow
};
```

---

### Issue: "Bundle too large"

**Symptom:** >265KB bundle

**Fix:**
1. Enable namespace splitting
2. Use dynamic imports
3. Check for duplicate translations

---

### Issue: "Translations not updating"

**Symptom:** Old translations after Crowdin sync

**Fix:**
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

---

**Document Status:** ✅ COMPLETE  
**Next:** `I18N_IMPLEMENTATION_GUIDE.md` (step-by-step commands)