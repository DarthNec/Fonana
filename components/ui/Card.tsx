'use client'

import React, { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'bordered' | 'elevated'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hoverable?: boolean
  clickable?: boolean
  fullHeight?: boolean
}

const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  padding = 'md',
  hoverable = false,
  clickable = false,
  fullHeight = false,
  onClick,
  ...props
}) => {
  const baseStyles = `
    relative
    rounded-2xl
    transition-all duration-300
    overflow-hidden
  `

  const variants = {
    default: `
      bg-slate-800/50
      backdrop-blur-sm
      border border-slate-700/50
    `,
    glass: `
      bg-slate-900/20
      backdrop-blur-xl
      border border-slate-700/30
      shadow-lg
    `,
    bordered: `
      bg-transparent
      border-2 border-slate-700/50
    `,
    elevated: `
      bg-slate-800/80
      backdrop-blur-sm
      shadow-xl shadow-black/20
      border border-slate-700/30
    `
  }

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  const hoverStyles = hoverable ? `
    hover:transform hover:scale-[1.02]
    hover:shadow-2xl hover:shadow-purple-500/10
    hover:border-purple-500/50
  ` : ''

  const clickableStyles = clickable ? `
    cursor-pointer
    active:scale-[0.98]
  ` : ''

  return (
    <div
      className={cn(
        baseStyles,
        variants[variant],
        paddings[padding],
        hoverStyles,
        clickableStyles,
        fullHeight && 'h-full',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {/* Gradient overlay for glass effect */}
      {variant === 'glass' && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 pointer-events-none" />
      )}
      
      {children}
    </div>
  )
}

export default Card 