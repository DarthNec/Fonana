/**
 * Безопасные утилиты форматирования чисел
 * Предотвращают ошибки "Cannot read properties of undefined (reading 'toFixed')"
 */

/**
 * Безопасный вызов toFixed для числа
 * @param value - число для форматирования (может быть undefined/null)
 * @param decimals - количество знаков после запятой (по умолчанию 2)
 * @returns отформатированная строка
 */
export function safeToFixed(value: number | null | undefined, decimals: number = 2): string {
  const safeValue = Number(value) || 0
  return safeValue.toFixed(decimals)
}

/**
 * Безопасное форматирование цены в SOL
 * @param amount - сумма в SOL
 * @param decimals - количество знаков после запятой
 * @returns отформатированная строка
 */
export function formatSolAmount(amount: number | null | undefined, decimals?: number): string {
  const safeAmount = Number(amount) || 0
  
  // Для малых сумм показываем больше знаков
  if (decimals === undefined) {
    if (safeAmount < 1 && safeAmount > 0) {
      decimals = 3
    } else {
      decimals = 2
    }
  }
  
  return `${safeToFixed(safeAmount, decimals)} SOL`
}

/**
 * Безопасное форматирование цены в USD
 * @param amount - сумма в долларах
 * @returns отформатированная строка с символом $
 */
export function formatUsdAmount(amount: number | null | undefined): string {
  const safeAmount = Number(amount) || 0
  return `$${safeToFixed(safeAmount, 2)}`
}

/**
 * Безопасное форматирование SOL в USD
 * @param solAmount - сумма в SOL
 * @param solRate - курс SOL/USD
 * @returns отформатированная строка в USD
 */
export function formatSolToUsd(solAmount: number | null | undefined, solRate: number | null | undefined): string {
  const safeSolAmount = Number(solAmount) || 0
  const safeSolRate = Number(solRate) || 135 // fallback rate
  const usdAmount = safeSolAmount * safeSolRate
  return formatUsdAmount(usdAmount)
}

/**
 * Безопасное форматирование процентов
 * @param value - значение процента
 * @param decimals - количество знаков после запятой
 * @returns отформатированная строка с %
 */
export function formatPercent(value: number | null | undefined, decimals: number = 1): string {
  const safeValue = Number(value) || 0
  return `${safeToFixed(safeValue, decimals)}%`
}

/**
 * Безопасное форматирование с валютой
 * @param amount - сумма
 * @param currency - валюта
 * @param solRate - курс SOL/USD (опционально)
 * @returns отформатированная строка
 */
export function formatCurrency(
  amount: number | null | undefined, 
  currency: string = 'SOL',
  solRate?: number | null
): string {
  const safeAmount = Number(amount) || 0
  
  if (currency === 'SOL' && solRate) {
    const usdAmount = safeAmount * (Number(solRate) || 135)
    return `${safeToFixed(safeAmount, 2)} SOL (≈ ${formatUsdAmount(usdAmount)})`
  }
  
  if (currency === 'USD') {
    return formatUsdAmount(safeAmount)
  }
  
  return `${safeToFixed(safeAmount, 2)} ${currency}`
} 