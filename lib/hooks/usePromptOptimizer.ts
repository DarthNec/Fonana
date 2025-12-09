import { useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'

interface OptimizeResult {
  optimizedPrompt: string
  originalPrompt: string
  hasWarning: boolean
  warningMessage: string | null
  modifiedContent: string[]
}

interface UsePromptOptimizerReturn {
  optimizedPrompt: string | null
  isOptimizing: boolean
  error: string | null
  hasWarning: boolean
  warningMessage: string | null
  modifiedContent: string[]
  optimizePrompt: (prompt: string, showToast?: boolean) => Promise<string | null>
  clearOptimization: () => void
}

/**
 * Hook для оптимизации промптов через OpenAI
 * Автоматически обнаруживает и модифицирует недопустимый контент
 * 
 * @example
 * ```tsx
 * const { optimizedPrompt, isOptimizing, hasWarning, optimizePrompt } = usePromptOptimizer()
 * 
 * const handleOptimize = async () => {
 *   const result = await optimizePrompt(userPrompt, true)
 *   if (result) {
 *     // Используем оптимизированный промпт
 *     setFormData(prev => ({ ...prev, soraPrompt: result }))
 *   }
 * }
 * ```
 */
export function usePromptOptimizer(): UsePromptOptimizerReturn {
  const [optimizedPrompt, setOptimizedPrompt] = useState<string | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasWarning, setHasWarning] = useState(false)
  const [warningMessage, setWarningMessage] = useState<string | null>(null)
  const [modifiedContent, setModifiedContent] = useState<string[]>([])

  const optimizePrompt = useCallback(async (
    prompt: string,
    showToast: boolean = true
  ): Promise<string | null> => {
    if (!prompt || !prompt.trim()) {
      const errorMsg = 'Prompt cannot be empty'
      setError(errorMsg)
      if (showToast) {
        toast.error(errorMsg)
      }
      return null
    }

    setIsOptimizing(true)
    setError(null)
    setHasWarning(false)
    setWarningMessage(null)
    setModifiedContent([])

    try {
      console.log('[usePromptOptimizer] Sending prompt for optimization:', {
        length: prompt.length,
        preview: prompt.substring(0, 50) + '...'
      })

      const response = await fetch('/api/sora/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to optimize prompt')
      }

      const data: OptimizeResult & { success: boolean } = await response.json()

      console.log('[usePromptOptimizer] Optimization complete:', {
        hasWarning: data.hasWarning,
        originalLength: data.originalPrompt.length,
        optimizedLength: data.optimizedPrompt.length,
        modifiedElements: data.modifiedContent?.length || 0
      })

      setOptimizedPrompt(data.optimizedPrompt)
      setHasWarning(data.hasWarning)
      setWarningMessage(data.warningMessage)
      setModifiedContent(data.modifiedContent || [])

      // Показываем уведомление
      if (showToast) {
        if (data.hasWarning) {
          // Если был изменён контент - показываем предупреждение
          toast.error(
            data.warningMessage || 'Prompt содержал недопустимый контент и был изменён',
            {
              duration: 8000,
              icon: '⚠️',
              style: {
                maxWidth: '500px'
              }
            }
          )
        } else {
          // Успешная оптимизация без предупреждений
          toast.success('✨ Prompt оптимизирован для Sora-2!', {
            duration: 3000
          })
        }
      }

      return data.optimizedPrompt

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to optimize prompt'
      console.error('[usePromptOptimizer] Optimization error:', err)
      
      setError(errorMessage)
      
      if (showToast) {
        toast.error(`Ошибка оптимизации: ${errorMessage}`, {
          duration: 5000
        })
      }
      
      return null

    } finally {
      setIsOptimizing(false)
    }
  }, [])

  const clearOptimization = useCallback(() => {
    setOptimizedPrompt(null)
    setError(null)
    setHasWarning(false)
    setWarningMessage(null)
    setModifiedContent([])
  }, [])

  return {
    optimizedPrompt,
    isOptimizing,
    error,
    hasWarning,
    warningMessage,
    modifiedContent,
    optimizePrompt,
    clearOptimization
  }
}

