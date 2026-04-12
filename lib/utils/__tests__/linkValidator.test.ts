/**
 * Test cases для linkValidator
 * Запустить: node --loader ts-node/esm lib/utils/__tests__/linkValidator.test.ts
 */

import { containsLinks, validateCommentForLinks } from '../linkValidator'

console.log('🧪 Testing Link Validator...\n')

const testCases = [
  // ✅ Valid comments (no links)
  { text: 'Отличный пост!', expected: false },
  { text: 'Мне нравится этот контент', expected: false },
  { text: 'Спасибо за видео', expected: false },
  { text: 'Great content!', expected: false },
  
  // ❌ Invalid comments (with links)
  { text: 'Check out https://example.com', expected: true },
  { text: 'Visit http://test.io', expected: true },
  { text: 'Go to www.example.com', expected: true },
  { text: 'Check example.com', expected: true },
  { text: 'My site: test.io', expected: true },
  
  // ❌ Спам со спейсами
  { text: 'Visit h t t p : / / example . com', expected: true },
  { text: 'Check w w w . test . com', expected: true },
  { text: 'Go to example . com', expected: true },
  
  // ❌ Замаскированные протоколы
  { text: 'Check hxxp://example.com', expected: true },
  { text: 'Visit h[t]tp://test.io', expected: true },
  { text: 'Go to h_t_tp://malware.com', expected: true },
  
  // ❌ Короткие ссылки
  { text: 'Click bit.ly/abc123', expected: true },
  { text: 'Check t.co/xyz', expected: true },
  { text: 'Visit tinyurl.com/test', expected: true },
  
  // ❌ IP адреса
  { text: 'Server: 192.168.1.1', expected: true },
  { text: 'Connect to 8.8.8.8', expected: true },
  
  // ❌ "dot com" tricks
  { text: 'example dot com', expected: true },
  { text: 'test точка ком', expected: true },
  
  // ✅ False positives (should be allowed)
  { text: 'Version 1.2.3 released', expected: false },
  { text: 'Score: 3.14', expected: false },
  { text: 'Price: $1.99', expected: false },
]

let passed = 0
let failed = 0

testCases.forEach(({ text, expected }, index) => {
  const result = containsLinks(text)
  const isCorrect = result === expected
  
  if (isCorrect) {
    passed++
    console.log(`✅ Test ${index + 1}: PASSED`)
  } else {
    failed++
    console.log(`❌ Test ${index + 1}: FAILED`)
    console.log(`   Text: "${text}"`)
    console.log(`   Expected: ${expected ? 'BLOCK' : 'ALLOW'}`)
    console.log(`   Got: ${result ? 'BLOCK' : 'ALLOW'}`)
  }
})

console.log(`\n📊 Results: ${passed}/${testCases.length} passed, ${failed} failed`)

if (failed === 0) {
  console.log('✅ All tests passed!')
} else {
  console.log('❌ Some tests failed')
  process.exit(1)
}
