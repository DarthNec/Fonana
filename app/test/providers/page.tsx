'use client'

import { useState } from 'react'
import { ThemeProvider } from '@/lib/contexts/ThemeContext'
import { UserProvider } from '@/components/UserProvider'
import { NotificationProvider } from '@/lib/contexts/NotificationContext'

export default function ProvidersTestPage() {
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  const renderContent = () => (
    <div>
      <h2>Content rendered successfully!</h2>
      <button 
        onClick={() => setStep(step + 1)}
        style={{ padding: '10px 20px', marginTop: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px' }}
      >
        Add Next Provider (Step {step + 1})
      </button>
    </div>
  )
  
  try {
    if (step === 0) {
      return (
        <div style={{ padding: '20px' }}>
          <h1>No Providers</h1>
          {renderContent()}
        </div>
      )
    }
    
    if (step === 1) {
      return (
        <ThemeProvider>
          <div style={{ padding: '20px' }}>
            <h1>With ThemeProvider</h1>
            {renderContent()}
          </div>
        </ThemeProvider>
      )
    }
    
    if (step === 2) {
      return (
        <ThemeProvider>
          <UserProvider>
            <div style={{ padding: '20px' }}>
              <h1>With Theme + UserProvider</h1>
              {renderContent()}
            </div>
          </UserProvider>
        </ThemeProvider>
      )
    }
    
    if (step === 3) {
      return (
        <ThemeProvider>
          <UserProvider>
            <NotificationProvider>
              <div style={{ padding: '20px' }}>
                <h1>With All Providers (except Wallet)</h1>
                {renderContent()}
              </div>
            </NotificationProvider>
          </UserProvider>
        </ThemeProvider>
      )
    }
    
    return (
      <div style={{ padding: '20px' }}>
        <h1>All tests passed!</h1>
        <p>All providers work correctly. The issue must be with WalletProvider.</p>
      </div>
    )
  } catch (e: any) {
    return (
      <div style={{ padding: '20px' }}>
        <h1 style={{ color: 'red' }}>Error at step {step}</h1>
        <pre style={{ backgroundColor: '#f0f0f0', padding: '10px' }}>
          {e.message}
          {'\n'}
          {e.stack}
        </pre>
      </div>
    )
  }
} 