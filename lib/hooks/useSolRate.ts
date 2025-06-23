'use client'

import { useState, useEffect } from 'react'

// Хук для получения курса SOL/USD
export function useSolRate() {
  const [rate, setRate] = useState<number>(135) // Дефолтное значение
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    // Загружаем курс при монтировании
    fetch('/api/pricing')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.rate) {
          setRate(data.rate)
        }
      })
      .catch(err => {
        console.error('Error loading SOL rate:', err)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])
  
  return { rate, isLoading }
}

// Хелпер для форматирования USD
export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
} 