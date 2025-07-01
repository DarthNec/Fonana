'use client'

import React, { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      icon,
      iconPosition = 'left',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      inline-flex items-center justify-center font-medium transition-all duration-300
      rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:cursor-not-allowed disabled:opacity-50
    `

    const variants = {
      primary: `
        bg-gradient-to-r from-purple-600 to-pink-600 text-white
        hover:from-purple-700 hover:to-pink-700
        focus:ring-purple-500 focus:ring-offset-slate-900
        shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30
        hover:transform hover:scale-105 active:scale-100
      `,
      secondary: `
        bg-slate-800/50 border border-slate-700/50 text-slate-300
        hover:bg-slate-700/50 hover:border-slate-600/50 hover:text-white
        focus:ring-slate-500 focus:ring-offset-slate-900
        backdrop-blur-sm
      `,
      ghost: `
        bg-transparent text-slate-400
        hover:bg-slate-800/50 hover:text-white
        focus:ring-slate-500 focus:ring-offset-slate-900
      `,
      danger: `
        bg-gradient-to-r from-red-600 to-rose-600 text-white
        hover:from-red-700 hover:to-rose-700
        focus:ring-red-500 focus:ring-offset-slate-900
        shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30
      `,
      success: `
        bg-gradient-to-r from-green-600 to-emerald-600 text-white
        hover:from-green-700 hover:to-emerald-700
        focus:ring-green-500 focus:ring-offset-slate-900
        shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30
      `
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2.5 text-base gap-2',
      lg: 'px-6 py-3 text-lg gap-2.5'
    }

    const iconSizes = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6'
    }

    const LoadingSpinner = () => (
      <svg
        className={cn('animate-spin', iconSizes[size])}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    )

    const iconElement = loading ? <LoadingSpinner /> : icon

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          loading && 'cursor-wait',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {iconElement && iconPosition === 'left' && (
          <span className={cn(iconSizes[size], 'flex-shrink-0')}>
            {iconElement}
          </span>
        )}
        
        {children}
        
        {iconElement && iconPosition === 'right' && (
          <span className={cn(iconSizes[size], 'flex-shrink-0')}>
            {iconElement}
          </span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button 