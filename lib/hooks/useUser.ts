'use client'

import { useUserContext } from '@/lib/contexts/UserContext'

// Экспорт типов из контекста для обратной совместимости
export type { User, ProfileData } from '@/lib/contexts/UserContext'

/**
 * @deprecated Используйте useUserContext из '@/lib/contexts/UserContext'
 * Этот хук оставлен для обратной совместимости и будет удален после миграции всех компонентов
 */
export function useUser() {
  console.warn('[DEPRECATED] useUser from lib/hooks/useUser is deprecated. Import from UserContext instead.')
  return useUserContext()
} 