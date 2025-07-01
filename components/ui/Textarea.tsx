'use client'

import React, { TextareaHTMLAttributes, forwardRef, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  fullWidth?: boolean
  autoResize?: boolean
  showCharCount?: boolean
  maxLength?: number
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      fullWidth = false,
      autoResize = false,
      showCharCount = false,
      maxLength,
      value,
      onChange,
      disabled,
      ...props
    },
    ref
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null)

    // Auto-resize logic
    useEffect(() => {
      const textarea = textareaRef.current
      if (!textarea || !autoResize) return

      const adjustHeight = () => {
        textarea.style.height = 'auto'
        textarea.style.height = `${textarea.scrollHeight}px`
      }

      adjustHeight()
      textarea.addEventListener('input', adjustHeight)

      return () => {
        textarea.removeEventListener('input', adjustHeight)
      }
    }, [autoResize, value])

    const baseStyles = `
      w-full px-4 py-3 
      bg-slate-800/50 backdrop-blur-sm
      border border-slate-700/50
      rounded-xl
      text-white placeholder-slate-500
      transition-all duration-300
      focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
      disabled:opacity-50 disabled:cursor-not-allowed
      resize-none
    `

    const errorStyles = error ? `
      border-red-500/50 
      focus:ring-red-500
    ` : ''

    const charCount = typeof value === 'string' ? value.length : 0

    return (
      <div className={cn('space-y-2', fullWidth && 'w-full', className)}>
        {label && (
          <label className="block text-sm font-medium text-slate-300">
            {label}
          </label>
        )}
        
        <div className="relative">
          <textarea
            ref={(node) => {
              textareaRef.current = node
              if (ref) {
                if (typeof ref === 'function') {
                  ref(node)
                } else {
                  ref.current = node
                }
              }
            }}
            className={cn(baseStyles, errorStyles)}
            disabled={disabled}
            value={value}
            onChange={onChange}
            maxLength={maxLength}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined
            }
            {...props}
          />
        </div>
        
        <div className="flex justify-between items-start gap-2">
          <div>
            {error && (
              <p id={`${props.id}-error`} className="text-sm text-red-400">
                {error}
              </p>
            )}
            
            {helperText && !error && (
              <p id={`${props.id}-helper`} className="text-sm text-slate-500">
                {helperText}
              </p>
            )}
          </div>
          
          {showCharCount && maxLength && (
            <span className={cn(
              'text-sm',
              charCount > maxLength * 0.9 ? 'text-yellow-400' : 'text-slate-500'
            )}>
              {charCount}/{maxLength}
            </span>
          )}
        </div>
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export default Textarea 