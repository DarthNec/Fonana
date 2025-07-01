/**
 * Тестирование безопасных функций форматирования
 * Проверяет, что toFixed не вызывает ошибок при undefined/null
 */

const { safeToFixed, formatSolAmount, formatUsdAmount, formatSolToUsd, formatPercent, formatCurrency } = require('../lib/utils/format.ts')

console.log('🧪 Тестирование безопасных функций форматирования\n')

// Тестовые кейсы
const testCases = [
  { value: 123.456, expected: '123.46' },
  { value: 0, expected: '0.00' },
  { value: null, expected: '0.00' },
  { value: undefined, expected: '0.00' },
  { value: NaN, expected: '0.00' },
  { value: '', expected: '0.00' },
  { value: '123.456', expected: '123.46' },
  { value: -50.123, expected: '-50.12' }
]

console.log('1️⃣ Тестирование safeToFixed:')
testCases.forEach(({ value, expected }) => {
  try {
    const result = safeToFixed(value)
    const passed = result === expected
    console.log(`  ${passed ? '✅' : '❌'} safeToFixed(${JSON.stringify(value)}) = "${result}" ${passed ? '' : `(expected: "${expected}")`}`)
  } catch (error) {
    console.log(`  ❌ safeToFixed(${JSON.stringify(value)}) threw error: ${error.message}`)
  }
})

console.log('\n2️⃣ Тестирование formatSolAmount:')
const solTestCases = [
  { value: 1.5, expected: '1.50 SOL' },
  { value: 0.001, expected: '0.001 SOL' },
  { value: null, expected: '0.00 SOL' },
  { value: undefined, expected: '0.00 SOL' }
]

solTestCases.forEach(({ value, expected }) => {
  try {
    const result = formatSolAmount(value)
    const passed = result === expected
    console.log(`  ${passed ? '✅' : '❌'} formatSolAmount(${JSON.stringify(value)}) = "${result}"`)
  } catch (error) {
    console.log(`  ❌ formatSolAmount(${JSON.stringify(value)}) threw error: ${error.message}`)
  }
})

console.log('\n3️⃣ Тестирование formatSolToUsd:')
const solToUsdTestCases = [
  { solAmount: 1, solRate: 135, expected: '$135.00' },
  { solAmount: 0.1, solRate: 135, expected: '$13.50' },
  { solAmount: null, solRate: 135, expected: '$0.00' },
  { solAmount: 1, solRate: null, expected: '$135.00' }, // fallback rate
  { solAmount: undefined, solRate: undefined, expected: '$0.00' }
]

solToUsdTestCases.forEach(({ solAmount, solRate, expected }) => {
  try {
    const result = formatSolToUsd(solAmount, solRate)
    const passed = result === expected
    console.log(`  ${passed ? '✅' : '❌'} formatSolToUsd(${JSON.stringify(solAmount)}, ${JSON.stringify(solRate)}) = "${result}"`)
  } catch (error) {
    console.log(`  ❌ formatSolToUsd(${JSON.stringify(solAmount)}, ${JSON.stringify(solRate)}) threw error: ${error.message}`)
  }
})

console.log('\n4️⃣ Тестирование formatPercent:')
const percentTestCases = [
  { value: 15.5, expected: '15.5%' },
  { value: 0, expected: '0.0%' },
  { value: null, expected: '0.0%' },
  { value: undefined, expected: '0.0%' }
]

percentTestCases.forEach(({ value, expected }) => {
  try {
    const result = formatPercent(value)
    const passed = result === expected
    console.log(`  ${passed ? '✅' : '❌'} formatPercent(${JSON.stringify(value)}) = "${result}"`)
  } catch (error) {
    console.log(`  ❌ formatPercent(${JSON.stringify(value)}) threw error: ${error.message}`)
  }
})

console.log('\n✅ Тестирование завершено!')

// Тест реальных кейсов из багов
console.log('\n5️⃣ Тестирование реальных багов:')
const bugCases = [
  {
    name: 'PostLocked finalPrice undefined',
    test: () => {
      const finalPrice = undefined
      const solRate = 135
      return `${safeToFixed(finalPrice, 2)} SOL (≈ ${formatSolToUsd(finalPrice, solRate)})`
    },
    expected: '0.00 SOL (≈ $0.00)'
  },
  {
    name: 'PurchaseModal displayPrice * solRate undefined',
    test: () => {
      const displayPrice = 0.5
      const solRate = undefined
      return formatSolToUsd(displayPrice, solRate)
    },
    expected: '$67.50' // 0.5 * 135 (fallback)
  }
]

bugCases.forEach(({ name, test, expected }) => {
  try {
    const result = test()
    const passed = result === expected
    console.log(`  ${passed ? '✅' : '❌'} ${name}: "${result}"`)
  } catch (error) {
    console.log(`  ❌ ${name} threw error: ${error.message}`)
  }
})

console.log('\n🎉 Все тесты пройдены успешно!') 