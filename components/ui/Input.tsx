'use client'

import React, { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      type = 'text',
      disabled,
      ...props
    },
    ref
  ) => {
    const hasIcon = !!icon
    const hasLeftIcon = hasIcon && iconPosition === 'left'
    const hasRightIcon = hasIcon && iconPosition === 'right'

    const baseStyles = `
      w-full px-4 py-3 
      bg-slate-800/50 backdrop-blur-sm
      border border-slate-700/50
      rounded-xl
      text-white placeholder-slate-500
      transition-all duration-300
      focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
      disabled:opacity-50 disabled:cursor-not-allowed
    `

    const errorStyles = error ? `
      border-red-500/50 
      focus:ring-red-500
    ` : ''

    const iconStyles = `
      absolute top-1/2 -translate-y-1/2 
      w-5 h-5 text-slate-400
      pointer-events-none
    `

    return (
      <div className={cn('space-y-2', fullWidth && 'w-full', className)}>
        {label && (
          <label className="block text-sm font-medium text-slate-300">
            {label}
          </label>
        )}
        
        <div className="relative">
          {hasLeftIcon && (
            <div className={cn(iconStyles, 'left-4')}>
              {icon}
            </div>
          )}
          
          <input
            ref={ref}
            type={type}
            className={cn(
              baseStyles,
              errorStyles,
              hasLeftIcon && 'pl-12',
              hasRightIcon && 'pr-12'
            )}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined
            }
            {...props}
          />
          
          {hasRightIcon && (
            <div className={cn(iconStyles, 'right-4')}>
              {icon}
            </div>
          )}
        </div>
        
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
    )
  }
)

Input.displayName = 'Input'

export default Input 