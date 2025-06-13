// Mock data for creators and their content

export interface Creator {
  id: number
  name: string
  username: string
  avatar: string
  category: string
  description: string
  subscribers: number
  monthlyEarnings: string
  posts: number
  rating: number
  isVerified: boolean
  coverImage: string
  tags: string[]
  joinedDate: string
  location: string
  socialLinks?: {
    twitter?: string
    instagram?: string
    discord?: string
  }
}

export interface Post {
  id: number
  creatorId: number
  title: string
  content: string
  type: 'text' | 'image' | 'video' | 'audio'
  thumbnail?: string
  isLocked: boolean
  price?: number
  currency?: string
  likes: number
  comments: number
  createdAt: string
  tags: string[]
}

// Comment system interfaces
export interface Comment {
  id: number
  postId: number
  userId: number
  username: string
  userAvatar: string
  content: string
  createdAt: string
  likes: number
  replies?: Comment[]
  isVerified?: boolean
  isAnonymous?: boolean
}

export interface User {
  id: number
  username: string
  avatar: string
  isVerified: boolean
}

export const creatorsData: Creator[] = [
  // DeFi Creators
  {
    id: 1,
    name: 'Anna Crypto',
    username: '@annacrypto',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face',
    category: 'DeFi',
    description: 'DeFi analyst sharing investment strategies and protocol deep dives',
    subscribers: 12500,
    monthlyEarnings: '$3,400',
    posts: 156,
    rating: 4.9,
    isVerified: true,
    coverImage: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=200&fit=crop',
    tags: ['DeFi', 'Investing', 'Analytics'],
    joinedDate: '2023-01-15',
    location: 'London, UK',
    socialLinks: { twitter: 'annacrypto', discord: 'anna#1234' }
  },
  {
    id: 2,
    name: 'Marcus DeFi',
    username: '@marcusdefi',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    category: 'DeFi',
    description: 'Yield farming expert and liquidity pool strategist',
    subscribers: 8900,
    monthlyEarnings: '$2,100',
    posts: 89,
    rating: 4.7,
    isVerified: true,
    coverImage: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=200&fit=crop',
    tags: ['DeFi', 'Yield Farming', 'Liquidity'],
    joinedDate: '2023-03-22',
    location: 'Berlin, Germany'
  },
  {
    id: 3,
    name: 'Sarah Protocol',
    username: '@sarahprotocol',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    category: 'DeFi',
    description: 'Smart contract auditor and DeFi security researcher',
    subscribers: 6700,
    monthlyEarnings: '$1,800',
    posts: 67,
    rating: 4.8,
    isVerified: false,
    coverImage: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=200&fit=crop',
    tags: ['DeFi', 'Security', 'Smart Contracts'],
    joinedDate: '2023-05-10',
    location: 'San Francisco, USA'
  },

  // NFT Creators
  {
    id: 4,
    name: 'Alex NFT',
    username: '@alexnft',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    category: 'NFT',
    description: 'Digital artist creating unique NFT collections and teaching digital art',
    subscribers: 15700,
    monthlyEarnings: '$4,200',
    posts: 234,
    rating: 4.8,
    isVerified: true,
    coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=200&fit=crop',
    tags: ['NFT', 'Digital Art', 'Design'],
    joinedDate: '2022-11-08',
    location: 'Tokyo, Japan',
    socialLinks: { twitter: 'alexnft', instagram: 'alex.nft.art' }
  },
  {
    id: 5,
    name: 'Luna Collectibles',
    username: '@lunacollectibles',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    category: 'NFT',
    description: 'NFT collector and marketplace analyst, sharing alpha on upcoming drops',
    subscribers: 9800,
    monthlyEarnings: '$2,800',
    posts: 445,
    rating: 4.6,
    isVerified: true,
    coverImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop',
    tags: ['NFT', 'Collecting', 'Marketplace'],
    joinedDate: '2023-02-14',
    location: 'Los Angeles, USA'
  },
  {
    id: 6,
    name: 'Phoenix Creator',
    username: '@phoenixcreator',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    category: 'NFT',
    description: '3D artist specializing in metaverse-ready NFT avatars and environments',
    subscribers: 11200,
    monthlyEarnings: '$3,100',
    posts: 167,
    rating: 4.7,
    isVerified: true,
    coverImage: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=400&h=200&fit=crop',
    tags: ['NFT', '3D Art', 'Metaverse'],
    joinedDate: '2023-01-30',
    location: 'Barcelona, Spain'
  },

  // Trading Creators
  {
    id: 7,
    name: 'David Trader',
    username: '@davidtrade',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face',
    category: 'Trading',
    description: 'Professional trader sharing daily signals and technical analysis',
    subscribers: 18900,
    monthlyEarnings: '$5,200',
    posts: 892,
    rating: 4.5,
    isVerified: true,
    coverImage: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=200&fit=crop',
    tags: ['Trading', 'Technical Analysis', 'Signals'],
    joinedDate: '2022-09-12',
    location: 'Singapore'
  },
  {
    id: 8,
    name: 'Emma Charts',
    username: '@emmacharts',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face',
    category: 'Trading',
    description: 'Chart pattern expert and swing trading strategist',
    subscribers: 7300,
    monthlyEarnings: '$1,900',
    posts: 156,
    rating: 4.7,
    isVerified: false,
    coverImage: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=400&h=200&fit=crop',
    tags: ['Trading', 'Chart Patterns', 'Swing Trading'],
    joinedDate: '2023-04-05',
    location: 'London, UK'
  },

  // GameFi Creators
  {
    id: 9,
    name: 'Ryan GameFi',
    username: '@ryangamefi',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face',
    category: 'GameFi',
    description: 'Blockchain gaming expert and P2E guild leader',
    subscribers: 13400,
    monthlyEarnings: '$3,800',
    posts: 289,
    rating: 4.6,
    isVerified: true,
    coverImage: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=200&fit=crop',
    tags: ['GameFi', 'P2E', 'Gaming'],
    joinedDate: '2023-01-18',
    location: 'Seoul, South Korea'
  },
  {
    id: 10,
    name: 'Zoe Gaming',
    username: '@zoegaming',
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face',
    category: 'GameFi',
    description: 'Professional gamer and blockchain game reviewer',
    subscribers: 9600,
    monthlyEarnings: '$2,400',
    posts: 178,
    rating: 4.8,
    isVerified: true,
    coverImage: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=400&h=200&fit=crop',
    tags: ['GameFi', 'Gaming', 'Reviews'],
    joinedDate: '2023-02-28',
    location: 'Austin, USA'
  },

  // Intimate Creators
  {
    id: 11,
    name: 'Elena Intimate',
    username: '@elena_intimate',
    avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=150&h=150&fit=crop&crop=face',
    category: 'Intimate',
    description: 'Artistic photographer creating intimate portraits with minimalist aesthetics',
    subscribers: 7800,
    monthlyEarnings: '$2,400',
    posts: 134,
    rating: 4.8,
    isVerified: true,
    coverImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop',
    tags: ['Intimate', 'Photography', 'Art'],
    joinedDate: '2023-03-15',
    location: 'Paris, France'
  },
  {
    id: 12,
    name: 'Victoria Lifestyle',
    username: '@victoria_lifestyle',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
    category: 'Lifestyle',
    description: 'Lifestyle creator sharing exclusive content and personal moments',
    subscribers: 5600,
    monthlyEarnings: '$1,800',
    posts: 98,
    rating: 4.6,
    isVerified: true,
    coverImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=200&fit=crop',
    tags: ['Lifestyle', 'Photography', 'Personal'],
    joinedDate: '2023-04-12',
    location: 'Miami, USA'
  },
  {
    id: 13,
    name: 'Aria Wellness',
    username: '@ariawellness',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&h=150&fit=crop&crop=face',
    category: 'Intimate',
    description: 'Wellness coach and mindfulness practitioner creating intimate content about self-care',
    subscribers: 4200,
    monthlyEarnings: '$1,200',
    posts: 76,
    rating: 4.9,
    isVerified: false,
    coverImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop',
    tags: ['Intimate', 'Wellness', 'Mindfulness'],
    joinedDate: '2023-05-20',
    location: 'Bali, Indonesia'
  },

  // Web3 Education Creators
  {
    id: 14,
    name: 'Maria Blockchain',
    username: '@mariachain',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face',
    category: 'Education',
    description: 'Blockchain educator explaining Web3 concepts in simple terms',
    subscribers: 15700,
    monthlyEarnings: '$4,200',
    posts: 234,
    rating: 4.8,
    isVerified: true,
    coverImage: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=200&fit=crop',
    tags: ['Education', 'Web3', 'Blockchain'],
    joinedDate: '2022-12-01',
    location: 'Amsterdam, Netherlands'
  },
  {
    id: 15,
    name: 'Tech Teacher Tom',
    username: '@techtom',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    category: 'Technology',
    description: 'Software engineer teaching smart contract development and Web3 programming',
    subscribers: 11900,
    monthlyEarnings: '$3,500',
    posts: 187,
    rating: 4.7,
    isVerified: true,
    coverImage: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=400&h=200&fit=crop',
    tags: ['Technology', 'Programming', 'Smart Contracts'],
    joinedDate: '2023-01-08',
    location: 'San Francisco, USA'
  }
]

export const postsData: Post[] = [
  // Anna Crypto's posts (ID: 1)
  {
    id: 1,
    creatorId: 1,
    title: 'DeFi Yield Farming Strategies for 2024',
    content: 'Comprehensive guide to the most profitable yield farming opportunities this year. Covering Uniswap V3, Aave lending, and new protocols.',
    type: 'text',
    isLocked: true,
    price: 0.1,
    currency: 'SOL',
    likes: 189,
    comments: 43,
    createdAt: '2024-03-15T10:30:00Z',
    tags: ['DeFi', 'Yield Farming']
  },
  {
    id: 2,
    creatorId: 1,
    title: 'Market Analysis: Bulls vs Bears',
    content: 'Technical analysis of current market conditions and what to expect in Q2. Key levels to watch and trading opportunities.',
    type: 'text',
    thumbnail: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=300&h=200&fit=crop',
    isLocked: false,
    likes: 256,
    comments: 72,
    createdAt: '2024-03-10T14:45:00Z',
    tags: ['Analysis', 'Market']
  },
  {
    id: 3,
    creatorId: 1,
    title: 'Arbitrage Opportunities in Cross-Chain DeFi',
    content: 'Discovered several profitable arbitrage opportunities between Ethereum and Polygon. Premium members get the exact strategies.',
    type: 'text',
    isLocked: true,
    price: 0.08,
    currency: 'SOL',
    likes: 134,
    comments: 28,
    createdAt: '2024-03-08T09:15:00Z',
    tags: ['DeFi', 'Arbitrage']
  },
  {
    id: 4,
    creatorId: 1,
    title: 'Weekly DeFi Protocol Review',
    content: 'This week we analyze Compound V3, new governance proposals, and upcoming token unlocks that could impact prices.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=300&h=200&fit=crop',
    isLocked: false,
    likes: 298,
    comments: 56,
    createdAt: '2024-03-05T16:20:00Z',
    tags: ['DeFi', 'Review']
  },
  {
    id: 5,
    creatorId: 1,
    title: 'Liquid Staking Derivatives Deep Dive',
    content: 'Complete analysis of LSD protocols: Lido, Rocket Pool, and emerging competitors. Risk assessment and yield comparison.',
    type: 'text',
    isLocked: true,
    price: 0.12,
    currency: 'SOL',
    likes: 167,
    comments: 34,
    createdAt: '2024-03-03T11:30:00Z',
    tags: ['DeFi', 'Staking']
  },
  {
    id: 6,
    creatorId: 1,
    title: 'Impermanent Loss Calculator Tutorial',
    content: 'Learn how to calculate and minimize impermanent loss in AMM pools. Includes Excel template and real examples.',
    type: 'text',
    isLocked: false,
    likes: 445,
    comments: 89,
    createdAt: '2024-03-01T13:45:00Z',
    tags: ['DeFi', 'Education']
  },
  {
    id: 7,
    creatorId: 1,
    title: 'New DEX Aggregator Comparison',
    content: 'Testing 1inch, Paraswap, and Matcha for best execution prices. Results might surprise you - premium content with detailed data.',
    type: 'text',
    isLocked: true,
    price: 0.06,
    currency: 'SOL',
    likes: 223,
    comments: 41,
    createdAt: '2024-02-28T08:20:00Z',
    tags: ['DeFi', 'Trading']
  },
  {
    id: 8,
    creatorId: 1,
    title: 'DeFi Security Best Practices',
    content: 'Essential security measures every DeFi user should know. Hardware wallets, contract interactions, and red flags to avoid.',
    type: 'text',
    isLocked: false,
    likes: 567,
    comments: 123,
    createdAt: '2024-02-25T15:10:00Z',
    tags: ['DeFi', 'Security']
  },
  {
    id: 9,
    creatorId: 1,
    title: 'Flash Loan Attack Analysis',
    content: 'Breaking down the recent Euler Finance hack. How it happened, lessons learned, and how to protect your funds.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.15,
    currency: 'SOL',
    likes: 187,
    comments: 52,
    createdAt: '2024-02-22T12:00:00Z',
    tags: ['DeFi', 'Security']
  },
  {
    id: 10,
    creatorId: 1,
    title: 'My Personal DeFi Portfolio Breakdown',
    content: 'Revealing my entire DeFi portfolio allocation, yields, and strategy. Transparent look at what actually works.',
    type: 'text',
    isLocked: true,
    price: 0.2,
    currency: 'SOL',
    likes: 334,
    comments: 78,
    createdAt: '2024-02-20T10:30:00Z',
    tags: ['DeFi', 'Portfolio']
  },

  // Marcus DeFi's posts (ID: 2)
  {
    id: 11,
    creatorId: 2,
    title: 'Liquidity Pool Strategies for Small Investors',
    content: 'How to maximize returns with $1000 or less in LP tokens. Focus on high-yield, low-risk opportunities.',
    type: 'text',
    isLocked: false,
    likes: 234,
    comments: 45,
    createdAt: '2024-03-14T09:30:00Z',
    tags: ['DeFi', 'Liquidity']
  },
  {
    id: 12,
    creatorId: 2,
    title: 'Curve Finance Optimization Guide',
    content: 'Advanced strategies for Curve pools: boosting CRV rewards, gauge voting, and veCRV mechanics explained.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.09,
    currency: 'SOL',
    likes: 156,
    comments: 32,
    createdAt: '2024-03-12T14:15:00Z',
    tags: ['DeFi', 'Curve']
  },
  {
    id: 13,
    creatorId: 2,
    title: 'Yield Farming Tax Implications',
    content: 'Complete guide to DeFi taxes: how to track LP rewards, impermanent loss deductions, and regulatory compliance.',
    type: 'text',
    isLocked: true,
    price: 0.07,
    currency: 'SOL',
    likes: 189,
    comments: 56,
    createdAt: '2024-03-10T11:45:00Z',
    tags: ['DeFi', 'Tax']
  },
  {
    id: 14,
    creatorId: 2,
    title: 'Convex Finance Strategy Breakdown',
    content: 'How to leverage Convex for maximum CRV yields. Step-by-step guide with risk assessment and expected returns.',
    type: 'text',
    isLocked: false,
    likes: 267,
    comments: 38,
    createdAt: '2024-03-08T16:20:00Z',
    tags: ['DeFi', 'Convex']
  },
  {
    id: 15,
    creatorId: 2,
    title: 'Multi-Chain Yield Farming Setup',
    content: 'Managing liquidity across Ethereum, Polygon, and Arbitrum. Bridge costs, gas optimization, and yield comparison.',
    type: 'text',
    isLocked: true,
    price: 0.11,
    currency: 'SOL',
    likes: 198,
    comments: 44,
    createdAt: '2024-03-06T13:10:00Z',
    tags: ['DeFi', 'Multi-Chain']
  },
  {
    id: 16,
    creatorId: 2,
    title: 'Automated Yield Strategies with Yearn',
    content: 'Set-and-forget yield farming with Yearn vaults. Performance analysis and which vaults to choose.',
    type: 'text',
    isLocked: false,
    likes: 345,
    comments: 67,
    createdAt: '2024-03-04T10:30:00Z',
    tags: ['DeFi', 'Yearn']
  },
  {
    id: 17,
    creatorId: 2,
    title: 'Uniswap V3 Position Management',
    content: 'Advanced V3 strategies: range selection, fee tier analysis, and when to rebalance positions for optimal returns.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.08,
    currency: 'SOL',
    likes: 178,
    comments: 29,
    createdAt: '2024-03-02T15:45:00Z',
    tags: ['DeFi', 'Uniswap']
  },
  {
    id: 18,
    creatorId: 2,
    title: 'DeFi Risk Management Framework',
    content: 'My systematic approach to DeFi risk: protocol assessment, diversification strategies, and position sizing.',
    type: 'text',
    isLocked: true,
    price: 0.13,
    currency: 'SOL',
    likes: 223,
    comments: 51,
    createdAt: '2024-02-29T12:20:00Z',
    tags: ['DeFi', 'Risk Management']
  },
  {
    id: 19,
    creatorId: 2,
    title: 'Stablecoin Yield Opportunities',
    content: 'Low-risk yield strategies for USDC, DAI, and USDT. Current rates, protocol comparison, and safety analysis.',
    type: 'text',
    isLocked: false,
    likes: 456,
    comments: 89,
    createdAt: '2024-02-27T09:15:00Z',
    tags: ['DeFi', 'Stablecoins']
  },
  {
    id: 20,
    creatorId: 2,
    title: 'DeFi Portfolio Rebalancing Bot',
    content: 'Building an automated rebalancing system for LP positions. Code included for premium subscribers.',
    type: 'text',
    isLocked: true,
    price: 0.18,
    currency: 'SOL',
    likes: 167,
    comments: 34,
    createdAt: '2024-02-25T14:30:00Z',
    tags: ['DeFi', 'Automation']
  },

  // Sarah Protocol's posts (ID: 3)
  {
    id: 21,
    creatorId: 3,
    title: 'Smart Contract Audit Checklist',
    content: 'Professional auditor checklist for reviewing DeFi protocols. Essential security patterns and common vulnerabilities.',
    type: 'text',
    isLocked: true,
    price: 0.12,
    currency: 'SOL',
    likes: 298,
    comments: 67,
    createdAt: '2024-03-13T11:20:00Z',
    tags: ['DeFi', 'Security', 'Audit']
  },
  {
    id: 22,
    creatorId: 3,
    title: 'Recent DeFi Exploit Analysis',
    content: 'Technical breakdown of the latest protocol hack. Code analysis, attack vector, and prevention methods.',
    type: 'text',
    isLocked: false,
    likes: 445,
    comments: 89,
    createdAt: '2024-03-11T16:45:00Z',
    tags: ['DeFi', 'Security']
  },
  {
    id: 23,
    creatorId: 3,
    title: 'Reentrancy Attack Prevention',
    content: 'Deep dive into reentrancy vulnerabilities: how they work, detection methods, and secure coding practices.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.15,
    currency: 'SOL',
    likes: 234,
    comments: 56,
    createdAt: '2024-03-09T13:30:00Z',
    tags: ['DeFi', 'Security', 'Smart Contracts']
  },
  {
    id: 24,
    creatorId: 3,
    title: 'Oracle Manipulation Risks',
    content: 'Understanding price oracle attacks: Chainlink vs Uniswap TWAP, manipulation techniques, and mitigation strategies.',
    type: 'text',
    isLocked: true,
    price: 0.1,
    currency: 'SOL',
    likes: 187,
    comments: 43,
    createdAt: '2024-03-07T10:15:00Z',
    tags: ['DeFi', 'Oracles', 'Security']
  },
  {
    id: 25,
    creatorId: 3,
    title: 'Flash Loan Security Best Practices',
    content: 'How to protect protocols from flash loan attacks. Design patterns, access controls, and security checks.',
    type: 'text',
    isLocked: false,
    likes: 356,
    comments: 78,
    createdAt: '2024-03-05T14:50:00Z',
    tags: ['DeFi', 'Flash Loans', 'Security']
  },
  {
    id: 26,
    creatorId: 3,
    title: 'Governance Attack Vectors',
    content: 'How governance tokens can be exploited: vote buying, flash loan governance, and decentralization theater.',
    type: 'text',
    isLocked: true,
    price: 0.08,
    currency: 'SOL',
    likes: 223,
    comments: 52,
    createdAt: '2024-03-03T12:25:00Z',
    tags: ['DeFi', 'Governance', 'Security']
  },
  {
    id: 27,
    creatorId: 3,
    title: 'Multi-Sig Wallet Security',
    content: 'Best practices for multi-signature wallets in DeFi: signer selection, threshold optimization, and operational security.',
    type: 'text',
    isLocked: false,
    likes: 289,
    comments: 45,
    createdAt: '2024-03-01T09:40:00Z',
    tags: ['DeFi', 'Multi-Sig', 'Security']
  },
  {
    id: 28,
    creatorId: 3,
    title: 'Formal Verification in DeFi',
    content: 'Introduction to formal verification tools for smart contracts. Practical examples and implementation guide.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.2,
    currency: 'SOL',
    likes: 156,
    comments: 34,
    createdAt: '2024-02-28T15:20:00Z',
    tags: ['DeFi', 'Formal Verification']
  },
  {
    id: 29,
    creatorId: 3,
    title: 'Smart Contract Upgrade Patterns',
    content: 'Proxy patterns, upgrade mechanisms, and security considerations. When upgradability becomes a vulnerability.',
    type: 'text',
    isLocked: true,
    price: 0.11,
    currency: 'SOL',
    likes: 198,
    comments: 47,
    createdAt: '2024-02-26T11:10:00Z',
    tags: ['DeFi', 'Smart Contracts', 'Upgrades']
  },
  {
    id: 30,
    creatorId: 3,
    title: 'DeFi Protocol Risk Assessment Framework',
    content: 'Comprehensive framework for evaluating DeFi protocols: code quality, economic risks, and operational security.',
    type: 'text',
    isLocked: true,
    price: 0.16,
    currency: 'SOL',
    likes: 267,
    comments: 61,
    createdAt: '2024-02-24T13:45:00Z',
    tags: ['DeFi', 'Risk Assessment', 'Security']
  },

  // Alex NFT's posts (ID: 4)
  {
    id: 31,
    creatorId: 4,
    title: "Creating Your First NFT Collection",
    content: "Complete step-by-step guide to creating, minting, and launching your NFT collection on Solana.",
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=250&fit=crop',
    isLocked: false,
    likes: 234,
    comments: 45,
    createdAt: '2024-06-06T10:00:00Z',
    tags: ['NFT', 'Tutorial', 'Beginner']
  },
  {
    id: 32,
    creatorId: 4,
    title: "🔥 Exclusive: My $50K NFT Drop Strategy",
    content: "The EXACT blueprint I used to sell 1000 NFTs in 24 hours. This isn't theory - it's my real playbook that generated $50,000 in a single day. You'll learn my secret pricing psychology, the Discord community-building tactics that create FOMO, and the marketing timeline that guarantees sellouts...",
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=250&fit=crop',
    isLocked: true,
    price: 0.1,
    currency: 'SOL',
    likes: 892,
    comments: 156,
    createdAt: '2024-06-05T14:30:00Z',
    tags: ['Strategy', 'Marketing', 'Premium']
  },
  {
    id: 33,
    creatorId: 4,
    title: "NFT Marketplace Strategy Guide",
    content: "How to price, promote, and sell your NFTs effectively. Magic Eden vs OpenSea comparison and tips.",
    type: 'text',
    isLocked: false,
    likes: 156,
    comments: 23,
    createdAt: '2024-06-04T16:45:00Z',
    tags: ['NFT', 'Marketing', 'Platforms']
  },
  {
    id: 34,
    creatorId: 4,
    title: "💎 SECRET: Celebrity NFT Collaboration Method",
    content: "I just closed a deal with a Grammy-winning artist for a 10,000 piece collection. Here's the EXACT outreach template, negotiation tactics, and partnership structure I used. This method has landed me collaborations worth over $500K. Warning: This changes everything you know about NFT partnerships...",
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=250&fit=crop',
    isLocked: true,
    price: 0.15,
    currency: 'SOL',
    likes: 1247,
    comments: 89,
    createdAt: '2024-06-03T12:15:00Z',
    tags: ['Collaboration', 'Celebrity', 'Premium']
  },
  {
    id: 35,
    creatorId: 4,
    title: "Building Community Around Your Art",
    content: "Social media strategies, Discord management, and engaging with collectors. Building long-term value.",
    type: 'text',
    isLocked: false,
    likes: 187,
    comments: 34,
    createdAt: '2024-06-02T09:20:00Z',
    tags: ['Community', 'Social Media', 'Discord']
  },
  {
    id: 36,
    creatorId: 4,
    title: "⚡ LEAKED: The AI Tool That 10X'd My Art Speed",
    content: "This AI tool is still unknown to 99% of NFT artists. I'm using it to create collections 10x faster while maintaining premium quality. In this exclusive training, I'll show you my complete workflow, the prompts that generate $10K+ art pieces, and how to integrate it with traditional techniques. Plus: I'm giving away my private prompt library worth $2,000...",
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=250&fit=crop',
    isLocked: true,
    price: 0.08,
    currency: 'SOL',
    likes: 567,
    comments: 78,
    createdAt: '2024-06-01T18:00:00Z',
    tags: ['AI Art', 'Productivity', 'Tools']
  },
  {
    id: 37,
    creatorId: 4,
    title: "Generative Art with Code",
    content: "Creating algorithmic art collections using p5.js and Processing. Code samples and creative techniques.",
    type: 'text',
    isLocked: false,
    likes: 145,
    comments: 28,
    createdAt: '2024-05-31T13:45:00Z',
    tags: ['Generative', 'Coding', 'Programming']
  },
  {
    id: 38,
    creatorId: 4,
    title: "🚨 INSIDER: The Whale Collector's Shopping List",
    content: "I spent 3 months infiltrating private Discord servers where million-dollar collectors share their next moves. What I discovered will shock you. This exclusive report reveals the 7 art styles whales are secretly accumulating, the 3 platforms they use to buy before public launch, and the psychological triggers that make them spend 6-figures on a single piece...",
    type: 'text',
    thumbnail: 'https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=400&h=250&fit=crop',
    isLocked: true,
    price: 0.12,
    currency: 'SOL',
    likes: 923,
    comments: 134,
    createdAt: '2024-05-30T20:30:00Z',
    tags: ['Whales', 'Collectors', 'Market Intel']
  },
  {
    id: 39,
    creatorId: 4,
    title: "Animation Techniques for Moving NFTs",
    content: "Creating animated NFTs: After Effects workflows, file optimization, and platform compatibility.",
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop',
    isLocked: false,
    likes: 298,
    comments: 41,
    createdAt: '2024-05-29T11:00:00Z',
    tags: ['Animation', 'After Effects', 'Tutorial']
  },
  {
    id: 40,
    creatorId: 4,
    title: "💰 REVEALED: My $100K Monthly Passive Income System",
    content: "While everyone else is grinding for single sales, I've built a system that generates $100K+ every month on autopilot. This isn't about creating more art - it's about creating SYSTEMS. In this masterclass, I reveal my complete royalty optimization strategy, the licensing deals that pay me forever, and the investment approach that multiplies every NFT sale by 10x...",
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400&h=250&fit=crop',
    isLocked: true,
    price: 0.2,
    currency: 'SOL',
    likes: 1456,
    comments: 201,
    createdAt: '2024-05-28T15:45:00Z',
    tags: ['Passive Income', 'Royalties', 'Business']
  },
  {
    id: 41,
    creatorId: 4,
    title: "NFT Market Analysis Q1 2024",
    content: "Deep dive into market trends, top collections, and what collectors are buying. Data-driven insights.",
    type: 'text',
    isLocked: false,
    likes: 167,
    comments: 29,
    createdAt: '2024-05-27T08:30:00Z',
    tags: ['Market', 'Analysis', 'Trends']
  },
  {
    id: 42,
    creatorId: 4,
    title: "🎯 EXCLUSIVE: The Psychology of $100K+ NFT Sales",
    content: "What makes someone spend $100,000 on a digital image? After selling 50+ five-figure NFTs, I've cracked the code. This psychological masterclass reveals the 12 emotional triggers that turn browsers into big spenders, the storytelling framework that adds zeros to your prices, and the exclusivity tactics that create bidding wars...",
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=400&h=250&fit=crop',
    isLocked: true,
    price: 0.18,
    currency: 'SOL',
    likes: 734,
    comments: 92,
    createdAt: '2024-05-26T19:15:00Z',
    tags: ['Psychology', 'High Ticket', 'Sales']
  },
  {
    id: 43,
    creatorId: 4,
    title: "Digital Art Color Theory Masterclass",
    content: "Advanced color theory techniques for digital artists. Understanding color psychology and emotional impact.",
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=250&fit=crop',
    isLocked: false,
    likes: 445,
    comments: 67,
    createdAt: '2024-05-25T14:00:00Z',
    tags: ['Color Theory', 'Tutorial', 'Art Fundamentals']
  },
  {
    id: 44,
    creatorId: 4,
    title: "🔒 FORBIDDEN: The Dark Side of NFT Success",
    content: "The NFT world has dirty secrets nobody talks about. Market manipulation, wash trading, insider deals - I've seen it all. In this controversial exposé, I reveal the underground tactics used by top sellers, the platforms that enable fraud, and how to protect yourself from scams. This could get me banned from major marketplaces...",
    type: 'text',
    thumbnail: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=400&h=250&fit=crop',
    isLocked: true,
    price: 0.25,
    currency: 'SOL',
    likes: 1123,
    comments: 178,
    createdAt: '2024-05-24T21:00:00Z',
    tags: ['Controversial', 'Market Secrets', 'Exposé']
  },
  {
    id: 45,
    creatorId: 4,
    title: "Building Your First 3D NFT Avatar",
    content: "Step-by-step guide to creating 3D avatars for the metaverse using Blender and Unity.",
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=250&fit=crop',
    isLocked: false,
    likes: 287,
    comments: 43,
    createdAt: '2024-05-23T10:30:00Z',
    tags: ['3D Art', 'Metaverse', 'Blender']
  },

  // David Trader's posts (ID: 7)
  {
    id: 46,
    creatorId: 7,
    title: 'Daily Trading Signals - March 15',
    content: 'BTC/USD: Long above 42,500, target 45,000. Stop loss at 41,000. Full TA and risk management inside.',
    type: 'text',
    isLocked: true,
    price: 0.02,
    currency: 'SOL',
    likes: 478,
    comments: 89,
    createdAt: '2024-03-15T07:00:00Z',
    tags: ['Trading', 'Signals', 'BTC']
  },
  {
    id: 47,
    creatorId: 7,
    title: 'Advanced Technical Analysis Course',
    content: 'Complete TA course: chart patterns, indicators, and psychological levels. 20+ hours of content.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.25,
    currency: 'SOL',
    likes: 567,
    comments: 134,
    createdAt: '2024-03-13T09:30:00Z',
    tags: ['Trading', 'Education', 'Technical Analysis']
  },
  {
    id: 48,
    creatorId: 7,
    title: 'Risk Management Strategies',
    content: 'How to protect your capital: position sizing, stop losses, and portfolio management for traders.',
    type: 'text',
    isLocked: false,
    likes: 689,
    comments: 156,
    createdAt: '2024-03-11T14:15:00Z',
    tags: ['Trading', 'Risk Management']
  },
  {
    id: 49,
    creatorId: 7,
    title: 'Crypto Futures Trading Guide',
    content: 'Comprehensive guide to futures trading: leverage, funding rates, and advanced strategies.',
    type: 'text',
    isLocked: true,
    price: 0.15,
    currency: 'SOL',
    likes: 345,
    comments: 78,
    createdAt: '2024-03-09T11:45:00Z',
    tags: ['Trading', 'Futures', 'Leverage']
  },
  {
    id: 50,
    creatorId: 7,
    title: 'Market Manipulation Detection',
    content: 'How to spot and avoid market manipulation: pump and dumps, wash trading, and whale movements.',
    type: 'text',
    isLocked: true,
    price: 0.08,
    currency: 'SOL',
    likes: 234,
    comments: 67,
    createdAt: '2024-03-07T16:20:00Z',
    tags: ['Trading', 'Market Analysis']
  },

  // Elena Intimate's posts (ID: 11)
  {
    id: 51,
    creatorId: 11,
    title: 'Intimate Portrait Series #1',
    content: 'Exploring vulnerability and strength through minimalist photography. Behind the scenes of my creative process.',
    type: 'image',
    thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.15,
    currency: 'SOL',
    likes: 445,
    comments: 89,
    createdAt: '2024-03-13T16:20:00Z',
    tags: ['Intimate', 'Photography', 'Art']
  },
  {
    id: 52,
    creatorId: 11,
    title: 'Photography Workshop: Lighting Techniques',
    content: 'Master natural and artificial lighting for intimate portraits. Equipment recommendations and setup guides.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.2,
    currency: 'SOL',
    likes: 356,
    comments: 78,
    createdAt: '2024-03-11T12:30:00Z',
    tags: ['Intimate', 'Photography', 'Tutorial']
  },
  {
    id: 53,
    creatorId: 11,
    title: 'Personal Stories Through Art',
    content: 'How I use photography to tell personal stories and connect with viewers on an emotional level.',
    type: 'text',
    isLocked: false,
    likes: 567,
    comments: 134,
    createdAt: '2024-03-09T15:45:00Z',
    tags: ['Intimate', 'Art', 'Personal']
  },
  {
    id: 54,
    creatorId: 11,
    title: 'Minimalist Aesthetic Guide',
    content: 'Creating powerful images with minimal elements. Composition, color theory, and emotional impact.',
    type: 'text',
    isLocked: true,
    price: 0.12,
    currency: 'SOL',
    likes: 298,
    comments: 56,
    createdAt: '2024-03-07T10:15:00Z',
    tags: ['Intimate', 'Minimalism', 'Art']
  },
  {
    id: 55,
    creatorId: 11,
    title: 'Building Confidence for Portraits',
    content: 'Tips for both photographers and subjects to create comfortable, authentic intimate portraits.',
    type: 'text',
    isLocked: false,
    likes: 423,
    comments: 98,
    createdAt: '2024-03-05T13:50:00Z',
    tags: ['Intimate', 'Photography', 'Confidence']
  },

  // Additional David Trader posts (ID: 7) - completing to 10 posts
  {
    id: 56,
    creatorId: 7,
    title: 'Altcoin Season Indicators',
    content: 'How to identify and profit from altcoin seasons. Historical patterns and key metrics to watch.',
    type: 'text',
    isLocked: true,
    price: 0.06,
    currency: 'SOL',
    likes: 412,
    comments: 89,
    createdAt: '2024-03-05T08:30:00Z',
    tags: ['Trading', 'Altcoins', 'Market Analysis']
  },
  {
    id: 57,
    creatorId: 7,
    title: 'Options Trading in Crypto',
    content: 'Advanced options strategies for crypto markets. Hedging and income generation techniques.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.18,
    currency: 'SOL',
    likes: 298,
    comments: 67,
    createdAt: '2024-03-03T14:45:00Z',
    tags: ['Trading', 'Options', 'Advanced']
  },
  {
    id: 58,
    creatorId: 7,
    title: 'Psychology of Trading',
    content: 'Master your emotions: dealing with FOMO, fear, and greed in trading. Mental frameworks for success.',
    type: 'text',
    isLocked: false,
    likes: 567,
    comments: 134,
    createdAt: '2024-03-01T11:20:00Z',
    tags: ['Trading', 'Psychology', 'Mindset']
  },
  {
    id: 59,
    creatorId: 7,
    title: 'Swing Trading Setups',
    content: 'My favorite swing trading setups with 70%+ win rate. Entry, exit, and risk management rules.',
    type: 'text',
    isLocked: true,
    price: 0.12,
    currency: 'SOL',
    likes: 445,
    comments: 98,
    createdAt: '2024-02-28T16:15:00Z',
    tags: ['Trading', 'Swing Trading', 'Setups']
  },
  {
    id: 60,
    creatorId: 7,
    title: 'DeFi Yield Trading Strategies',
    content: 'Combining traditional trading with DeFi yields. Leveraged farming and arbitrage opportunities.',
    type: 'text',
    isLocked: true,
    price: 0.14,
    currency: 'SOL',
    likes: 356,
    comments: 78,
    createdAt: '2024-02-26T09:40:00Z',
    tags: ['Trading', 'DeFi', 'Yield']
  },

  // Additional Elena Intimate posts (ID: 11) - completing to 10 posts
  {
    id: 61,
    creatorId: 11,
    title: 'Intimate Portrait Series #2',
    content: 'Second collection exploring themes of solitude and self-reflection through artistic photography.',
    type: 'image',
    thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.18,
    currency: 'SOL',
    likes: 523,
    comments: 112,
    createdAt: '2024-03-03T14:30:00Z',
    tags: ['Intimate', 'Photography', 'Series']
  },
  {
    id: 62,
    creatorId: 11,
    title: 'Color Theory in Intimate Photography',
    content: 'How color palettes affect emotional response in intimate portraits. Practical examples and techniques.',
    type: 'text',
    isLocked: true,
    price: 0.1,
    currency: 'SOL',
    likes: 389,
    comments: 67,
    createdAt: '2024-03-01T11:45:00Z',
    tags: ['Intimate', 'Color Theory', 'Tutorial']
  },
  {
    id: 63,
    creatorId: 11,
    title: 'Behind the Scenes: Studio Setup',
    content: 'Tour of my intimate photography studio. Equipment, lighting setup, and creating the right atmosphere.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=200&fit=crop',
    isLocked: false,
    likes: 678,
    comments: 145,
    createdAt: '2024-02-28T16:20:00Z',
    tags: ['Intimate', 'Behind the Scenes', 'Studio']
  },
  {
    id: 64,
    creatorId: 11,
    title: 'Working with Natural Light',
    content: 'Mastering window light and outdoor settings for intimate portraits. Golden hour techniques.',
    type: 'text',
    isLocked: true,
    price: 0.08,
    currency: 'SOL',
    likes: 445,
    comments: 89,
    createdAt: '2024-02-26T13:15:00Z',
    tags: ['Intimate', 'Natural Light', 'Outdoor']
  },
  {
    id: 65,
    creatorId: 11,
    title: 'Artistic Nude Photography Ethics',
    content: 'Professional standards and ethical considerations in intimate photography. Consent and boundaries.',
    type: 'text',
    isLocked: false,
    likes: 567,
    comments: 134,
    createdAt: '2024-02-24T10:30:00Z',
    tags: ['Intimate', 'Ethics', 'Professional']
  },

  // Luna Collectibles posts (ID: 5) - 10 posts
  {
    id: 66,
    creatorId: 5,
    title: 'NFT Alpha: Upcoming Drops This Week',
    content: 'Exclusive alpha on 5 upcoming NFT drops with high potential. Mint strategies and rarity analysis.',
    type: 'text',
    isLocked: true,
    price: 0.15,
    currency: 'SOL',
    likes: 789,
    comments: 156,
    createdAt: '2024-03-15T09:00:00Z',
    tags: ['NFT', 'Alpha', 'Drops']
  },
  {
    id: 67,
    creatorId: 5,
    title: 'Blue Chip NFT Analysis',
    content: 'Deep dive into BAYC, CryptoPunks, and Azuki floor price movements. Market sentiment analysis.',
    type: 'text',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.12,
    currency: 'SOL',
    likes: 645,
    comments: 123,
    createdAt: '2024-03-13T14:20:00Z',
    tags: ['NFT', 'Blue Chip', 'Analysis']
  },
  {
    id: 68,
    creatorId: 5,
    title: 'NFT Marketplace Comparison',
    content: 'OpenSea vs Magic Eden vs Blur: fees, features, and which platform to use for different strategies.',
    type: 'text',
    isLocked: false,
    likes: 523,
    comments: 98,
    createdAt: '2024-03-11T11:30:00Z',
    tags: ['NFT', 'Marketplace', 'Comparison']
  },
  {
    id: 69,
    creatorId: 5,
    title: 'Solana NFT Ecosystem Guide',
    content: 'Complete guide to Solana NFTs: top collections, marketplaces, and tools for collectors.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.1,
    currency: 'SOL',
    likes: 456,
    comments: 87,
    createdAt: '2024-03-09T16:45:00Z',
    tags: ['NFT', 'Solana', 'Ecosystem']
  },
  {
    id: 70,
    creatorId: 5,
    title: 'NFT Flipping Strategies',
    content: 'How I made 50 SOL flipping NFTs last month. Entry/exit strategies and risk management.',
    type: 'text',
    isLocked: true,
    price: 0.2,
    currency: 'SOL',
    likes: 834,
    comments: 167,
    createdAt: '2024-03-07T13:15:00Z',
    tags: ['NFT', 'Flipping', 'Strategy']
  },
  {
    id: 71,
    creatorId: 5,
    title: 'Rarity Tools and Analytics',
    content: 'Best tools for NFT rarity analysis: Rarity.tools, HowRare.is, and advanced techniques.',
    type: 'text',
    isLocked: false,
    likes: 389,
    comments: 76,
    createdAt: '2024-03-05T10:20:00Z',
    tags: ['NFT', 'Rarity', 'Tools']
  },
  {
    id: 72,
    creatorId: 5,
    title: 'Gaming NFTs: The Next Big Thing?',
    content: 'Analysis of gaming NFT projects and their potential. Play-to-earn vs traditional gaming.',
    type: 'text',
    isLocked: true,
    price: 0.08,
    currency: 'SOL',
    likes: 445,
    comments: 89,
    createdAt: '2024-03-03T15:40:00Z',
    tags: ['NFT', 'Gaming', 'P2E']
  },
  {
    id: 73,
    creatorId: 5,
    title: 'NFT Portfolio Diversification',
    content: 'Building a balanced NFT portfolio: art, gaming, utility, and PFP projects allocation strategies.',
    type: 'text',
    isLocked: true,
    price: 0.14,
    currency: 'SOL',
    likes: 567,
    comments: 112,
    createdAt: '2024-03-01T12:30:00Z',
    tags: ['NFT', 'Portfolio', 'Diversification']
  },
  {
    id: 74,
    creatorId: 5,
    title: 'Whitelist Strategies',
    content: 'How to get whitelisted for exclusive NFT drops. Discord strategies and community engagement.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.16,
    currency: 'SOL',
    likes: 723,
    comments: 145,
    createdAt: '2024-02-28T09:15:00Z',
    tags: ['NFT', 'Whitelist', 'Strategy']
  },
  {
    id: 75,
    creatorId: 5,
    title: 'NFT Market Cycles',
    content: 'Understanding NFT market cycles and timing your entries/exits. Historical data analysis.',
    type: 'text',
    isLocked: false,
    likes: 456,
    comments: 98,
    createdAt: '2024-02-26T14:50:00Z',
    tags: ['NFT', 'Market Cycles', 'Timing']
  },

  // Phoenix Creator posts (ID: 6) - 10 posts
  {
    id: 76,
    creatorId: 6,
    title: '3D Avatar Creation Masterclass',
    content: 'Complete guide to creating metaverse-ready avatars in Blender. From modeling to rigging.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.25,
    currency: 'SOL',
    likes: 678,
    comments: 134,
    createdAt: '2024-03-15T11:30:00Z',
    tags: ['3D Art', 'Avatar', 'Metaverse']
  },
  {
    id: 77,
    creatorId: 6,
    title: 'Metaverse Environment Design',
    content: 'Creating immersive virtual worlds: landscape design, lighting, and optimization for VR.',
    type: 'text',
    isLocked: true,
    price: 0.18,
    currency: 'SOL',
    likes: 523,
    comments: 89,
    createdAt: '2024-03-13T15:45:00Z',
    tags: ['3D Art', 'Environment', 'VR']
  },
  {
    id: 78,
    creatorId: 6,
    title: 'NFT 3D Animation Techniques',
    content: 'Bringing your 3D NFTs to life with animation. Keyframing, rigging, and export optimization.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.2,
    currency: 'SOL',
    likes: 445,
    comments: 98,
    createdAt: '2024-03-11T12:20:00Z',
    tags: ['3D Art', 'Animation', 'NFT']
  },
  {
    id: 79,
    creatorId: 6,
    title: 'Substance Painter for NFTs',
    content: 'Advanced texturing techniques for 3D NFTs. PBR materials and realistic surface details.',
    type: 'text',
    isLocked: false,
    likes: 389,
    comments: 67,
    createdAt: '2024-03-09T14:15:00Z',
    tags: ['3D Art', 'Texturing', 'Substance']
  },
  {
    id: 80,
    creatorId: 6,
    title: 'Metaverse Asset Optimization',
    content: 'Optimizing 3D models for metaverse platforms: polygon reduction, LOD systems, and performance.',
    type: 'text',
    isLocked: true,
    price: 0.12,
    currency: 'SOL',
    likes: 567,
    comments: 112,
    createdAt: '2024-03-07T16:40:00Z',
    tags: ['3D Art', 'Optimization', 'Performance']
  },
  {
    id: 81,
    creatorId: 6,
    title: 'VR Sculpting in Gravity Sketch',
    content: 'Creating organic 3D models in VR. Workflow from concept to final model using Gravity Sketch.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.15,
    currency: 'SOL',
    likes: 456,
    comments: 87,
    createdAt: '2024-03-05T13:25:00Z',
    tags: ['3D Art', 'VR', 'Sculpting']
  },
  {
    id: 82,
    creatorId: 6,
    title: 'Procedural 3D Art Generation',
    content: 'Using Houdini for procedural NFT generation. Creating thousands of unique 3D variations.',
    type: 'text',
    isLocked: true,
    price: 0.22,
    currency: 'SOL',
    likes: 634,
    comments: 145,
    createdAt: '2024-03-03T10:50:00Z',
    tags: ['3D Art', 'Procedural', 'Generation']
  },
  {
    id: 83,
    creatorId: 6,
    title: 'Lighting for 3D NFTs',
    content: 'Professional lighting setups for 3D renders. HDRI environments and studio lighting techniques.',
    type: 'text',
    isLocked: false,
    likes: 378,
    comments: 76,
    createdAt: '2024-03-01T15:30:00Z',
    tags: ['3D Art', 'Lighting', 'Rendering']
  },
  {
    id: 84,
    creatorId: 6,
    title: 'Collaborative 3D Projects',
    content: 'Managing large-scale 3D projects with teams. Version control, asset libraries, and workflows.',
    type: 'text',
    isLocked: true,
    price: 0.1,
    currency: 'SOL',
    likes: 445,
    comments: 89,
    createdAt: '2024-02-28T11:15:00Z',
    tags: ['3D Art', 'Collaboration', 'Workflow']
  },
  {
    id: 85,
    creatorId: 6,
    title: 'Future of 3D in Web3',
    content: 'Trends and predictions for 3D art in the metaverse. New technologies and opportunities.',
    type: 'text',
    isLocked: false,
    likes: 523,
    comments: 98,
    createdAt: '2024-02-26T09:45:00Z',
    tags: ['3D Art', 'Future', 'Web3']
  },

  // Emma Charts posts (ID: 8) - 10 posts
  {
    id: 86,
    creatorId: 8,
    title: 'Chart Pattern Recognition Guide',
    content: 'Master the art of reading charts: triangles, flags, head and shoulders, and more patterns.',
    type: 'text',
    thumbnail: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.15,
    currency: 'SOL',
    likes: 567,
    comments: 123,
    createdAt: '2024-03-15T08:45:00Z',
    tags: ['Trading', 'Chart Patterns', 'Technical Analysis']
  },
  {
    id: 87,
    creatorId: 8,
    title: 'Support and Resistance Mastery',
    content: 'How to identify key levels that matter. Dynamic vs static levels and trading strategies.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.12,
    currency: 'SOL',
    likes: 445,
    comments: 89,
    createdAt: '2024-03-13T14:30:00Z',
    tags: ['Trading', 'Support Resistance', 'Levels']
  },
  {
    id: 88,
    creatorId: 8,
    title: 'Swing Trading Setups',
    content: 'My top 5 swing trading setups with 65%+ win rate. Entry rules, stops, and targets.',
    type: 'text',
    isLocked: true,
    price: 0.18,
    currency: 'SOL',
    likes: 678,
    comments: 134,
    createdAt: '2024-03-11T16:20:00Z',
    tags: ['Swing Trading', 'Setups', 'Strategy']
  },
  {
    id: 89,
    creatorId: 8,
    title: 'Volume Analysis Secrets',
    content: 'Reading volume like a pro: accumulation, distribution, and volume-price relationships.',
    type: 'text',
    isLocked: false,
    likes: 389,
    comments: 67,
    createdAt: '2024-03-09T11:45:00Z',
    tags: ['Trading', 'Volume', 'Analysis']
  },
  {
    id: 90,
    creatorId: 8,
    title: 'Fibonacci Trading Strategies',
    content: 'Using Fibonacci retracements and extensions for precise entries and exits.',
    type: 'text',
    isLocked: true,
    price: 0.1,
    currency: 'SOL',
    likes: 523,
    comments: 98,
    createdAt: '2024-03-07T13:15:00Z',
    tags: ['Trading', 'Fibonacci', 'Technical Analysis']
  },
  {
    id: 91,
    creatorId: 8,
    title: 'Candlestick Patterns Deep Dive',
    content: 'Beyond basic patterns: advanced candlestick analysis and market psychology.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.14,
    currency: 'SOL',
    likes: 456,
    comments: 87,
    createdAt: '2024-03-05T15:40:00Z',
    tags: ['Trading', 'Candlesticks', 'Psychology']
  },
  {
    id: 92,
    creatorId: 8,
    title: 'Multi-Timeframe Analysis',
    content: 'Aligning trades across timeframes: from daily bias to 15-minute entries.',
    type: 'text',
    isLocked: false,
    likes: 634,
    comments: 112,
    createdAt: '2024-03-03T12:25:00Z',
    tags: ['Trading', 'Multi-Timeframe', 'Analysis']
  },
  {
    id: 93,
    creatorId: 8,
    title: 'Market Structure Analysis',
    content: 'Understanding market structure: higher highs, lower lows, and trend changes.',
    type: 'text',
    isLocked: true,
    price: 0.08,
    currency: 'SOL',
    likes: 378,
    comments: 76,
    createdAt: '2024-03-01T10:50:00Z',
    tags: ['Trading', 'Market Structure', 'Trends']
  },
  {
    id: 94,
    creatorId: 8,
    title: 'Risk-Reward Optimization',
    content: 'Maximizing profits while minimizing risk: position sizing and R:R ratios.',
    type: 'text',
    isLocked: true,
    price: 0.12,
    currency: 'SOL',
    likes: 445,
    comments: 89,
    createdAt: '2024-02-28T14:15:00Z',
    tags: ['Trading', 'Risk Management', 'Optimization']
  },
  {
    id: 95,
    creatorId: 8,
    title: 'Crypto vs Forex Chart Reading',
    content: 'Key differences in reading crypto charts vs traditional forex markets.',
    type: 'text',
    isLocked: false,
    likes: 523,
    comments: 98,
    createdAt: '2024-02-26T16:30:00Z',
    tags: ['Trading', 'Crypto', 'Forex']
  },

  // Ryan GameFi posts (ID: 9) - 10 posts
  {
    id: 96,
    creatorId: 9,
    title: 'Top P2E Games March 2024',
    content: 'Comprehensive review of the most profitable play-to-earn games this month. ROI analysis included.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.12,
    currency: 'SOL',
    likes: 678,
    comments: 134,
    createdAt: '2024-03-15T10:30:00Z',
    tags: ['GameFi', 'P2E', 'Review']
  },
  {
    id: 97,
    creatorId: 9,
    title: 'Guild Management Strategies',
    content: 'How to build and manage a successful P2E guild. Recruitment, profit sharing, and scaling.',
    type: 'text',
    isLocked: true,
    price: 0.18,
    currency: 'SOL',
    likes: 523,
    comments: 89,
    createdAt: '2024-03-13T14:45:00Z',
    tags: ['GameFi', 'Guild', 'Management']
  },
  {
    id: 98,
    creatorId: 9,
    title: 'Axie Infinity Advanced Strategies',
    content: 'Meta team compositions and breeding strategies for maximum earnings in Axie Infinity.',
    type: 'text',
    isLocked: true,
    price: 0.15,
    currency: 'SOL',
    likes: 445,
    comments: 98,
    createdAt: '2024-03-11T16:20:00Z',
    tags: ['GameFi', 'Axie', 'Strategy']
  },
  {
    id: 99,
    creatorId: 9,
    title: 'Blockchain Gaming Investment Guide',
    content: 'How to evaluate and invest in gaming tokens and NFTs. Due diligence framework.',
    type: 'text',
    isLocked: false,
    likes: 389,
    comments: 67,
    createdAt: '2024-03-09T11:15:00Z',
    tags: ['GameFi', 'Investment', 'Analysis']
  },
  {
    id: 100,
    creatorId: 9,
    title: 'Splinterlands Deck Building',
    content: 'Optimal deck compositions for different leagues and rulesets in Splinterlands.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.1,
    currency: 'SOL',
    likes: 567,
    comments: 112,
    createdAt: '2024-03-07T13:40:00Z',
    tags: ['GameFi', 'Splinterlands', 'Strategy']
  },
  {
    id: 101,
    creatorId: 9,
    title: 'GameFi Token Economics',
    content: 'Understanding tokenomics in blockchain games: inflation, burning mechanisms, and sustainability.',
    type: 'text',
    isLocked: true,
    price: 0.14,
    currency: 'SOL',
    likes: 456,
    comments: 87,
    createdAt: '2024-03-05T15:25:00Z',
    tags: ['GameFi', 'Tokenomics', 'Economics']
  },
  {
    id: 102,
    creatorId: 9,
    title: 'Mobile GameFi Opportunities',
    content: 'Best mobile blockchain games for earning on the go. Setup guides and earning potential.',
    type: 'text',
    isLocked: false,
    likes: 634,
    comments: 145,
    createdAt: '2024-03-03T12:50:00Z',
    tags: ['GameFi', 'Mobile', 'Opportunities']
  },
  {
    id: 103,
    creatorId: 9,
    title: 'NFT Gaming Asset Valuation',
    content: 'How to value gaming NFTs: utility, rarity, and market demand analysis.',
    type: 'text',
    isLocked: true,
    price: 0.08,
    currency: 'SOL',
    likes: 378,
    comments: 76,
    createdAt: '2024-03-01T10:15:00Z',
    tags: ['GameFi', 'NFT', 'Valuation']
  },
  {
    id: 104,
    creatorId: 9,
    title: 'Cross-Chain Gaming Strategies',
    content: 'Playing games across multiple blockchains: bridging assets and maximizing opportunities.',
    type: 'text',
    isLocked: true,
    price: 0.12,
    currency: 'SOL',
    likes: 445,
    comments: 89,
    createdAt: '2024-02-28T14:30:00Z',
    tags: ['GameFi', 'Cross-Chain', 'Strategy']
  },
  {
    id: 105,
    creatorId: 9,
    title: 'Future of Blockchain Gaming',
    content: 'Trends and predictions for the GameFi space. Upcoming technologies and opportunities.',
    type: 'text',
    isLocked: false,
    likes: 523,
    comments: 98,
    createdAt: '2024-02-26T16:45:00Z',
    tags: ['GameFi', 'Future', 'Trends']
  },

  // Zoe Gaming posts (ID: 10) - 10 posts
  {
    id: 106,
    creatorId: 10,
    title: 'Gods Unchained Meta Analysis',
    content: 'Current meta breakdown and deck recommendations for climbing ranks in Gods Unchained.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.1,
    currency: 'SOL',
    likes: 567,
    comments: 123,
    createdAt: '2024-03-15T09:20:00Z',
    tags: ['Gaming', 'Gods Unchained', 'Meta']
  },
  {
    id: 107,
    creatorId: 10,
    title: 'Blockchain Game Reviews: March',
    content: 'In-depth reviews of 5 new blockchain games launched this month. Gameplay and earning potential.',
    type: 'text',
    isLocked: false,
    likes: 445,
    comments: 89,
    createdAt: '2024-03-13T15:30:00Z',
    tags: ['Gaming', 'Reviews', 'Blockchain']
  },
  {
    id: 108,
    creatorId: 10,
    title: 'Competitive Gaming in Web3',
    content: 'How traditional esports skills translate to blockchain gaming competitions.',
    type: 'text',
    isLocked: true,
    price: 0.12,
    currency: 'SOL',
    likes: 389,
    comments: 67,
    createdAt: '2024-03-11T12:45:00Z',
    tags: ['Gaming', 'Esports', 'Competition']
  },
  {
    id: 109,
    creatorId: 10,
    title: 'Gaming Hardware for P2E',
    content: 'Optimal hardware setups for play-to-earn gaming. Performance vs cost analysis.',
    type: 'text',
    isLocked: false,
    likes: 523,
    comments: 98,
    createdAt: '2024-03-09T14:15:00Z',
    tags: ['Gaming', 'Hardware', 'Setup']
  },
  {
    id: 110,
    creatorId: 10,
    title: 'Streaming GameFi Content',
    content: 'How to build an audience streaming blockchain games. Platform strategies and monetization.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.15,
    currency: 'SOL',
    likes: 678,
    comments: 134,
    createdAt: '2024-03-07T16:50:00Z',
    tags: ['Gaming', 'Streaming', 'Content']
  },
  {
    id: 111,
    creatorId: 10,
    title: 'Game Economy Deep Dives',
    content: 'Analyzing the economic systems of popular blockchain games. Sustainability factors.',
    type: 'text',
    isLocked: true,
    price: 0.08,
    currency: 'SOL',
    likes: 456,
    comments: 87,
    createdAt: '2024-03-05T11:25:00Z',
    tags: ['Gaming', 'Economy', 'Analysis']
  },
  {
    id: 112,
    creatorId: 10,
    title: 'Gaming NFT Trading Strategies',
    content: 'How to trade gaming NFTs profitably. Market timing and asset evaluation.',
    type: 'text',
    isLocked: true,
    price: 0.14,
    currency: 'SOL',
    likes: 634,
    comments: 112,
    createdAt: '2024-03-03T13:40:00Z',
    tags: ['Gaming', 'NFT', 'Trading']
  },
  {
    id: 113,
    creatorId: 10,
    title: 'Community Building in GameFi',
    content: 'Building and managing gaming communities. Discord strategies and engagement tactics.',
    type: 'text',
    isLocked: false,
    likes: 378,
    comments: 76,
    createdAt: '2024-03-01T15:15:00Z',
    tags: ['Gaming', 'Community', 'Management']
  },
  {
    id: 114,
    creatorId: 10,
    title: 'Gaming Alpha Sources',
    content: 'Where to find early information about new blockchain games and opportunities.',
    type: 'text',
    isLocked: true,
    price: 0.16,
    currency: 'SOL',
    likes: 445,
    comments: 89,
    createdAt: '2024-02-28T10:30:00Z',
    tags: ['Gaming', 'Alpha', 'Research']
  },
  {
    id: 115,
    creatorId: 10,
    title: 'Professional Gaming Career Path',
    content: 'How to transition from traditional gaming to professional blockchain gaming.',
    type: 'text',
    isLocked: false,
    likes: 523,
    comments: 98,
    createdAt: '2024-02-26T12:45:00Z',
    tags: ['Gaming', 'Career', 'Professional']
  },

  // Victoria Lifestyle posts (ID: 12) - 10 posts
  {
    id: 116,
    creatorId: 12,
    title: 'Miami Lifestyle Photoshoot',
    content: 'Behind the scenes of my latest Miami beach photoshoot. Styling tips and location secrets.',
    type: 'image',
    thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.2,
    currency: 'SOL',
    likes: 789,
    comments: 156,
    createdAt: '2024-03-15T12:30:00Z',
    tags: ['Lifestyle', 'Photography', 'Miami']
  },
  {
    id: 117,
    creatorId: 12,
    title: 'Luxury Travel Guide: Maldives',
    content: 'Complete guide to luxury resorts in Maldives. Personal recommendations and exclusive deals.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.15,
    currency: 'SOL',
    likes: 645,
    comments: 123,
    createdAt: '2024-03-13T16:45:00Z',
    tags: ['Lifestyle', 'Travel', 'Luxury']
  },
  {
    id: 118,
    creatorId: 12,
    title: 'Fashion Week Highlights',
    content: 'My experience at Paris Fashion Week. Exclusive backstage content and designer interviews.',
    type: 'text',
    isLocked: true,
    price: 0.18,
    currency: 'SOL',
    likes: 523,
    comments: 98,
    createdAt: '2024-03-11T14:20:00Z',
    tags: ['Lifestyle', 'Fashion', 'Paris']
  },
  {
    id: 119,
    creatorId: 12,
    title: 'Daily Wellness Routine',
    content: 'My complete morning and evening wellness routine. Products, exercises, and mindfulness practices.',
    type: 'text',
    isLocked: false,
    likes: 456,
    comments: 89,
    createdAt: '2024-03-09T10:15:00Z',
    tags: ['Lifestyle', 'Wellness', 'Routine']
  },
  {
    id: 120,
    creatorId: 12,
    title: 'Home Decor Transformation',
    content: 'Complete makeover of my Miami penthouse. Interior design tips and shopping sources.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.12,
    currency: 'SOL',
    likes: 678,
    comments: 134,
    createdAt: '2024-03-07T15:40:00Z',
    tags: ['Lifestyle', 'Home Decor', 'Design']
  },
  {
    id: 121,
    creatorId: 12,
    title: 'Exclusive Event Access',
    content: 'VIP access to exclusive Miami events. Networking tips and how to get invited.',
    type: 'text',
    isLocked: true,
    price: 0.25,
    currency: 'SOL',
    likes: 834,
    comments: 167,
    createdAt: '2024-03-05T18:25:00Z',
    tags: ['Lifestyle', 'Events', 'Networking']
  },
  {
    id: 122,
    creatorId: 12,
    title: 'Fitness and Nutrition Plan',
    content: 'My personal trainer and nutritionist share my complete fitness and meal plan.',
    type: 'text',
    isLocked: true,
    price: 0.14,
    currency: 'SOL',
    likes: 567,
    comments: 112,
    createdAt: '2024-03-03T11:50:00Z',
    tags: ['Lifestyle', 'Fitness', 'Nutrition']
  },
  {
    id: 123,
    creatorId: 12,
    title: 'Personal Brand Building',
    content: 'How I built my lifestyle brand from zero. Social media strategies and monetization.',
    type: 'text',
    isLocked: false,
    likes: 445,
    comments: 89,
    createdAt: '2024-03-01T13:15:00Z',
    tags: ['Lifestyle', 'Branding', 'Business']
  },
  {
    id: 124,
    creatorId: 12,
    title: 'Luxury Shopping Hauls',
    content: 'Latest luxury purchases and styling tips. Designer pieces and investment pieces.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.16,
    currency: 'SOL',
    likes: 723,
    comments: 145,
    createdAt: '2024-02-28T16:30:00Z',
    tags: ['Lifestyle', 'Shopping', 'Fashion']
  },
  {
    id: 125,
    creatorId: 12,
    title: 'Relationship and Dating Advice',
    content: 'Personal insights on relationships and dating in the modern world. Real talk and experiences.',
    type: 'text',
    isLocked: true,
    price: 0.1,
    currency: 'SOL',
    likes: 389,
    comments: 76,
    createdAt: '2024-02-26T14:45:00Z',
    tags: ['Lifestyle', 'Relationships', 'Dating']
  },

  // Aria Wellness posts (ID: 13) - 10 posts
  {
    id: 126,
    creatorId: 13,
    title: 'Mindfulness Meditation Guide',
    content: 'Complete beginner guide to mindfulness meditation. Techniques, benefits, and daily practices.',
    type: 'audio',
    isLocked: false,
    likes: 567,
    comments: 123,
    createdAt: '2024-03-15T07:30:00Z',
    tags: ['Wellness', 'Meditation', 'Mindfulness']
  },
  {
    id: 127,
    creatorId: 13,
    title: 'Yoga Flow for Beginners',
    content: '30-minute gentle yoga flow perfect for beginners. Focus on breath and basic poses.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.08,
    currency: 'SOL',
    likes: 445,
    comments: 89,
    createdAt: '2024-03-13T08:15:00Z',
    tags: ['Wellness', 'Yoga', 'Beginner']
  },
  {
    id: 128,
    creatorId: 13,
    title: 'Self-Care Sunday Rituals',
    content: 'My weekly self-care routine for mental and physical wellness. Products and practices.',
    type: 'text',
    isLocked: true,
    price: 0.12,
    currency: 'SOL',
    likes: 389,
    comments: 67,
    createdAt: '2024-03-11T09:45:00Z',
    tags: ['Wellness', 'Self-Care', 'Rituals']
  },
  {
    id: 129,
    creatorId: 13,
    title: 'Breathwork for Anxiety',
    content: 'Powerful breathing techniques to manage anxiety and stress. Guided practice included.',
    type: 'audio',
    isLocked: true,
    price: 0.1,
    currency: 'SOL',
    likes: 678,
    comments: 134,
    createdAt: '2024-03-09T16:20:00Z',
    tags: ['Wellness', 'Breathwork', 'Anxiety']
  },
  {
    id: 130,
    creatorId: 13,
    title: 'Holistic Nutrition Basics',
    content: 'Understanding nutrition from a holistic perspective. Mind-body connection and food choices.',
    type: 'text',
    isLocked: false,
    likes: 523,
    comments: 98,
    createdAt: '2024-03-07T12:30:00Z',
    tags: ['Wellness', 'Nutrition', 'Holistic']
  },
  {
    id: 131,
    creatorId: 13,
    title: 'Crystal Healing Workshop',
    content: 'Introduction to crystal healing: choosing, cleansing, and using crystals for wellness.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.15,
    currency: 'SOL',
    likes: 456,
    comments: 87,
    createdAt: '2024-03-05T14:45:00Z',
    tags: ['Wellness', 'Crystals', 'Healing']
  },
  {
    id: 132,
    creatorId: 13,
    title: 'Digital Detox Challenge',
    content: '7-day digital detox challenge. Reclaim your time and mental space from technology.',
    type: 'text',
    isLocked: true,
    price: 0.06,
    currency: 'SOL',
    likes: 634,
    comments: 112,
    createdAt: '2024-03-03T10:15:00Z',
    tags: ['Wellness', 'Digital Detox', 'Challenge']
  },
  {
    id: 133,
    creatorId: 13,
    title: 'Moon Cycle Wellness',
    content: 'Aligning your wellness practices with lunar cycles. Energy management and rituals.',
    type: 'text',
    isLocked: true,
    price: 0.14,
    currency: 'SOL',
    likes: 378,
    comments: 76,
    createdAt: '2024-03-01T18:30:00Z',
    tags: ['Wellness', 'Moon Cycles', 'Energy']
  },
  {
    id: 134,
    creatorId: 13,
    title: 'Stress Management Toolkit',
    content: 'Complete toolkit for managing stress: techniques, exercises, and lifestyle changes.',
    type: 'text',
    isLocked: false,
    likes: 445,
    comments: 89,
    createdAt: '2024-02-28T11:45:00Z',
    tags: ['Wellness', 'Stress Management', 'Tools']
  },
  {
    id: 135,
    creatorId: 13,
    title: 'Sacred Space Creation',
    content: 'How to create a sacred space in your home for meditation and wellness practices.',
    type: 'text',
    isLocked: true,
    price: 0.08,
    currency: 'SOL',
    likes: 523,
    comments: 98,
    createdAt: '2024-02-26T15:20:00Z',
    tags: ['Wellness', 'Sacred Space', 'Home']
  },

  // Maria Blockchain posts (ID: 14) - 10 posts
  {
    id: 136,
    creatorId: 14,
    title: 'Blockchain Basics for Beginners',
    content: 'Complete introduction to blockchain technology. How it works, benefits, and real-world applications.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=300&h=200&fit=crop',
    isLocked: false,
    likes: 789,
    comments: 156,
    createdAt: '2024-03-15T10:00:00Z',
    tags: ['Education', 'Blockchain', 'Beginner']
  },
  {
    id: 137,
    creatorId: 14,
    title: 'Web3 vs Web2: Key Differences',
    content: 'Understanding the fundamental differences between Web2 and Web3. Decentralization explained.',
    type: 'text',
    isLocked: true,
    price: 0.1,
    currency: 'SOL',
    likes: 645,
    comments: 123,
    createdAt: '2024-03-13T14:30:00Z',
    tags: ['Education', 'Web3', 'Comparison']
  },
  {
    id: 138,
    creatorId: 14,
    title: 'Cryptocurrency Fundamentals',
    content: 'Deep dive into cryptocurrencies: Bitcoin, Ethereum, and altcoins. Investment basics.',
    type: 'text',
    isLocked: true,
    price: 0.12,
    currency: 'SOL',
    likes: 523,
    comments: 98,
    createdAt: '2024-03-11T16:15:00Z',
    tags: ['Education', 'Cryptocurrency', 'Investment']
  },
  {
    id: 139,
    creatorId: 14,
    title: 'DeFi Explained Simply',
    content: 'Decentralized Finance made simple. Lending, borrowing, and yield farming for beginners.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=300&h=200&fit=crop',
    isLocked: false,
    likes: 678,
    comments: 134,
    createdAt: '2024-03-09T12:45:00Z',
    tags: ['Education', 'DeFi', 'Finance']
  },
  {
    id: 140,
    creatorId: 14,
    title: 'NFT Technology Deep Dive',
    content: 'Understanding NFT technology beyond the hype. Smart contracts, metadata, and standards.',
    type: 'text',
    isLocked: true,
    price: 0.08,
    currency: 'SOL',
    likes: 456,
    comments: 87,
    createdAt: '2024-03-07T11:20:00Z',
    tags: ['Education', 'NFT', 'Technology']
  },
  {
    id: 141,
    creatorId: 14,
    title: 'Wallet Security Best Practices',
    content: 'Complete guide to securing your crypto wallets. Hardware vs software wallets and safety tips.',
    type: 'text',
    isLocked: false,
    likes: 834,
    comments: 167,
    createdAt: '2024-03-05T15:30:00Z',
    tags: ['Education', 'Security', 'Wallets']
  },
  {
    id: 142,
    creatorId: 14,
    title: 'Smart Contract Basics',
    content: 'Introduction to smart contracts: what they are, how they work, and common use cases.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.15,
    currency: 'SOL',
    likes: 567,
    comments: 112,
    createdAt: '2024-03-03T13:45:00Z',
    tags: ['Education', 'Smart Contracts', 'Programming']
  },
  {
    id: 143,
    creatorId: 14,
    title: 'Blockchain Governance Models',
    content: 'Understanding different governance models in blockchain projects. DAOs and voting mechanisms.',
    type: 'text',
    isLocked: true,
    price: 0.14,
    currency: 'SOL',
    likes: 389,
    comments: 76,
    createdAt: '2024-03-01T14:15:00Z',
    tags: ['Education', 'Governance', 'DAO']
  },
  {
    id: 144,
    creatorId: 14,
    title: 'Layer 2 Solutions Explained',
    content: 'Scaling solutions for blockchain: Lightning Network, Polygon, and other Layer 2 technologies.',
    type: 'text',
    isLocked: true,
    price: 0.12,
    currency: 'SOL',
    likes: 445,
    comments: 89,
    createdAt: '2024-02-28T16:50:00Z',
    tags: ['Education', 'Layer 2', 'Scaling']
  },
  {
    id: 145,
    creatorId: 14,
    title: 'Future of Blockchain Technology',
    content: 'Predictions and trends for blockchain technology. Emerging use cases and innovations.',
    type: 'text',
    isLocked: false,
    likes: 523,
    comments: 98,
    createdAt: '2024-02-26T10:30:00Z',
    tags: ['Education', 'Future', 'Innovation']
  },

  // Tech Teacher Tom posts (ID: 15) - 10 posts
  {
    id: 146,
    creatorId: 15,
    title: 'Solidity Programming Basics',
    content: 'Complete beginner course to Solidity programming. Variables, functions, and contract structure.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.2,
    currency: 'SOL',
    likes: 678,
    comments: 134,
    createdAt: '2024-03-15T09:30:00Z',
    tags: ['Programming', 'Solidity', 'Smart Contracts']
  },
  {
    id: 147,
    creatorId: 15,
    title: 'Building Your First DApp',
    content: 'Step-by-step guide to building a decentralized application. Frontend and smart contract integration.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.25,
    currency: 'SOL',
    likes: 789,
    comments: 156,
    createdAt: '2024-03-13T15:45:00Z',
    tags: ['Programming', 'DApp', 'Development']
  },
  {
    id: 148,
    creatorId: 15,
    title: 'Web3.js Tutorial Series',
    content: 'Complete Web3.js tutorial: connecting to blockchain, reading data, and sending transactions.',
    type: 'text',
    isLocked: true,
    price: 0.15,
    currency: 'SOL',
    likes: 523,
    comments: 98,
    createdAt: '2024-03-11T13:20:00Z',
    tags: ['Programming', 'Web3.js', 'JavaScript']
  },
  {
    id: 149,
    creatorId: 15,
    title: 'Smart Contract Security',
    content: 'Common security vulnerabilities in smart contracts and how to prevent them.',
    type: 'text',
    isLocked: false,
    likes: 645,
    comments: 123,
    createdAt: '2024-03-09T11:45:00Z',
    tags: ['Programming', 'Security', 'Best Practices']
  },
  {
    id: 150,
    creatorId: 15,
    title: 'NFT Smart Contract Development',
    content: 'Building NFT smart contracts: ERC-721, ERC-1155, and marketplace integration.',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=300&h=200&fit=crop',
    isLocked: true,
    price: 0.18,
    currency: 'SOL',
    likes: 456,
    comments: 87,
    createdAt: '2024-03-07T14:30:00Z',
    tags: ['Programming', 'NFT', 'ERC-721']
  },
  {
    id: 151,
    creatorId: 15,
    title: 'DeFi Protocol Development',
    content: 'Building DeFi protocols: AMMs, lending platforms, and yield farming contracts.',
    type: 'text',
    isLocked: true,
    price: 0.22,
    currency: 'SOL',
    likes: 567,
    comments: 112,
    createdAt: '2024-03-05T16:15:00Z',
    tags: ['Programming', 'DeFi', 'Protocol']
  },
  {
    id: 152,
    creatorId: 15,
    title: 'Testing Smart Contracts',
    content: 'Complete guide to testing smart contracts: unit tests, integration tests, and best practices.',
    type: 'text',
    isLocked: true,
    price: 0.12,
    currency: 'SOL',
    likes: 389,
    comments: 76,
    createdAt: '2024-03-03T12:45:00Z',
    tags: ['Programming', 'Testing', 'Quality Assurance']
  },
  {
    id: 153,
    creatorId: 15,
    title: 'Gas Optimization Techniques',
    content: 'Advanced techniques for optimizing gas usage in smart contracts. Cost-effective coding.',
    type: 'text',
    isLocked: true,
    price: 0.16,
    currency: 'SOL',
    likes: 445,
    comments: 89,
    createdAt: '2024-03-01T15:30:00Z',
    tags: ['Programming', 'Gas Optimization', 'Efficiency']
  },
  {
    id: 154,
    creatorId: 15,
    title: 'Upgradeability Patterns',
    content: 'Smart contract upgrade patterns: proxy contracts, diamond standard, and migration strategies.',
    type: 'text',
    isLocked: true,
    price: 0.14,
    currency: 'SOL',
    likes: 378,
    comments: 67,
    createdAt: '2024-02-28T13:20:00Z',
    tags: ['Programming', 'Upgradeability', 'Architecture']
  },
  {
    id: 155,
    creatorId: 15,
    title: 'Career in Web3 Development',
    content: 'How to start a career in Web3 development. Skills needed, job market, and salary expectations.',
    type: 'text',
    isLocked: false,
    likes: 634,
    comments: 123,
    createdAt: '2024-02-26T11:45:00Z',
    tags: ['Programming', 'Career', 'Web3']
  }

  // Total: 150 posts across 15 creators (10 posts each)
  // In a real application, posts would be stored in a database with pagination
]

// Helper functions to get data by category
export const getCreatorsByCategory = (category: string): Creator[] => {
  return creatorsData.filter(creator => 
    creator.category.toLowerCase() === category.toLowerCase() ||
    creator.tags.some(tag => tag.toLowerCase() === category.toLowerCase())
  )
}

export const getCreatorById = (id: number): Creator | undefined => {
  return creatorsData.find(creator => creator.id === id)
}

export const getAllCreators = (): Creator[] => {
  return creatorsData
}

export const getPostsByCreator = (creatorId: number): Post[] => {
  return postsData.filter(post => post.creatorId === creatorId)
}

export const getFeaturedCreators = (limit = 15): Creator[] => {
  return creatorsData.slice(0, limit)
}

// User subscriptions mock data
export interface UserSubscription {
  id: string // Changed from number to string
  creatorId: number
  plan: string
  price: number
  subscribedAt: string // Changed from subscribedSince
  validUntil: string
  isActive: boolean
}

// Mock user subscriptions (simulate logged in user's subscriptions)
export const mockUserSubscriptions: UserSubscription[] = [
  {
    id: 'sub_001',
    creatorId: 1, // Anna Crypto
    plan: 'Premium',
    price: 0.15,
    subscribedAt: '2024-12-01',
    validUntil: '2026-12-01', // Обновлено до декабря 2026
    isActive: true,
  },
  {
    id: 'sub_002', 
    creatorId: 4, // Alex NFT
    plan: 'Basic',
    price: 0.05,
    subscribedAt: '2024-12-01',
    validUntil: '2026-12-01', // Обновлено до декабря 2026
    isActive: true,
  },
  {
    id: 'sub_003',
    creatorId: 8, // Emma Charts
    plan: 'VIP', 
    price: 0.35,
    subscribedAt: '2024-12-01',
    validUntil: '2026-12-01', // Обновлено до декабря 2026
    isActive: true,
  },
]

// Function to check if user is subscribed to a creator
export const isUserSubscribedTo = (creatorId: number): boolean => {
  console.log(`🔍 Checking subscription for creator ${creatorId}`)
  console.log('Available subscriptions:', mockUserSubscriptions)
  
  const subscription = mockUserSubscriptions.find(sub => 
    sub.creatorId === creatorId && sub.isActive
  )
  
  console.log(`Found subscription for creator ${creatorId}:`, subscription)
  
  if (!subscription) {
    console.log(`❌ No subscription found for creator ${creatorId}`)
    return false
  }
  
  // Check if subscription is still valid
  const validUntil = new Date(subscription.validUntil)
  const now = new Date()
  
  console.log(`📅 Valid until: ${validUntil}, Now: ${now}, Still valid: ${validUntil > now}`)
  
  const isValid = validUntil > now
  console.log(`✅ User is${isValid ? '' : ' NOT'} subscribed to creator ${creatorId}`)
  return isValid
}

// Function to get user's subscription for a creator
export const getUserSubscription = (creatorId: number): UserSubscription | null => {
  const subscription = mockUserSubscriptions.find(sub => 
    sub.creatorId === creatorId && sub.isActive
  )
  
  if (!subscription) return null
  
  // Check if subscription is still valid
  const validUntil = new Date(subscription.validUntil)
  const now = new Date()
  
  return validUntil > now ? subscription : null
}

// Mock users data
export const mockUsers: User[] = [
  {
    id: 1,
    username: 'crypto_enthusiast',
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=40&h=40&fit=crop&crop=face',
    isVerified: false
  },
  {
    id: 2,
    username: 'defi_hunter',
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=40&h=40&fit=crop&crop=face',
    isVerified: true
  },
  {
    id: 3,
    username: 'nft_collector',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face',
    isVerified: false
  },
  {
    id: 4,
    username: 'trading_pro',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face',
    isVerified: true
  },
  {
    id: 5,
    username: 'yield_farmer',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
    isVerified: false
  }
]

// Mock comments data
export const mockComments: Comment[] = [
  // Comments for Anna Crypto's DeFi post (post id 1)
  {
    id: 1,
    postId: 1,
    userId: 2,
    username: 'defi_hunter',
    userAvatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=40&h=40&fit=crop&crop=face',
    content: 'Отличный анализ! Особенно интересна часть про Uniswap V3 концентрированную ликвидность.',
    createdAt: '2024-12-15T10:30:00Z',
    likes: 12,
    isVerified: true,
    replies: [
      {
        id: 11,
        postId: 1,
        userId: 1,
        username: 'crypto_enthusiast',
        userAvatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=40&h=40&fit=crop&crop=face',
        content: 'Согласен! Anna всегда делает качественный контент',
        createdAt: '2024-12-15T11:15:00Z',
        likes: 3,
        isVerified: false
      }
    ]
  },
  {
    id: 2,
    postId: 1,
    userId: 5,
    username: 'yield_farmer',
    userAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
    content: 'Можете посоветовать оптимальную стратегию для начинающих в yield farming?',
    createdAt: '2024-12-15T12:45:00Z',
    likes: 7,
    isVerified: false
  },
  {
    id: 3,
    postId: 1,
    userId: 4,
    username: 'trading_pro',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face',
    content: 'Спасибо за детальный разбор рисков! Очень важная информация для новичков.',
    createdAt: '2024-12-15T14:20:00Z',
    likes: 15,
    isVerified: true
  },

  // Comments for Alex NFT's post (post id 4)
  {
    id: 4,
    postId: 4,
    userId: 3,
    username: 'nft_collector',
    userAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face',
    content: 'Потрясающая коллекция! Когда планируете минт?',
    createdAt: '2024-12-15T09:15:00Z',
    likes: 8,
    isVerified: false
  },
  {
    id: 5,
    postId: 4,
    userId: 1,
    username: 'crypto_enthusiast',
    userAvatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=40&h=40&fit=crop&crop=face',
    content: 'Какой софт используете для создания NFT арта?',
    createdAt: '2024-12-15T10:00:00Z',
    likes: 5,
    isVerified: false,
    replies: [
      {
        id: 12,
        postId: 4,
        userId: 2,
        username: 'defi_hunter',
        userAvatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=40&h=40&fit=crop&crop=face',
        content: 'Обычно используют Blender, Photoshop или Procreate',
        createdAt: '2024-12-15T10:30:00Z',
        likes: 2,
        isVerified: true
      }
    ]
  },

  // Anonymous comments
  {
    id: 6,
    postId: 1,
    userId: 3,
    username: 'nft_collector',
    userAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face',
    content: 'Интересно, а есть ли риски потери средств при стейкинге в малоизвестных протоколах?',
    createdAt: '2024-12-15T16:30:00Z',
    likes: 4,
    isVerified: false,
    isAnonymous: true
  },
  {
    id: 7,
    postId: 4,
    userId: 5,
    username: 'yield_farmer',
    userAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
    content: 'Предпочитаю оставаться анонимным, но хочу сказать, что это один из лучших NFT проектов которые я видел!',
    createdAt: '2024-12-15T17:15:00Z',
    likes: 9,
    isVerified: false,
    isAnonymous: true
  },
  {
    id: 8,
    postId: 1,
    userId: 4,
    username: 'trading_pro',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face',
    content: 'Не хочу светить свой профиль, но скажу что уже зарабатываю на этих стратегиях. Спасибо!',
    createdAt: '2024-12-15T18:45:00Z',
    likes: 11,
    isVerified: true,
    isAnonymous: true
  }
]

// Functions for comments
export const getCommentsByPostId = (postId: number): Comment[] => {
  return mockComments.filter(comment => comment.postId === postId)
}

export const getUserById = (userId: number): User | undefined => {
  return mockUsers.find(user => user.id === userId)
}

export const addComment = (postId: number, content: string, userId: number, isAnonymous = false): Comment => {
  const user = getUserById(userId)
  if (!user) {
    throw new Error('User not found')
  }

  const newComment: Comment = {
    id: Date.now(), // Simple ID generation
    postId,
    userId,
    username: user.username,
    userAvatar: user.avatar,
    content,
    createdAt: new Date().toISOString(),
    likes: 0,
    isVerified: user.isVerified,
    isAnonymous
  }

  mockComments.push(newComment)
  return newComment
}

// Function to add new post
export const addPost = (creatorId: number, postData: {
  title: string
  content: string
  category?: string
  image?: string
  type?: 'text' | 'image' | 'video' | 'audio'
  isLocked?: boolean
  price?: number
  currency?: 'SOL' | 'USDC'
  tags?: string[]
  isPremium?: boolean
  likes?: number
  comments?: number
}): Post => {
  const creator = getCreatorById(creatorId)
  if (!creator) {
    throw new Error('Creator not found')
  }

  const newPost: Post = {
    id: Date.now(), // Simple ID generation
    creatorId,
    title: postData.title,
    content: postData.content,
    type: postData.type || 'text',
    thumbnail: postData.image,
    isLocked: postData.isLocked || false,
    price: postData.price,
    currency: postData.currency,
    likes: postData.likes || 0,
    comments: postData.comments || 0,
    createdAt: new Date().toISOString(),
    tags: postData.tags || []
  }

  // Add new post to the beginning of the array (most recent first)
  postsData.unshift(newPost)
  
  // Update creator's post count in the creators array
  const creatorIndex = creatorsData.findIndex(c => c.id === creatorId)
  if (creatorIndex !== -1) {
    creatorsData[creatorIndex].posts += 1
  }

  console.log('Added new post:', newPost) // Debug log
  return newPost
}