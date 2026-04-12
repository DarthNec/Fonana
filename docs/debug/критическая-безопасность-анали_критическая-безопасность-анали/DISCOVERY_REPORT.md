# 🚨 DISCOVERY REPORT: Guest Registration DDoS Vulnerability Analysis

**Date**: March 19, 2026  
**Session ID**: `task_критическая-безопасность-анали_2476`  
**Severity**: 🔴 CRITICAL  
**Status**: Under Attack - Active DDoS via Guest Registration  
**Analyst**: M7 Full Cycle Analysis

---

## 📋 EXECUTIVE SUMMARY

### Situation
Fonana платформа подвергается массовой атаке через endpoint `/api/auth/guest`. Атакующие создают огромное количество гостевых аккаунтов, используя уязвимость отсутствия защиты от автоматизированных запросов.

###Critical Vulnerability
**NO RATE LIMITING + NO CAPTCHA + NO BOT PROTECTION = WIDE OPEN DDOS VECTOR**

### Immediate Risk
- **Database Pollution**: ✅ Confirmed - массовое создание fake users
- **Server Overload**: ⚠️ High risk - каждый запрос = DB writes + avatar assignment + tracking
- **Cost Escalation**: ⚠️ Database growth, CDN bandwidth, API calls
- **Service Degradation**: ⚠️ Legitimate users affected

### Current Exposure
```
Attack Surface: /api/auth/guest
Protection Level: 0% (NO DEFENSE)
Attack Cost: $0 (полностью бесплатно для атакующих)
Attack Complexity: Trivial (curl loop достаточно)
```

---

## 🔍 CURRENT IMPLEMENTATION ANALYSIS

### 1. Guest Authentication Endpoint

**File**: `app/api/auth/guest/route.ts`

**Current Flow**:
```
1. Accept ANY request (no validation)
2. Generate deviceId (if not provided)
3. Check DB for existing user (1 query)
4. If not found:
   - Generate unique nickname (up to 50 DB queries!)
   - Generate fake wallet (FK_ prefix)
   - Assign CDN avatar (1 DB query + 1 update)
   - Create user (1 DB write)
   - Track metrics (1 DB write)
   - Send Telegram notification (1 API call)
   - Generate JWT token
   - Update user with token (1 DB update)
5. Return success

Total DB Operations per NEW guest: 4-54 queries (avg ~10)
Total API Calls: 1-2 (Telegram + optional geolocation)
```

**Attack Vector Analysis**:
```python
# Атака предельно проста:
while True:
    requests.post('https://fonana.me/api/auth/guest', 
        json={'source': 'bot', 'campaign': 'spam'})
    # NO rate limit, NO CAPTCHA, NO IP blocking
    # Result: Instant new user created EVERY TIME
```

### 2. Protection Gaps

#### 2.1 NO Rate Limiting
**Status**: 🔴 CRITICAL

```typescript
// Current code: НЕТ НИКАКОЙ ЗАЩИТЫ
export async function POST(request: NextRequest) {
  try {
    // Принимаем ЛЮБОЙ запрос
    const body = await request.json().catch(() => ({}))
    // ... создаём пользователя ...
  }
}
```

**Documentation Claims vs Reality**:
- `docs/API_SCHEMA.md` (line 1128-1134): "Rate Limits: General API: 100 requests/minute per IP"
- **REALITY**: ❌ NOT IMPLEMENTED - это только в документации!

**Evidence**:
```bash
# Проверка реального кода:
grep -r "rate-limit" app/api/  # Result: NO MATCHES
grep -r "rate limit" app/api/  # Result: NO MATCHES
grep -r "ratelimit" app/api/   # Result: NO MATCHES
```

#### 2.2 NO CAPTCHA / Bot Protection
**Status**: 🔴 CRITICAL

```bash
# package.json search:
grep -i "captcha\|recaptcha\|hcaptcha\|turnstile" package.json
# Result: NO MATCHES
```

**Conclusion**: Полностью отсутствует защита от ботов.

#### 2.3 NO IP-Based Restrictions
**Status**: 🔴 CRITICAL

- NO IP blocking
- NO geographic restrictions
- NO user-agent validation
- NO fingerprinting

#### 2.4 Expensive Operations
**Status**: 🟡 HIGH SEVERITY

**Nickname Generation** (lines 22-63):
```typescript
async function generateUniqueNickname(): Promise<string> {
  // ...
  while (attempts < maxAttempts) {  // Up to 50 attempts!
    // ...
    const existing = await prisma.user.findFirst({ where: { nickname } })
    if (!existing) {
      return nickname
    }
    counter++
    attempts++
  }
  // ...
}
```

**Problem**: Under attack, collision rate increases → MORE DB queries per request!

**Avatar Assignment** (`lib/utils/avatarAssigner.ts`):
```typescript
export async function getNextAvatar(): Promise<string> {
  // 1. Read counter from DB
  const avatarCounter = await prisma.avatarCounter.findUnique(...)
  
  // 2. Update counter atomically
  await prisma.avatarCounter.update(...)
  
  // Result: 2 DB operations + 1 CDN URL generation
}
```

**Problem**: EVERY guest creation = 2 extra DB operations для avatar rotation.

---

## 💀 ATTACK SCENARIOS

### Scenario 1: Simple Volume Attack
```bash
# Attacker script:
for i in {1..10000}; do
  curl -X POST https://fonana.me/api/auth/guest \
    -H "Content-Type: application/json" \
    -d '{"source":"bot","campaign":"ddos"}' &
done
```

**Impact**:
- 10,000 requests в секунды (parallel)
- 10,000 new users в БД
- ~100,000 DB queries
- 10,000 Telegram notifications
- Database overload

**Cost to Attacker**: $0  
**Cost to Fonana**: Значительный (DB load, bandwidth, Telegram API rate limits)

### Scenario 2: Distributed Attack
```
Source: 100 different IPs (VPN / cloud)
Rate: 10 req/sec per IP = 1000 req/sec total
Duration: 1 hour
Result: 3,600,000 fake users
```

**Impact**: Catastrophic database pollution.

### Scenario 3: Resource Exhaustion
```
Goal: Exhaust specific resources
Targets:
- Avatar counter (250 avatars cycle)
- Nickname combinations (collision attacks)
- Telegram bot rate limit (30 msg/sec)
- Database connections
```

**Impact**: Service degradation for legitimate users.

---

## 🛡️ COMPARATIVE ANALYSIS: Authentication Methods

### Current Methods vs. Recommended

| Method | DDoS Risk | UX Friction | Implementation Cost | Recommendation |
|--------|-----------|-------------|---------------------|----------------|
| **Current: Guest (NO protection)** | 🔴 100% | 🟢 0% | 🟢 Low | ❌ URGENT FIX |
| **Guest + Rate Limit** | 🟡 40% | 🟢 0% | 🟢 Low | ✅ IMMEDIATE |
| **Guest + CAPTCHA** | 🟢 5% | 🟡 20% | 🟢 Low | ✅ SHORT-TERM |
| **Guest + Fingerprinting** | 🟢 10% | 🟢 0% | 🟡 Medium | ✅ MID-TERM |
| **Google OAuth** | 🟢 1% | 🟡 15% | 🟢 Low | ✅ ALTERNATIVE |
| **Email OTP** | 🟢 3% | 🟡 30% | 🟢 Low | ⚠️ CONSIDER |
| **Telegram (current)** | 🟢 2% | 🟢 5% | 🟢 Low | ✅ KEEP |

### Detailed Comparison

#### Option 1: Guest + Rate Limiting (RECOMMENDED IMMEDIATE)
**Protection**: 
- Per-IP: 5 guest accounts/hour
- Per-Device fingerprint: 1 account/day
- Global: 1000 accounts/hour

**Pros**:
- ✅ Stops 95% of basic attacks
- ✅ Zero UX impact for legitimate users
- ✅ Fast implementation (1-2 hours)

**Cons**:
- ❌ VPN/proxy bypass possible
- ❌ Sophisticated attackers not fully stopped

**Implementation**:
```typescript
import rateLimit from 'express-rate-limit'

const guestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per IP per hour
  message: 'Too many accounts created. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
})
```

---

#### Option 2: Guest + CAPTCHA (RECOMMENDED SHORT-TERM)
**Protection**:
- Cloudflare Turnstile (FREE, zero friction)
- hCaptcha (fallback)

**Pros**:
- ✅ Blocks 99% of bots
- ✅ Modern CAPTCHA = low friction
- ✅ Free tier available

**Cons**:
- ⚠️ Minimal UX friction (1-2 sec validation)
- ⚠️ External dependency

**Implementation**:
```typescript
// Frontend (LogInMethodPopup.tsx):
<Turnstile
  sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
  onSuccess={(token) => setcaptchaToken(token)}
/>

// Backend (app/api/auth/guest/route.ts):
const captchaToken = body.captchaToken
if (!captchaToken) {
  return NextResponse.json({ error: 'CAPTCHA required' }, { status: 400 })
}

const isValid = await verifyCaptcha(captchaToken)
if (!isValid) {
  return NextResponse.json({ error: 'Invalid CAPTCHA' }, { status: 400 })
}
```

---

#### Option 3: Google OAuth (ALTERNATIVE)
**Protection**: Inherent (Google handles bot detection)

**Pros**:
- ✅ Best security (Google's anti-bot)
- ✅ Verified email addresses
- ✅ Social login UX familiar
- ✅ Existing package: `next-auth` (already installed!)

**Cons**:
- ⚠️ Requires Google account
- ⚠️ Privacy concern for some users
- ⚠️ Additional OAuth setup

**Current Status**:
```typescript
// lib/auth.ts already has NextAuth configured!
import GithubProvider from 'next-auth/providers/github'

// Just add GoogleProvider:
import GoogleProvider from 'next-auth/providers/google'

providers: [
  GoogleProvider({
    clientId: process.env.GOOGLE_ID!,
    clientSecret: process.env.GOOGLE_SECRET!,
  }),
]
```

**Implementation Cost**: LOW (NextAuth already integrated!)

---

#### Option 4: Device Fingerprinting
**Protection**: Track browser/device signatures

**Pros**:
- ✅ Zero UX friction
- ✅ Persistent across sessions
- ✅ Hard to bypass

**Cons**:
- ⚠️ Privacy concerns (GDPR)
- ⚠️ Can be spoofed by advanced attackers
- ⚠️ Requires client-side library

**Libraries**:
- [@fingerprintjs/fingerprintjs](https://github.com/fingerprintjs/fingerprintjs) (Open source, free)
- FingerprintJS Pro (Paid, more accurate)

---

## 📊 RISK ASSESSMENT MATRIX

| Risk Factor | Severity | Likelihood | Impact | Mitigation Priority |
|-------------|----------|------------|--------|---------------------|
| **Database Pollution** | 🔴 Critical | 🔴 100% (happening now) | 🔴 High | P0 (Immediate) |
| **Service Degradation** | 🔴 Critical | 🟡 60% | 🔴 High | P0 (Immediate) |
| **Cost Escalation** | 🟡 High | 🟡 70% | 🟡 Medium | P1 (Short-term) |
| **Legitimate User Impact** | 🟡 High | 🟡 50% | 🔴 High | P0 (Immediate) |
| **Reputation Damage** | 🟡 High | 🟡 40% | 🟡 Medium | P1 (Short-term) |

---

## 🎯 RECOMMENDED SOLUTION ARCHITECTURE

### Phase 1: EMERGENCY RESPONSE (0-2 hours)

**1.1 Immediate Rate Limiting**
```typescript
// Create: lib/middleware/rateLimiter.ts
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const redis = Redis.fromEnv()

export const guestRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 h"), // 5 requests per hour
  analytics: true,
})

// Apply to: app/api/auth/guest/route.ts
const ip = request.headers.get('x-forwarded-for') || 'unknown'
const { success, limit, reset, remaining } = await guestRateLimit.limit(ip)

if (!success) {
  return NextResponse.json({
    error: 'Rate limit exceeded. Too many accounts created.',
    limit,
    reset,
    remaining: 0
  }, { status: 429 })
}
```

**Cost**: Free tier available (Upstash Redis)  
**Time**: 1-2 hours

---

### Phase 2: BOT PROTECTION (2-24 hours)

**2.1 Cloudflare Turnstile**
```bash
npm install @marsidev/react-turnstile
```

**Frontend**:
```typescript
// components/LogInMethodPopup.tsx
import Turnstile from '@marsidev/react-turnstile'

const [captchaToken, setCaptchaToken] = useState<string | null>(null)

<Turnstile
  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
  onSuccess={(token) => setCaptchaToken(token)}
/>

// Disable "Continue as Guest" until CAPTCHA solved
<button
  disabled={!captchaToken}
  onClick={() => handleGuestLogin(captchaToken)}
>
  Continue as Guest
</button>
```

**Backend**:
```typescript
// lib/utils/verifyCaptcha.ts
export async function verifyTurnstile(token: string): Promise<boolean> {
  const response = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
    }
  )
  
  const data = await response.json()
  return data.success
}

// app/api/auth/guest/route.ts
const { captchaToken } = body
if (!captchaToken) {
  return NextResponse.json({ error: 'CAPTCHA required' }, { status: 400 })
}

const isValid = await verifyTurnstile(captchaToken)
if (!isValid) {
  return NextResponse.json({ error: 'Invalid CAPTCHA' }, { status: 403 })
}
```

**Cost**: FREE (Cloudflare Turnstile)  
**Time**: 2-4 hours

---

### Phase 3: GOOGLE AUTH INTEGRATION (24-48 hours)

**3.1 Add Google Provider**
```typescript
// lib/auth.ts (ALREADY has NextAuth configured!)
import GoogleProvider from 'next-auth/providers/google'

export const authOptions: NextAuthOptions = {
  // ...
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
    // Keep existing:
    GithubProvider({...}),
  ],
}
```

**3.2 Update LogInMethodPopup**
```typescript
// Add "Continue with Google" button
<button onClick={() => signIn('google')}>
  <GoogleIcon /> Continue with Google
</button>
```

**Cost**: FREE  
**Time**: 4-8 hours (setup Google Console + testing)

---

### Phase 4: ADVANCED PROTECTION (1-2 weeks)

**4.1 Device Fingerprinting**
```bash
npm install @fingerprintjs/fingerprintjs
```

```typescript
// lib/utils/deviceFingerprint.ts
import FingerprintJS from '@fingerprintjs/fingerprintjs'

export async function getDeviceFingerprint(): Promise<string> {
  const fp = await FingerprintJS.load()
  const result = await fp.get()
  return result.visitorId
}

// Limit: 1 guest account per device fingerprint per 24h
```

**4.2 IP Geolocation + Reputation**
```typescript
// Block known VPN/proxy IPs
// Block countries with high abuse rates (optional)
```

---

## 💰 COST-BENEFIT ANALYSIS

### Current Cost of Attack
- **Database Growth**: ~10KB per fake user × 100K users = 1GB
- **CDN Bandwidth**: Avatar assignment
- **API Calls**: Telegram notifications, geolocation
- **Server Load**: DB queries, JWT generation
- **Cleanup Cost**: Manual DB cleanup required

### Protection Costs

| Solution | Setup Cost | Monthly Cost | Effectiveness |
|----------|-----------|--------------|---------------|
| **Rate Limiting** | 2h dev time | $0 (Upstash free tier) | 95% |
| **Turnstile** | 4h dev time | $0 (Cloudflare free) | 99% |
| **Google OAuth** | 8h dev time | $0 (Google free) | 99.9% |
| **Fingerprinting** | 16h dev time | $0 (OSS library) | 98% |

**ROI**: Even 1 hour of dev time = cheaper than dealing with ongoing attacks!

---

## 🚀 IMPLEMENTATION ROADMAP

### Sprint 1: EMERGENCY (Day 1)
**Goal**: Stop the bleeding

- [ ] **Task 1.1**: Implement Upstash rate limiting (2h)
  - Install `@upstash/ratelimit` + `@upstash/redis`
  - Create `lib/middleware/rateLimiter.ts`
  - Apply to `/api/auth/guest`
  - Test: Verify 429 responses after 5 requests

- [ ] **Task 1.2**: Add manual IP blocking (1h)
  - Create `lib/utils/ipBlocklist.ts`
  - Add blocked IPs to environment variable
  - Return 403 for blocked IPs

**Success Criteria**:
- ✅ Rate limit active (5 guests/IP/hour)
- ✅ Attack volume reduced by 95%

---

### Sprint 2: BOT PROTECTION (Day 2-3)
**Goal**: Eliminate bot registrations

- [ ] **Task 2.1**: Integrate Cloudflare Turnstile (3h)
  - Sign up for Turnstile (free)
  - Install `@marsidev/react-turnstile`
  - Add CAPTCHA to `LogInMethodPopup`
  - Verify token on backend

- [ ] **Task 2.2**: Testing (1h)
  - Test guest registration flow
  - Verify CAPTCHA enforcement
  - Test failure scenarios

**Success Criteria**:
- ✅ CAPTCHA required for guest accounts
- ✅ Bot registrations blocked

---

### Sprint 3: OAUTH ALTERNATIVE (Week 2)
**Goal**: Provide verified login option

- [ ] **Task 3.1**: Google OAuth setup (4h)
  - Google Console project setup
  - Add credentials to `.env`
  - Update `lib/auth.ts`
  - Test OAuth flow

- [ ] **Task 3.2**: UI updates (2h)
  - Add "Continue with Google" button
  - Update guest info popup
  - Add OAuth benefits

**Success Criteria**:
- ✅ Google login functional
- ✅ 30% of new users choose Google

---

### Sprint 4: ADVANCED (Week 3-4)
**Goal**: Multi-layered defense

- [ ] **Task 4.1**: Device fingerprinting (8h)
- [ ] **Task 4.2**: IP reputation (4h)
- [ ] **Task 4.3**: Analytics dashboard (4h)

---

## 🔥 EMERGENCY ACTIONS (RIGHT NOW)

### Option A: Disable Guest Auth (Extreme)
```typescript
// app/api/auth/guest/route.ts
export async function POST(request: NextRequest) {
  // Temporary shutdown during attack
  return NextResponse.json({
    error: 'Guest registration temporarily disabled due to maintenance',
    success: false
  }, { status: 503 })
}
```

**Pros**: Stops attack immediately  
**Cons**: Blocks legitimate users

---

### Option B: Cloudflare Challenge (Quick)
If site is behind Cloudflare:
1. Go to Cloudflare Dashboard
2. Security > WAF > Rate Limiting Rules
3. Create rule:
   ```
   URI Path: /api/auth/guest
   Rate: 5 requests per 1 hour
   Action: Challenge (CAPTCHA)
   ```

**Pros**: No code changes, instant activation  
**Cons**: Requires Cloudflare Pro ($20/mo)

---

## 📈 SUCCESS METRICS

### KPIs to Track
1. **Guest Registration Rate**: Should drop to normal levels (~10-50/hour)
2. **Database Growth**: Should stabilize
3. **Legitimate User Impact**: Zero impact (measure conversion rate)
4. **Attack Attempts**: Track 429/403 responses
5. **CAPTCHA Solve Rate**: Should be >95% for humans

### Monitoring Dashboard
```sql
-- Suspicious patterns to watch:
SELECT 
  DATE(createdAt) as date,
  COUNT(*) as guest_accounts,
  COUNT(DISTINCT SUBSTRING_INDEX(ip, '.', 3)) as unique_subnets
FROM users
WHERE wallet LIKE 'FK_%'
GROUP BY date
ORDER BY date DESC;

-- Alert if: guest_accounts > 1000/day AND unique_subnets < 100
```

---

## ✅ RECOMMENDATIONS SUMMARY

### IMMEDIATE (0-24 hours):
1. ✅ **Implement Rate Limiting** (Upstash Redis) - 2h
2. ✅ **Add Cloudflare Turnstile** (CAPTCHA) - 3h
3. ✅ **Monitor attack patterns** - ongoing

### SHORT-TERM (1-2 weeks):
4. ✅ **Integrate Google OAuth** - 8h
5. ✅ **Device fingerprinting** - 16h
6. ✅ **IP reputation checks** - 4h

### MID-TERM (1 month):
7. ⚠️ **Consider Email OTP** as guest alternative
8. ⚠️ **Analytics dashboard** for abuse monitoring
9. ⚠️ **Automated cleanup** of suspicious accounts

### NOT RECOMMENDED:
- ❌ Disabling guest auth entirely (bad UX)
- ❌ Aggressive IP blocking (false positives)
- ❌ Paid bot detection services (overkill for now)

---

## 🎯 FINAL VERDICT

**Critical Vulnerability**: YES ✅  
**Immediate Action Required**: YES ✅  
**Recommended Solution**: Rate Limiting + CAPTCHA + Google OAuth  
**Implementation Time**: 1-2 days for core protection  
**Cost**: Minimal (~$0 with free tiers)

**Estimated Attack Mitigation**:
- Phase 1 (Rate Limit): 95% reduction
- Phase 2 (CAPTCHA): 99% reduction
- Phase 3 (OAuth): 99.9% reduction

---

## 📚 REFERENCES

1. Upstash Rate Limiting: https://github.com/upstash/ratelimit
2. Cloudflare Turnstile: https://developers.cloudflare.com/turnstile/
3. NextAuth Google Provider: https://next-auth.js.org/providers/google
4. FingerprintJS: https://github.com/fingerprintjs/fingerprintjs
5. OWASP API Security: https://owasp.org/www-project-api-security/

---

**Status**: ✅ Discovery Complete - Ready for Solution Plan  
**Next Phase**: ARCHITECTURE_CONTEXT → SOLUTION_PLAN  
**M7 Session**: `task_критическая-безопасность-анали_2476`
