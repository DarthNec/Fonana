# 🎰 LOTTERY WHEEL - SOLUTION PLAN

**Task ID:** `task_новая-фича-лотерея-колесо-форт_7486`  
**M7 Phase:** PLANNING  
**Status:** 🟢 Ready for Implementation

---

## 📂 **FILES TO CREATE**

### **1. Database Migration**

#### **`prisma/migrations/20260219_add_lottery_system/migration.sql`**
```sql
-- CreateEnum
CREATE TYPE "LotteryPrizeType" AS ENUM ('POST', 'SOLANA', 'TOKENS');

-- CreateTable: Конфигурация призов
CREATE TABLE "lottery_prizes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" "LotteryPrizeType" NOT NULL,
    "value" DOUBLE PRECISION,
    "postId" TEXT,
    "probability" DOUBLE PRECISION NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "lottery_prizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: История розыгрышей
CREATE TABLE "lottery_spins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prizeId" TEXT NOT NULL,
    "prizeType" "LotteryPrizeType" NOT NULL,
    "prizeValue" DOUBLE PRECISION,
    "postId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "lottery_spins_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Лимиты пользователей
CREATE TABLE "lottery_user_limits" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "spinsToday" INTEGER NOT NULL DEFAULT 0,
    "lastSpinDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalSpins" INTEGER NOT NULL DEFAULT 0,
    
    CONSTRAINT "lottery_user_limits_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "lottery_user_limits_userId_key" UNIQUE ("userId")
);

-- CreateIndex
CREATE INDEX "lottery_spins_userId_idx" ON "lottery_spins"("userId");
CREATE INDEX "lottery_spins_timestamp_idx" ON "lottery_spins"("timestamp");

-- AddForeignKey
ALTER TABLE "lottery_spins" ADD CONSTRAINT "lottery_spins_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lottery_spins" ADD CONSTRAINT "lottery_spins_prizeId_fkey" 
    FOREIGN KEY ("prizeId") REFERENCES "lottery_prizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lottery_user_limits" ADD CONSTRAINT "lottery_user_limits_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

#### **`prisma/migrations/20260219_add_lottery_system/README.md`**
```markdown
# Lottery System Migration

## Changes:
- Adds `LotteryPrizeType` enum
- Creates `lottery_prizes` table
- Creates `lottery_spins` table
- Creates `lottery_user_limits` table

## How to apply:
```bash
npx prisma migrate deploy
npx prisma generate
```

## Seed initial prizes:
After migration, run seed script to populate initial prizes.
```

---

### **2. Schema Update**

#### **`prisma/schema.prisma`** (UPDATE)
```prisma
// Добавить в конец файла:

enum LotteryPrizeType {
  POST
  SOLANA
  TOKENS
}

model LotteryPrize {
  id          String            @id @default(cuid())
  type        LotteryPrizeType
  value       Float?
  postId      String?
  probability Float
  label       String
  isActive    Boolean           @default(true)
  createdAt   DateTime          @default(now())
  
  spins       LotterySpin[]
  
  @@map("lottery_prizes")
}

model LotterySpin {
  id         String            @id @default(cuid())
  userId     String
  prizeId    String
  prizeType  LotteryPrizeType
  prizeValue Float?
  postId     String?
  timestamp  DateTime          @default(now())
  
  user       User              @relation(fields: [userId], references: [id])
  prize      LotteryPrize      @relation(fields: [prizeId], references: [id])
  
  @@index([userId])
  @@index([timestamp])
  @@map("lottery_spins")
}

model LotteryUserLimit {
  id           String   @id @default(cuid())
  userId       String   @unique
  spinsToday   Int      @default(0)
  lastSpinDate DateTime @default(now())
  totalSpins   Int      @default(0)
  
  user         User     @relation(fields: [userId], references: [id])
  
  @@map("lottery_user_limits")
}

// Update User model - ADD these relations:
model User {
  // ... existing fields ...
  
  lotterySpins     LotterySpin[]
  lotteryLimit     LotteryUserLimit?
}
```

---

### **3. Backend API Routes**

#### **`app/api/lottery/spin/route.ts`** (NEW)
```typescript
import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { selectWeightedPrize } from '@/lib/lottery/prizeSelection'
import { grantPrize } from '@/lib/lottery/prizeGrant'
import { checkUserLimits, updateUserLimits } from '@/lib/lottery/limits'

export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // 1. Проверить лимиты пользователя
    const canSpin = await checkUserLimits(userId)
    if (!canSpin.allowed) {
      return NextResponse.json(
        { 
          error: 'Spin limit exceeded',
          details: canSpin.details
        },
        { status: 429 }
      )
    }

    // 2. Получить активные призы
    const prizes = await prisma.lotteryPrize.findMany({
      where: { isActive: true }
    })

    if (prizes.length === 0) {
      return NextResponse.json(
        { error: 'No active prizes available' },
        { status: 503 }
      )
    }

    // 3. Выбрать приз (weighted random на сервере)
    const selectedPrize = selectWeightedPrize(prizes)

    // 4. Выдать приз (SOL transfer / PostPurchase / Tokens)
    const grantResult = await grantPrize(userId, selectedPrize)

    if (!grantResult.success) {
      return NextResponse.json(
        { error: 'Failed to grant prize', details: grantResult.error },
        { status: 500 }
      )
    }

    // 5. Сохранить запись о розыгрыше
    const spin = await prisma.lotterySpin.create({
      data: {
        userId,
        prizeId: selectedPrize.id,
        prizeType: selectedPrize.type,
        prizeValue: selectedPrize.value,
        postId: selectedPrize.postId,
      }
    })

    // 6. Обновить лимиты пользователя
    await updateUserLimits(userId)

    // 7. Вернуть результат
    return NextResponse.json({
      success: true,
      prize: {
        id: selectedPrize.id,
        type: selectedPrize.type,
        value: selectedPrize.value,
        label: selectedPrize.label,
        postId: selectedPrize.postId,
      },
      txSignature: grantResult.txSignature, // Если SOL
      spinId: spin.id
    })

  } catch (error) {
    console.error('[Lottery Spin] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

#### **`app/api/lottery/prizes/route.ts`** (NEW)
```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const revalidate = 0

export async function GET() {
  try {
    const prizes = await prisma.lotteryPrize.findMany({
      where: { isActive: true },
      select: {
        id: true,
        type: true,
        label: true,
        probability: true,
      }
    })

    return NextResponse.json({ prizes })

  } catch (error) {
    console.error('[Lottery Prizes] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prizes' },
      { status: 500 }
    )
  }
}
```

#### **`app/api/lottery/history/route.ts`** (NEW)
```typescript
import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Получить историю спинов
    const spins = await prisma.lotterySpin.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 50, // Last 50 spins
      include: {
        prize: {
          select: {
            type: true,
            label: true,
          }
        }
      }
    })

    // Получить лимиты пользователя
    const limits = await prisma.lotteryUserLimit.findUnique({
      where: { userId }
    })

    // Рассчитать оставшиеся спины
    const now = new Date()
    const lastSpinDate = limits?.lastSpinDate || now
    const isToday = lastSpinDate.toDateString() === now.toDateString()
    const spinsToday = isToday ? (limits?.spinsToday || 0) : 0
    const remainingToday = Math.max(0, 5 - spinsToday) // MAX_SPINS_PER_DAY = 5

    return NextResponse.json({
      spins: spins.map(s => ({
        timestamp: s.timestamp,
        prize: {
          type: s.prizeType,
          value: s.prizeValue,
          label: s.prize.label,
        }
      })),
      stats: {
        totalSpins: limits?.totalSpins || 0,
        spinsToday,
        remainingToday,
      }
    })

  } catch (error) {
    console.error('[Lottery History] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    )
  }
}
```

#### **`app/api/lottery/config/route.ts`** (NEW - ADMIN ONLY)
```typescript
import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const revalidate = 0

// GET: Получить конфигурацию (admin only)
export async function GET(request: NextRequest) {
  // TODO: Add admin auth check
  
  try {
    const prizes = await prisma.lotteryPrize.findMany({
      orderBy: { probability: 'desc' }
    })

    return NextResponse.json({ prizes })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch config' },
      { status: 500 }
    )
  }
}

// POST: Обновить конфигурацию (admin only)
export async function POST(request: NextRequest) {
  // TODO: Add admin auth check
  
  try {
    const body = await request.json()
    const { prizes } = body

    // Validate probabilities sum to ~1.0
    const totalProb = prizes.reduce((sum: number, p: any) => sum + p.probability, 0)
    if (Math.abs(totalProb - 1.0) > 0.01) {
      return NextResponse.json(
        { error: 'Probabilities must sum to 1.0' },
        { status: 400 }
      )
    }

    // Update prizes (simplified - в реальности нужна транзакция)
    for (const prize of prizes) {
      await prisma.lotteryPrize.upsert({
        where: { id: prize.id || 'new' },
        create: prize,
        update: prize,
      })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update config' },
      { status: 500 }
    )
  }
}
```

---

### **4. Utility Functions**

#### **`lib/lottery/prizeSelection.ts`** (NEW)
```typescript
import { LotteryPrize } from '@prisma/client'

/**
 * Выбирает приз с учётом вероятностей (weighted random)
 * КРИТИЧНО: Только на сервере, никогда не на клиенте!
 */
export function selectWeightedPrize(prizes: LotteryPrize[]): LotteryPrize {
  // Normalize probabilities
  const totalProb = prizes.reduce((sum, p) => sum + p.probability, 0)
  const normalized = prizes.map(p => ({
    ...p,
    normalizedProb: p.probability / totalProb
  }))

  // Weighted random selection
  const random = Math.random()
  let cumulative = 0

  for (const prize of normalized) {
    cumulative += prize.normalizedProb
    if (random < cumulative) {
      return prize
    }
  }

  // Fallback (should never reach here)
  return prizes[0]
}
```

#### **`lib/lottery/prizeGrant.ts`** (NEW)
```typescript
import { LotteryPrize, LotteryPrizeType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction, SystemProgram } from '@solana/web3.js'

interface GrantResult {
  success: boolean
  txSignature?: string
  error?: string
}

/**
 * Выдаёт приз пользователю
 */
export async function grantPrize(
  userId: string,
  prize: LotteryPrize
): Promise<GrantResult> {
  try {
    switch (prize.type) {
      case LotteryPrizeType.SOLANA:
        return await grantSOLPrize(userId, prize.value!)

      case LotteryPrizeType.POST:
        return await grantPostPrize(userId, prize.postId!)

      case LotteryPrizeType.TOKENS:
        return await grantTokenPrize(userId, prize.value!)

      default:
        return { success: false, error: 'Unknown prize type' }
    }
  } catch (error) {
    console.error('[Prize Grant] Error:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Выдать SOL приз
 * Переиспользуем логику из app/api/user/route.ts:sendRegistrationReward()
 */
async function grantSOLPrize(userId: string, amountSOL: number): Promise<GrantResult> {
  try {
    // Получить wallet пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { wallet: true }
    })

    if (!user || !user.wallet) {
      return { success: false, error: 'User wallet not found' }
    }

    // Solana connection
    const RPC_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    const connection = new Connection(RPC_ENDPOINT, 'confirmed')

    // Sender keypair (platform wallet)
    const SENDER_PRIVATE_KEY = process.env.LOTTERY_SENDER_PRIVATE_KEY
    if (!SENDER_PRIVATE_KEY) {
      throw new Error('LOTTERY_SENDER_PRIVATE_KEY not configured')
    }

    const secretKey = Uint8Array.from(JSON.parse(SENDER_PRIVATE_KEY))
    const senderKeypair = Keypair.fromSecretKey(secretKey)

    // Recipient
    const recipientPublicKey = new PublicKey(user.wallet)

    // Check balance
    const senderBalance = await connection.getBalance(senderKeypair.publicKey)
    const amountLamports = Math.floor(amountSOL * LAMPORTS_PER_SOL)

    if (senderBalance < amountLamports + 5000) {
      return { success: false, error: 'Insufficient platform balance' }
    }

    // Create transaction
    const { blockhash } = await connection.getLatestBlockhash('confirmed')
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: senderKeypair.publicKey
    }).add(
      SystemProgram.transfer({
        fromPubkey: senderKeypair.publicKey,
        toPubkey: recipientPublicKey,
        lamports: amountLamports
      })
    )

    // Send & confirm
    const signature = await connection.sendTransaction(
      transaction,
      [senderKeypair],
      { skipPreflight: false, preflightCommitment: 'confirmed' }
    )

    await connection.confirmTransaction(signature, 'confirmed')

    console.log('[Lottery Prize] SOL sent:', {
      user: userId,
      amount: amountSOL,
      signature
    })

    return { success: true, txSignature: signature }

  } catch (error) {
    console.error('[Lottery Prize] SOL error:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Выдать Post приз
 * Переиспользуем логику из app/api/posts/process-payment/route.ts
 */
async function grantPostPrize(userId: string, postId: string): Promise<GrantResult> {
  try {
    // Проверить что пост существует
    const post = await prisma.post.findUnique({
      where: { id: postId }
    })

    if (!post) {
      return { success: false, error: 'Post not found' }
    }

    // Проверить что у юзера ещё нет доступа
    const existingPurchase = await prisma.postPurchase.findFirst({
      where: {
        postId,
        userId
      }
    })

    if (existingPurchase) {
      // Уже есть доступ - считаем успехом
      return { success: true }
    }

    // Создать запись о "покупке" (через лотерею)
    await prisma.postPurchase.create({
      data: {
        postId,
        userId,
        price: 0, // Free (lottery prize)
        currency: 'LOTTERY',
        txSignature: `lottery-${Date.now()}`,
        paymentStatus: 'COMPLETED',
        creatorAmount: 0
      }
    })

    console.log('[Lottery Prize] Post access granted:', {
      user: userId,
      post: postId
    })

    return { success: true }

  } catch (error) {
    console.error('[Lottery Prize] Post error:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Выдать Token приз
 */
async function grantTokenPrize(userId: string, amount: number): Promise<GrantResult> {
  try {
    // Обновить dogWaterTokens
    await prisma.user.update({
      where: { id: userId },
      data: {
        dogWaterTokens: {
          increment: amount
        }
      }
    })

    console.log('[Lottery Prize] Tokens granted:', {
      user: userId,
      amount
    })

    return { success: true }

  } catch (error) {
    console.error('[Lottery Prize] Tokens error:', error)
    return { success: false, error: String(error) }
  }
}
```

#### **`lib/lottery/limits.ts`** (NEW)
```typescript
import { prisma } from '@/lib/prisma'

const MAX_SPINS_PER_DAY = 5
const MAX_SPINS_PER_HOUR = 2
const MIN_INTERVAL_SECONDS = 300 // 5 minutes

interface LimitCheck {
  allowed: boolean
  details?: {
    reason: string
    remainingToday: number
    nextSpinAt?: Date
  }
}

/**
 * Проверить лимиты пользователя
 */
export async function checkUserLimits(userId: string): Promise<LimitCheck> {
  try {
    const now = new Date()

    // Получить или создать запись лимитов
    let limits = await prisma.lotteryUserLimit.findUnique({
      where: { userId }
    })

    if (!limits) {
      // Первый спин - создать запись
      limits = await prisma.lotteryUserLimit.create({
        data: {
          userId,
          spinsToday: 0,
          lastSpinDate: now,
          totalSpins: 0
        }
      })
    }

    // Проверка 1: Reset daily counter if new day
    const lastSpinDate = new Date(limits.lastSpinDate)
    const isNewDay = lastSpinDate.toDateString() !== now.toDateString()

    if (isNewDay) {
      // Reset daily counter
      await prisma.lotteryUserLimit.update({
        where: { userId },
        data: { spinsToday: 0, lastSpinDate: now }
      })
      limits.spinsToday = 0
    }

    // Проверка 2: Daily limit
    if (limits.spinsToday >= MAX_SPINS_PER_DAY) {
      return {
        allowed: false,
        details: {
          reason: 'Daily limit exceeded',
          remainingToday: 0
        }
      }
    }

    // Проверка 3: Minimum interval between spins
    const timeSinceLastSpin = (now.getTime() - lastSpinDate.getTime()) / 1000
    if (timeSinceLastSpin < MIN_INTERVAL_SECONDS) {
      const nextSpinAt = new Date(lastSpinDate.getTime() + MIN_INTERVAL_SECONDS * 1000)
      return {
        allowed: false,
        details: {
          reason: 'Too soon after last spin',
          remainingToday: MAX_SPINS_PER_DAY - limits.spinsToday,
          nextSpinAt
        }
      }
    }

    // Проверка 4: Hourly limit (опционально, можно добавить позже)
    // TODO: Check hourly limit

    // Все проверки пройдены
    return {
      allowed: true,
      details: {
        reason: 'OK',
        remainingToday: MAX_SPINS_PER_DAY - limits.spinsToday - 1
      }
    }

  } catch (error) {
    console.error('[Lottery Limits] Check error:', error)
    return { allowed: false }
  }
}

/**
 * Обновить лимиты после успешного спина
 */
export async function updateUserLimits(userId: string): Promise<void> {
  try {
    const now = new Date()

    await prisma.lotteryUserLimit.upsert({
      where: { userId },
      create: {
        userId,
        spinsToday: 1,
        lastSpinDate: now,
        totalSpins: 1
      },
      update: {
        spinsToday: { increment: 1 },
        lastSpinDate: now,
        totalSpins: { increment: 1 }
      }
    })

  } catch (error) {
    console.error('[Lottery Limits] Update error:', error)
  }
}
```

---

### **5. Frontend Components**

#### **`components/LotteryWheel.tsx`** (NEW)
```typescript
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface Prize {
  id: string
  type: string
  label: string
  probability: number
}

interface LotteryWheelProps {
  prizes: Prize[]
  onSpin: () => Promise<{ prize: Prize }>
  disabled: boolean
}

export default function LotteryWheel({ prizes, onSpin, disabled }: LotteryWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState<Prize | null>(null)

  const sectorAngle = 360 / prizes.length

  const handleSpin = async () => {
    if (isSpinning || disabled) return

    setIsSpinning(true)
    setResult(null)

    try {
      // Call API
      const response = await onSpin()
      const winningPrize = response.prize

      // Calculate winning rotation
      const winningIndex = prizes.findIndex(p => p.id === winningPrize.id)
      const targetAngle = 360 * 5 + (winningIndex * sectorAngle) // 5 full rotations + target
      
      setRotation(targetAngle)

      // Wait for animation to finish
      setTimeout(() => {
        setResult(winningPrize)
        setIsSpinning(false)
      }, 5000) // 5s animation

    } catch (error) {
      console.error('Spin error:', error)
      setIsSpinning(false)
    }
  }

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Wheel container */}
      <div className="relative w-full aspect-square">
        {/* Rotating wheel */}
        <motion.div
          className="absolute inset-0 rounded-full overflow-hidden shadow-2xl"
          animate={{ rotate: rotation }}
          transition={{
            duration: 5,
            ease: [0.17, 0.67, 0.12, 0.99] // Custom easing for deceleration
          }}
        >
          {/* Prize sectors */}
          {prizes.map((prize, i) => (
            <div
              key={prize.id}
              className="absolute w-full h-full"
              style={{
                transform: `rotate(${i * sectorAngle}deg)`,
                clipPath: `polygon(50% 50%, 100% 0%, 100% ${100 / prizes.length}%)`
              }}
            >
              <div className={`w-full h-full flex items-center justify-center text-white font-bold ${
                i % 2 === 0 
                  ? 'bg-gradient-to-br from-purple-600 to-pink-600' 
                  : 'bg-gradient-to-br from-purple-700 to-pink-700'
              }`}>
                <span className="text-sm">{prize.label}</span>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Center pointer (arrow) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="w-0 h-0 border-l-8 border-r-8 border-t-12 border-l-transparent border-r-transparent border-t-white" />
        </div>

        {/* Center button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={handleSpin}
            disabled={isSpinning || disabled}
            className="w-24 h-24 rounded-full bg-white shadow-xl font-bold text-lg disabled:opacity-50 hover:scale-105 transition-transform"
          >
            {isSpinning ? 'Spinning...' : 'SPIN'}
          </button>
        </div>
      </div>

      {/* Result display */}
      {result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-6 p-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl text-white text-center"
        >
          <h3 className="text-2xl font-bold mb-2">🎉 You Won!</h3>
          <p className="text-xl">{result.label}</p>
        </motion.div>
      )}
    </div>
  )
}
```

#### **`components/LotteryModal.tsx`** (NEW)
```typescript
'use client'

import { useState, useEffect } from 'react'
import { useUser, useWallet } from '@/lib/hooks'
import LotteryWheel from './LotteryWheel'
import { XMarkIcon, ClockIcon, SparklesIcon } from '@heroicons/react/24/outline'

interface LotteryModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function LotteryModal({ isOpen, onClose }: LotteryModalProps) {
  const { user } = useUser()
  const { publicKey } = useWallet()
  const [prizes, setPrizes] = useState([])
  const [stats, setStats] = useState({ spinsToday: 0, remainingToday: 5, totalSpins: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen && user) {
      fetchData()
    }
  }, [isOpen, user])

  const fetchData = async () => {
    try {
      // Fetch prizes
      const prizesRes = await fetch('/api/lottery/prizes')
      const prizesData = await prizesRes.json()
      setPrizes(prizesData.prizes)

      // Fetch user history & stats
      const historyRes = await fetch(`/api/lottery/history?userId=${user?.id}`)
      const historyData = await historyRes.json()
      setStats(historyData.stats)

      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch lottery data:', error)
    }
  }

  const handleSpin = async () => {
    try {
      const res = await fetch('/api/lottery/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error)
      }

      const data = await res.json()
      
      // Refresh stats
      await fetchData()

      return data
    } catch (error) {
      console.error('Spin failed:', error)
      throw error
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl p-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <SparklesIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Lottery Wheel
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-6 mb-6 text-gray-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <ClockIcon className="w-5 h-5" />
            <span>Spins remaining today: <strong>{stats.remainingToday}</strong></span>
          </div>
          <div>
            Total spins: <strong>{stats.totalSpins}</strong>
          </div>
        </div>

        {/* Wheel */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : (
          <LotteryWheel
            prizes={prizes}
            onSpin={handleSpin}
            disabled={stats.remainingToday <= 0 || !publicKey}
          />
        )}

        {/* Footer message */}
        {stats.remainingToday <= 0 && (
          <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-center text-orange-700 dark:text-orange-300">
            Come back tomorrow for more spins! 🎰
          </div>
        )}
      </div>
    </div>
  )
}
```

#### **`components/LotteryPrizeAnimation.tsx`** (NEW - опционально)
```typescript
'use client'

import Confetti from 'react-confetti'
import { useWindowSize } from 'react-use'

interface LotteryPrizeAnimationProps {
  prize: {
    type: string
    label: string
  }
  onClose: () => void
}

export default function LotteryPrizeAnimation({ prize, onClose }: LotteryPrizeAnimationProps) {
  const { width, height } = useWindowSize()

  return (
    <>
      <Confetti
        width={width}
        height={height}
        recycle={false}
        numberOfPieces={500}
        gravity={0.3}
      />
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl text-center animate-bounce">
          <h2 className="text-4xl font-bold mb-4">🎉 Congratulations!</h2>
          <p className="text-2xl mb-6">You won: <strong>{prize.label}</strong></p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold"
          >
            Awesome!
          </button>
        </div>
      </div>
    </>
  )
}
```

---

### **6. Integration Changes**

#### **`components/LeftSidebar.tsx`** (UPDATE)
```tsx
// Add import
import { SparklesIcon } from '@heroicons/react/24/outline' // If not already imported

// Add state for lottery modal
const [showLotteryModal, setShowLotteryModal] = useState(false)

// Add NavItem for lottery (after "Messages" or wherever appropriate)
<div onClick={handleNavItemClick}>
  <NavItem 
    href="#" 
    icon={SparklesIcon} 
    label="Lottery" 
    onClick={() => setShowLotteryModal(true)}
  />
</div>

// Add modal at end of component
{showLotteryModal && (
  <LotteryModal 
    isOpen={showLotteryModal}
    onClose={() => setShowLotteryModal(false)}
  />
)}
```

---

## 📦 **DEPENDENCIES**

### **New NPM Packages**

```json
{
  "react-confetti": "^6.1.0"  // For prize win animation
}
```

Install:
```bash
npm install react-confetti
```

---

## 🔧 **ENVIRONMENT VARIABLES**

### **`.env` / `.env.local`** (UPDATE)

```bash
# Lottery System
LOTTERY_SENDER_PRIVATE_KEY="[1,2,3,...]"  # Platform wallet for sending SOL prizes
# Same format as SENDER_PRIVATE_KEY used for registration rewards
```

---

## 🗂️ **SEED DATA**

### **`prisma/seed-lottery.ts`** (NEW - optional)
```typescript
import { PrismaClient, LotteryPrizeType } from '@prisma/client'

const prisma = new PrismaClient()

async function seedLotteryPrizes() {
  console.log('Seeding lottery prizes...')

  const prizes = [
    {
      type: LotteryPrizeType.SOLANA,
      value: 0.01,
      label: '0.01 SOL',
      probability: 0.15,
    },
    {
      type: LotteryPrizeType.SOLANA,
      value: 0.005,
      label: '0.005 SOL',
      probability: 0.25,
    },
    {
      type: LotteryPrizeType.TOKENS,
      value: 100,
      label: '100 Tokens',
      probability: 0.20,
    },
    {
      type: LotteryPrizeType.TOKENS,
      value: 50,
      label: '50 Tokens',
      probability: 0.20,
    },
    {
      type: LotteryPrizeType.TOKENS,
      value: 10,
      label: '10 Tokens',
      probability: 0.10,
    },
    // NOTE: POST prizes need to be added manually with specific postId
  ]

  for (const prize of prizes) {
    await prisma.lotteryPrize.create({ data: prize })
  }

  console.log('Lottery prizes seeded!')
}

seedLotteryPrizes()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
  })
```

Run:
```bash
npx ts-node prisma/seed-lottery.ts
```

---

## ✅ **TESTING CHECKLIST**

### **Backend Testing**

- [ ] Migration applies successfully
- [ ] Prisma generate works
- [ ] POST `/api/lottery/spin` returns prize
- [ ] GET `/api/lottery/prizes` returns config
- [ ] GET `/api/lottery/history` returns user data
- [ ] Limits enforced (5/day, interval)
- [ ] SOL transfer works (testnet first)
- [ ] Post access granted correctly
- [ ] Tokens incremented correctly

### **Frontend Testing**

- [ ] Modal opens/closes
- [ ] Wheel renders correctly
- [ ] Spin animation smooth
- [ ] Prize reveal works
- [ ] Stats update after spin
- [ ] Disabled state when limit reached
- [ ] Responsive on mobile
- [ ] Dark mode compatible

---

## 🚀 **DEPLOYMENT STEPS**

### **Phase 1: Database & Backend**

1. ✅ Apply Prisma migration
2. ✅ Run Prisma generate
3. ✅ Seed initial prizes
4. ✅ Configure `LOTTERY_SENDER_PRIVATE_KEY`
5. ✅ Test API endpoints (Postman/curl)

### **Phase 2: Frontend**

6. ✅ Install dependencies (`react-confetti`)
7. ✅ Add components
8. ✅ Update LeftSidebar integration
9. ✅ Test UI locally

### **Phase 3: Production**

10. ✅ Test on testnet first (use devnet SOL)
11. ✅ Deploy to production
12. ✅ Monitor first 24h for issues
13. ✅ Adjust prize probabilities based on usage

---

## 📊 **MONITORING & ANALYTICS**

### **Key Metrics to Track**

```typescript
// Analytics events to add
analytics.track('lottery_spin_attempted', { userId, timestamp })
analytics.track('lottery_spin_success', { userId, prizeType, prizeValue })
analytics.track('lottery_spin_failed', { userId, reason })
analytics.track('lottery_modal_opened', { userId })
```

---

**Status:** ✅ Solution Plan Complete  
**Next Phase:** Implementation  
**Estimated Time:** 6-10 days

