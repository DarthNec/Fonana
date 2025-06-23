// Курсы валют для отображения пользователям
// Обновляется вручную или через скрипт периодически
// Последнее обновление: декабрь 2024

export const EXCHANGE_RATES = {
  SOL_USD: 135, // Текущий курс Solana к доллару
  BTC_USD: 95000,
  ETH_USD: 3500,
  lastUpdate: '2024-12-23',
} as const

// Хелпер для конвертации
export function convertSolToUsd(solAmount: number): number {
  return solAmount * EXCHANGE_RATES.SOL_USD
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