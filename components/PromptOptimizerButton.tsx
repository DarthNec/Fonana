'use client'

import React from 'react'
import { SparklesIcon } from '@heroicons/react/24/outline'
import { usePromptOptimizer } from '@/lib/hooks/usePromptOptimizer'

interface PromptOptimizerButtonProps {
  prompt: string
  onOptimized: (optimizedPrompt: string) => void
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Кнопка для оптимизации промпта через OpenAI
 * Автоматически показывает предупреждения, если контент был модифицирован
 * 
 * @example
 * ```tsx
 * <PromptOptimizerButton
 *   prompt={formData.soraPrompt}
 *   onOptimized={(optimized) => setFormData(prev => ({ ...prev, soraPrompt: optimized }))}
 *   disabled={!formData.soraPrompt.trim()}
 * />
 * ```
 */
export default function PromptOptimizerButton({
  prompt,
  onOptimized,
  disabled = false,
  className = '',
  size = 'md'
}: PromptOptimizerButtonProps) {
  const { isOptimizing, optimizePrompt } = usePromptOptimizer()

  const handleOptimize = async () => {
    const result = await optimizePrompt(prompt, true)
    
    if (result) {
      onOptimized(result)
    }
  }

  // Размеры кнопки
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  return (
    <button
      type="button"
      onClick={handleOptimize}
      disabled={disabled || isOptimizing || !prompt.trim()}
      className={`
        inline-flex items-center gap-2 
        bg-gradient-to-r from-purple-500 to-pink-500 
        hover:from-purple-600 hover:to-pink-600
        text-white font-medium rounded-lg
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        hover:shadow-lg hover:scale-105
        disabled:hover:scale-100 disabled:hover:shadow-none
        ${sizeClasses[size]}
        ${className}
      `}
      title="Optimize prompt with AI"
    >
      {isOptimizing ? (
        <>
          <div className={`border-2 border-white/30 border-t-white rounded-full animate-spin ${iconSizes[size]}`} />
          <span>Optimizing...</span>
        </>
      ) : (
        <>
          <SparklesIcon className={iconSizes[size]} />
          <span>Optimize Prompt</span>
        </>
      )}
    </button>
  )
}

