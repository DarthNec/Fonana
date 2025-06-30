// Load environment variables at module initialization
import path from 'path'

if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET) {
  console.log('🔧 Loading environment variables from .env file...')
  const envPath = path.join(process.cwd(), '.env')
  console.log('📁 Env path:', envPath)
  require('dotenv').config({ path: envPath })
  console.log('✅ Environment loaded, NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET')
}

// Export a function to ensure env is loaded
export function ensureEnvLoaded() {
  if (!process.env.NEXTAUTH_SECRET) {
    console.warn('⚠️ NEXTAUTH_SECRET is not set!')
  }
}

// Call immediately
ensureEnvLoaded() 