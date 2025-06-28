import { normalizeTierName } from '@/lib/utils/access'
import { toast } from 'react-hot-toast'

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

/**
 * Обновляет состояние подписки в реальном времени после оплаты
 */
export async function refreshSubscriptionStatus(creatorId: string): Promise<void> {
  try {
    // Принудительно обновляем данные пользователя через UserContext
    const refreshUser = (window as any).__refreshUser
    if (refreshUser && typeof refreshUser === 'function') {
      await refreshUser()
    }
    
    // Перезагружаем страницу если находимся на странице создателя
    if (window.location.pathname.includes(`/creator/${creatorId}`)) {
      // Используем мягкую перезагрузку с сохранением позиции скролла
      const scrollPosition = window.scrollY
      window.location.reload()
      
      // Восстанавливаем позицию после загрузки
      window.addEventListener('load', () => {
        window.scrollTo(0, scrollPosition)
      })
    } else {
      // На других страницах просто обновляем данные
      // Отправляем событие для обновления постов
      window.dispatchEvent(new CustomEvent('subscription-updated', { 
        detail: { creatorId } 
      }))
    }
  } catch (error) {
    console.error('Error refreshing subscription status:', error)
  }
}

/**
 * Обновляет доступ к посту после покупки
 */
export async function refreshPostAccess(postId: string): Promise<void> {
  try {
    // Отправляем событие для обновления конкретного поста
    window.dispatchEvent(new CustomEvent('post-purchased', { 
      detail: { postId } 
    }))
    
    // Показываем успешное уведомление
    toast.success('Content unlocked! Enjoy your purchase.', {
      duration: 3000,
      position: 'top-center'
    })
  } catch (error) {
    console.error('Error refreshing post access:', error)
  }
}

/**
 * Слушатель обновлений подписок для компонентов
 */
export function useSubscriptionUpdates(callback: (event: CustomEvent) => void) {
  if (typeof window === 'undefined') return
  
  const handleUpdate = (event: Event) => {
    callback(event as CustomEvent)
  }
  
  window.addEventListener('subscription-updated', handleUpdate)
  
  return () => {
    window.removeEventListener('subscription-updated', handleUpdate)
  }
}

/**
 * Слушатель покупок постов для компонентов
 */
export function usePostPurchaseUpdates(callback: (event: CustomEvent) => void) {
  if (typeof window === 'undefined') return
  
  const handleUpdate = (event: Event) => {
    callback(event as CustomEvent)
  }
  
  window.addEventListener('post-purchased', handleUpdate)
  
  return () => {
    window.removeEventListener('post-purchased', handleUpdate)
  }
} 