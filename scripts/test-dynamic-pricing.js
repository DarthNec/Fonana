const fetch = require('node-fetch')

async function testPricingAPI(baseUrl = 'http://localhost:3000') {
  console.log(`\n🔍 Testing Dynamic Pricing System at ${baseUrl}\n`)
  
  try {
    // Test 1: Direct API endpoint
    console.log('1. Testing API endpoint...')
    const apiResponse = await fetch(`${baseUrl}/api/pricing`)
    const apiData = await apiResponse.json()
    
    if (apiData.success) {
      console.log('✅ API endpoint working')
      console.log(`   SOL/USD: $${apiData.data.prices.SOL_USD}`)
      console.log(`   Source: ${apiData.data.prices.source}`)
      console.log(`   Last update: ${new Date(apiData.data.status.lastUpdate).toLocaleString()}`)
    } else {
      console.log('❌ API endpoint error:', apiData.error)
    }
    
    // Test 2: Check test pages
    console.log('\n2. Checking test pages...')
    const testPages = [
      '/test/pricing',
      '/test/pricing/subscription',
      '/test/pricing/post-purchase'
    ]
    
    for (const page of testPages) {
      const response = await fetch(`${baseUrl}${page}`)
      console.log(`   ${page}: ${response.status === 200 ? '✅' : '❌'} (${response.status})`)
    }
    
    // Test 3: Price validation
    console.log('\n3. Validating price data...')
    if (apiData.success) {
      const price = apiData.data.prices.SOL_USD
      const isValidPrice = price > 1 && price < 1000
      console.log(`   Price range check: ${isValidPrice ? '✅' : '❌'} ($${price})`)
      
      const age = apiData.data.status.cacheAge
      const isFresh = !age || age < 300000 // 5 minutes
      console.log(`   Cache freshness: ${isFresh ? '✅' : '⚠️ '} (${age ? `${Math.round(age/1000)}s old` : 'new'})`)
    }
    
    // Test 4: Performance
    console.log('\n4. Testing performance...')
    const start = Date.now()
    const requests = Array(5).fill(null).map(() => fetch(`${baseUrl}/api/pricing`))
    await Promise.all(requests)
    const duration = Date.now() - start
    console.log(`   5 parallel requests: ${duration}ms (${duration < 1000 ? '✅' : '⚠️ '})`)
    
    console.log('\n✨ Testing complete!\n')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.log('\nMake sure the server is running and accessible')
  }
}

// Run tests
const args = process.argv.slice(2)
const baseUrl = args[0] || 'http://localhost:3000'

testPricingAPI(baseUrl)

// Instructions
console.log('\nUsage:')
console.log('  Local:      node scripts/test-dynamic-pricing.js')
console.log('  Production: node scripts/test-dynamic-pricing.js https://fonana.me')
console.log('  Custom:     node scripts/test-dynamic-pricing.js http://your-server:port') 