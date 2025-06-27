import { normalizeTierName } from '@/lib/utils/access'

/**
 * Форматирует имя плана для отображения
 */
export function formatPlanName(plan: string | null | undefined): string {
  if (!plan) return 'Free'
  
  const normalized = normalizeTierName(plan)
  if (!normalized) return plan
  
  // Capitalize first letter
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

/**
 * Проверяет, является ли план платным
 */
export function isPaidPlan(plan: string | null | undefined): boolean {
  const normalized = normalizeTierName(plan)
  return normalized !== null && normalized !== 'free'
}

/**
 * Возвращает следующий доступный тир для апгрейда
 */
export function getNextTier(currentTier: string | null | undefined): string | null {
  const normalized = normalizeTierName(currentTier)
  
  switch (normalized) {
    case null:
    case 'free':
      return 'basic'
    case 'basic':
      return 'premium'
    case 'premium':
      return 'vip'
    case 'vip':
      return null // Уже максимальный тир
    default:
      return null
  }
}

/**
 * Проверяет, можно ли апгрейдить подписку
 */
export function canUpgradeTier(currentTier: string | null | undefined): boolean {
  return getNextTier(currentTier) !== null
} 