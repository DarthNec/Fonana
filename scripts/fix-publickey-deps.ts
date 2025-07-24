#!/usr/bin/env node

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

// 🔥 ALTERNATIVE SOLUTION - PHASE 1 AUDIT SCRIPT
// Finds all publicKey usage patterns that need fixing

console.log('🔍 PHASE 1: Auditing publicKey usage patterns...\n')

const patterns = [
  {
    name: 'useEffect with publicKey in dependencies',
    regex: 'useEffect.*\\[.*publicKey.*\\]',
    files: '*.tsx'
  },
  {
    name: 'publicKey object checks',
    regex: 'if.*\\(!publicKey\\)',
    files: '*.tsx'
  },
  {
    name: 'publicKey.toBase58() calls',
    regex: 'publicKey\\.toBase58\\(\\)',
    files: '*.tsx'
  },
  {
    name: 'publicKey.toString() calls',
    regex: 'publicKey\\.toString\\(\\)',
    files: '*.tsx'
  },
  {
    name: 'wallet.publicKey usage',
    regex: 'wallet\\.publicKey',
    files: '*.tsx'
  },
  {
    name: 'Destructured publicKey from useWallet',
    regex: 'const.*{.*publicKey.*}.*=.*useWallet\\(\\)',
    files: '*.tsx'
  }
]

const results: any = {}

patterns.forEach(pattern => {
  console.log(`\n📌 Searching for: ${pattern.name}`)
  console.log(`   Pattern: ${pattern.regex}`)
  
  try {
    const output = execSync(
      `grep -r "${pattern.regex}" --include="${pattern.files}" . 2>/dev/null || true`,
      { encoding: 'utf-8', cwd: process.cwd() }
    )
    
    const lines = output.trim().split('\n').filter(line => line.length > 0)
    
    if (lines.length > 0) {
      console.log(`   ✅ Found ${lines.length} occurrences`)
      
      results[pattern.name] = lines.map(line => {
        const [file, ...rest] = line.split(':')
        return {
          file: file.replace('./', ''),
          line: rest.join(':').trim()
        }
      })
      
      // Show first 3 examples
      lines.slice(0, 3).forEach(line => {
        console.log(`      ${line}`)
      })
      
      if (lines.length > 3) {
        console.log(`      ... and ${lines.length - 3} more`)
      }
    } else {
      console.log('   ❌ No occurrences found')
    }
  } catch (error) {
    console.log('   ⚠️  Error running grep:', error.message)
  }
})

// Generate report
const reportPath = 'publickey-audit-report.md'
let report = '# PublicKey Usage Audit Report\n\n'
report += `Generated: ${new Date().toISOString()}\n\n`

Object.entries(results).forEach(([pattern, occurrences]: [string, any[]]) => {
  report += `## ${pattern}\n\n`
  report += `Found ${occurrences.length} occurrences:\n\n`
  
  occurrences.forEach(({ file, line }) => {
    report += `- **${file}**: \`${line.substring(0, 100)}${line.length > 100 ? '...' : ''}\`\n`
  })
  
  report += '\n'
})

report += `## Summary\n\n`
report += `Total files to fix: ${new Set(Object.values(results).flat().map((r: any) => r.file)).size}\n\n`

report += `## Fix Strategy\n\n`
report += `1. Add \`const publicKeyString = publicKey?.toBase58() ?? null\` after useWallet()\n`
report += `2. Replace \`publicKey\` with \`publicKeyString\` in:\n`
report += `   - useEffect dependencies\n`
report += `   - Conditional checks\n`
report += `   - String conversions\n`
report += `3. Keep \`publicKey\` object only for Transaction creation\n`

fs.writeFileSync(reportPath, report)
console.log(`\n📊 Report saved to: ${reportPath}`)

// Count components needing fixes
const filesToFix = new Set(Object.values(results).flat().map((r: any) => r.file))
console.log(`\n🎯 Total components to fix: ${filesToFix.size}`)
console.log('\nRun the migration script to apply fixes automatically!') 