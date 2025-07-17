// API response type (what comes from /api/creators)
export interface ApiCreator {
  id: string
  nickname: string
  fullName: string
  bio: string
  avatar: string | null
  backgroundImage: string | null
  name: string
  postsCount: number
  followersCount: number
  createdAt: string
}

// Component type (what CreatorsExplorer expects)
export interface ComponentCreator {
  id: string
  name: string
  username: string
  description: string
  avatar: string | null
  backgroundImage?: string | null
  coverImage: string
  isVerified: boolean
  subscribers: number
  posts: number
  tags: string[]
  monthlyEarnings: string
  createdAt: string
}

// API response wrapper
export interface ApiCreatorsResponse {
  creators: ApiCreator[]
  totalCount: number
} 