'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { useEffect } from 'react'

export default function WalletDebugger() {
  const { publicKey, connected, wallet } = useWallet()
  
  useEffect(() => {
    if (connected && publicKey) {
      console.log('=== WALLET DEBUGGER ===')
      console.log('Connected:', connected)
      console.log('PublicKey:', publicKey.toBase58())
      console.log('Wallet name:', wallet?.adapter.name)
      console.log('Platform wallet:', process.env.NEXT_PUBLIC_PLATFORM_WALLET)
      console.log('Are they same?', publicKey.toBase58() === process.env.NEXT_PUBLIC_PLATFORM_WALLET)
      console.log('=====================')
    }
  }, [connected, publicKey, wallet])
  
  if (!connected || !publicKey) {
    return null
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs font-mono max-w-md">
      <div className="text-yellow-400 font-bold mb-2">WALLET DEBUG</div>
      <div>Connected: {connected ? 'YES' : 'NO'}</div>
      <div>Wallet: {wallet?.adapter.name}</div>
      <div className="break-all">User: {publicKey.toBase58()}</div>
      <div className="break-all text-red-400">Platform: {process.env.NEXT_PUBLIC_PLATFORM_WALLET}</div>
      <div className={publicKey.toBase58() === process.env.NEXT_PUBLIC_PLATFORM_WALLET ? 'text-red-500 font-bold' : 'text-green-500'}>
        Same wallet: {publicKey.toBase58() === process.env.NEXT_PUBLIC_PLATFORM_WALLET ? 'YES - PROBLEM!' : 'NO - OK'}
      </div>
    </div>
  )
} 