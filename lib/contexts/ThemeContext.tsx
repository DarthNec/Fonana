'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'auto'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark')
  const [mounted, setMounted] = useState(false)

  // Mark as mounted after hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Only run on client side after mounting
    if (!mounted || typeof window === 'undefined') return

    // Load saved theme from localStorage
    try {
      const savedTheme = localStorage.getItem('theme') as Theme
      if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
        setTheme(savedTheme)
      }
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error)
    }
  }, [mounted])

  useEffect(() => {
    // Only run on client side after mounting
    if (!mounted || typeof window === 'undefined') return

    // Apply theme to document
    let actualTheme: 'light' | 'dark' = 'dark'
    
    if (theme === 'auto') {
      // Check system preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      actualTheme = mediaQuery.matches ? 'dark' : 'light'
      
      // Listen for changes
      const handleChange = (e: MediaQueryListEvent) => {
        actualTheme = e.matches ? 'dark' : 'light'
        setResolvedTheme(actualTheme)
        applyTheme(actualTheme)
      }
      
      mediaQuery.addEventListener('change', handleChange)
      
      return () => {
        mediaQuery.removeEventListener('change', handleChange)
      }
    } else {
      actualTheme = theme as 'light' | 'dark'
    }
    
    setResolvedTheme(actualTheme)
    applyTheme(actualTheme)
  }, [theme, mounted])

  const applyTheme = (theme: 'light' | 'dark') => {
    if (typeof document === 'undefined') return

    // Remove old theme class
    document.documentElement.classList.remove('light', 'dark')
    // Add new theme class
    document.documentElement.classList.add(theme)
    
    // Also update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#0f172a' : '#f8fafc')
    }
  }

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme)
    
    // Only save to localStorage on client side
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('theme', newTheme)
      } catch (error) {
        console.warn('Failed to save theme to localStorage:', error)
      }
    }
  }

  // SSR fallback: return default context without localStorage access
  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ 
        theme: 'dark', 
        setTheme: () => {}, 
        resolvedTheme: 'dark' 
      }}>
        {children}
      </ThemeContext.Provider>
    )
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  // SSR safety check
  if (typeof window === 'undefined') {
    return {
      theme: 'dark',
      setTheme: () => {},
      systemTheme: 'dark'
    }
  }
  
  const context = useContext(ThemeContext)
  // Instead of throwing an error, return safe defaults
  if (context === undefined) {
    console.warn('useTheme must be used within a ThemeProvider. Using default values.')
    return {
      theme: 'dark' as Theme,
      setTheme: () => {},
      resolvedTheme: 'dark' as 'light' | 'dark'
    }
  }
  return context
} 