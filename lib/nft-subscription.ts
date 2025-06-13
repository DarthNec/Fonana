// Temporarily disabled due to Metaplex API changes
// This file will be updated when the NFT subscription feature is implemented

/*
// NFT Subscription types
export interface NFTSubscription {
  id: string
  creatorAddress: string
  tier: 'silver' | 'gold' | 'platinum'
  duration: 1 | 3 | 6 | 12 // months
  price: number
  currency: 'SOL' | 'USDC'
  metadata: {
    name: string
    description: string
    image: string
    attributes: Array<{
      trait_type: string
      value: string
    }>
  }
  benefits: string[]
  active: boolean
  mintAddress?: string
}

// Preset subscription tiers
export const SUBSCRIPTION_TIERS: Record<string, Omit<NFTSubscription, 'id' | 'creatorAddress' | 'mintAddress'>> = {
  silver: {
    tier: 'silver',
    duration: 1,
    price: 5,
    currency: 'USDC',
    metadata: {
      name: 'Silver Subscriber',
      description: 'Access to exclusive content and early releases',
      image: 'https://via.placeholder.com/400x400/C0C0C0/FFFFFF?text=Silver',
      attributes: [
        { trait_type: 'Tier', value: 'Silver' },
        { trait_type: 'Duration', value: '1 Month' },
        { trait_type: 'Access Level', value: 'Basic' }
      ]
    },
    benefits: [
      'Exclusive content',
      'Ранний доступ к релизам',
      'Бейдж подписчика'
    ],
    active: true
  },
  gold: {
    tier: 'gold',
    duration: 3,
    price: 12,
    currency: 'USDC',
    metadata: {
      name: 'Gold Subscriber',
      description: 'Premium access with special perks and direct messaging',
      image: 'https://via.placeholder.com/400x400/FFD700/000000?text=Gold',
      attributes: [
        { trait_type: 'Tier', value: 'Gold' },
        { trait_type: 'Duration', value: '3 Months' },
        { trait_type: 'Access Level', value: 'Premium' }
      ]
    },
    benefits: [
      'Всё из Silver',
      'Прямые сообщения',
      'Специальные розыгрыши',
      'Золотой бейдж'
    ],
    active: true
  },
  platinum: {
    tier: 'platinum',
    duration: 12,
    price: 40,
    currency: 'USDC',
    metadata: {
      name: 'Platinum Subscriber',
      description: 'Ultimate access with NFT collectibles and exclusive events',
      image: 'https://via.placeholder.com/400x400/E5E4E2/000000?text=Platinum',
      attributes: [
        { trait_type: 'Tier', value: 'Platinum' },
        { trait_type: 'Duration', value: '12 Months' },
        { trait_type: 'Access Level', value: 'Ultimate' }
      ]
    },
    benefits: [
      'Всё из Gold',
      'Участие в DAO',
      'NFT коллекционные карточки',
      'Закрытые мероприятия',
      'Платиновый бейдж'
    ],
    active: true
  }
}

// Create NFT Subscription
export async function createNFTSubscription(
  connection: Connection,
  payerPublicKey: PublicKey,
  creatorPublicKey: PublicKey,
  tier: keyof typeof SUBSCRIPTION_TIERS,
  customization?: Partial<NFTSubscription>
): Promise<{ transaction: Transaction, mintKeypair: any }> {
  const { Keypair } = await import('@solana/web3.js')
  
  const mintKeypair = Keypair.generate()
  const subscriptionData = { ...SUBSCRIPTION_TIERS[tier], ...customization }
  
  // Get associated token account
  const associatedTokenAccount = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    payerPublicKey
  )
  
  // Create metadata
  const metadataSeeds = [
    Buffer.from('metadata'),
    TOKEN_METADATA_PROGRAM_ID.toBuffer(),
    mintKeypair.publicKey.toBuffer()
  ]
  const [metadataAddress] = PublicKey.findProgramAddressSync(
    metadataSeeds,
    TOKEN_METADATA_PROGRAM_ID
  )
  
  const masterEditionSeeds = [
    Buffer.from('metadata'),
    TOKEN_METADATA_PROGRAM_ID.toBuffer(),
    mintKeypair.publicKey.toBuffer(),
    Buffer.from('edition')
  ]
  const [masterEditionAddress] = PublicKey.findProgramAddressSync(
    masterEditionSeeds,
    TOKEN_METADATA_PROGRAM_ID
  )
  
  const metadataData: DataV2 = {
    name: `${subscriptionData.metadata.name} - ${creatorPublicKey.toString().slice(0, 8)}`,
    symbol: `SUB${tier.toUpperCase()}`,
    uri: JSON.stringify(subscriptionData.metadata), // В реальности нужно загрузить в IPFS
    sellerFeeBasisPoints: 500, // 5% royalty
    creators: [
      {
        address: creatorPublicKey,
        verified: false,
        share: 90
      },
      {
        address: new PublicKey('11111111111111111111111111111112'), // Platform wallet
        verified: false,
        share: 10
      }
    ],
    collection: null,
    uses: null
  }
  
  const transaction = new Transaction()
  
  // Get minimum rent for mint account
  const rentExemption = await connection.getMinimumBalanceForRentExemption(MINT_SIZE)
  
  // Create mint account
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: payerPublicKey,
      newAccountPubkey: mintKeypair.publicKey,
      lamports: rentExemption,
      space: MINT_SIZE,
      programId: TOKEN_PROGRAM_ID
    })
  )
  
  // Initialize mint
  transaction.add(
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      0, // decimals
      payerPublicKey, // mint authority
      payerPublicKey  // freeze authority
    )
  )
  
  // Create associated token account
  transaction.add(
    createAssociatedTokenAccountInstruction(
      payerPublicKey,
      associatedTokenAccount,
      payerPublicKey,
      mintKeypair.publicKey
    )
  )
  
  // Mint one token
  transaction.add(
    createMintToInstruction(
      mintKeypair.publicKey,
      associatedTokenAccount,
      payerPublicKey,
      1
    )
  )
  
  // Create metadata
  transaction.add(
    createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataAddress,
        mint: mintKeypair.publicKey,
        mintAuthority: payerPublicKey,
        payer: payerPublicKey,
        updateAuthority: payerPublicKey,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY
      },
      {
        createMetadataAccountArgsV3: {
          data: metadataData,
          isMutable: true,
          collectionDetails: null
        }
      }
    )
  )
  
  // Create master edition (makes it an NFT)
  transaction.add(
    createCreateMasterEditionV3Instruction(
      {
        edition: masterEditionAddress,
        mint: mintKeypair.publicKey,
        updateAuthority: payerPublicKey,
        mintAuthority: payerPublicKey,
        payer: payerPublicKey,
        metadata: metadataAddress,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY
      },
      {
        createMasterEditionArgs: {
          maxSupply: 0 // Unlimited supply for subscriptions
        }
      }
    )
  )
  
  return { transaction, mintKeypair }
}

// Verify NFT subscription ownership
export async function verifyNFTSubscription(
  connection: Connection,
  userPublicKey: PublicKey,
  creatorPublicKey: PublicKey
): Promise<{ hasSubscription: boolean, tier?: string, expiresAt?: Date }> {
  try {
    // Get all token accounts for user
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      userPublicKey,
      { programId: TOKEN_PROGRAM_ID }
    )
    
    // Check for subscription NFTs
    for (const account of tokenAccounts.value) {
      const tokenData = account.account.data.parsed.info
      
      if (tokenData.tokenAmount.uiAmount === 1) {
        // This is potentially an NFT, check metadata
        try {
          const mintAddress = new PublicKey(tokenData.mint)
          const metadataSeeds = [
            Buffer.from('metadata'),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            mintAddress.toBuffer()
          ]
          const [metadataAddress] = PublicKey.findProgramAddressSync(
            metadataSeeds,
            TOKEN_METADATA_PROGRAM_ID
          )
          
          const metadataAccount = await connection.getAccountInfo(metadataAddress)
          if (metadataAccount) {
            // Parse metadata and check if it's a subscription NFT for this creator
            // This is simplified - in reality you'd parse the metadata properly
            
            // For now, assume it's valid and return a sample response
            return {
              hasSubscription: true,
              tier: 'gold',
              expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
            }
          }
        } catch (error) {
          // Continue checking other tokens
        }
      }
    }
    
    return { hasSubscription: false }
  } catch (error) {
    console.error('Error verifying NFT subscription:', error)
    return { hasSubscription: false }
  }
}

// Get subscription benefits based on tier
export function getSubscriptionBenefits(tier: string): string[] {
  const tierData = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS]
  return tierData?.benefits || []
}

// Calculate subscription price with platform fee
export function calculateSubscriptionPrice(tier: string): { price: number, platformFee: number, total: number } {
  const tierData = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS]
  if (!tierData) return { price: 0, platformFee: 0, total: 0 }
  
  const price = tierData.price
  const platformFee = price * 0.1 // 10% platform fee
  const total = price + platformFee
  
  return { price, platformFee, total }
}
*/