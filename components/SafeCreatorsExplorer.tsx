'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'

// Dynamically import CreatorsExplorer with no SSR
const CreatorsExplorer = dynamic(
  () => import('./CreatorsExplorer'),
  { 
    ssr: false,
    loading: () => (
      <section className="py-20 bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p className="text-slate-300">Loading creators...</p>
          </div>
        </div>
      </section>
    )
  }
)

export default function SafeCreatorsExplorer() {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <section className="py-20 bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p className="text-slate-300">Loading creators...</p>
          </div>
        </div>
      </section>
    )
  }

  return <CreatorsExplorer />
} 