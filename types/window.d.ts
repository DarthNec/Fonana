interface Window {
  solana?: {
    isPhantom?: boolean
    connect?: () => Promise<{ publicKey: { toString: () => string } }>
    disconnect?: () => Promise<void>
    signTransaction?: (transaction: any) => Promise<any>
    signMessage?: (message: Uint8Array) => Promise<{ signature: Uint8Array }>
  }
} 